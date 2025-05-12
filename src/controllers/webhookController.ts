import { error } from 'console'
import { PrismaClient as RemoteDB } from '../../generated/remote'
import AppError from "../utils/appError"
import catchAsync from "../utils/catchAsync"
import { Request, Response, NextFunction } from "express"
import Stripe from "stripe"

const prisma = new RemoteDB()
const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string)
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string

const handleWebhook = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        let event: Stripe.Event
        const sig = req.headers["stripe-signature"] as string

        try {
            event = STRIPE.webhooks.constructEvent(
                req.body,
                sig,
                STRIPE_ENDPOINT_SECRET
            )
        } catch (err) {
            console.error("Stripe webhook 驗證失敗", err)
            return res.status(400).send("Webhook 驗證失敗")
        }

        const session = event.data.object as Stripe.Checkout.Session
        const type = session.metadata?.type
        console.log(event.type)
        if (!type) {
            return res.status(400).send("Webhook不支援")
        }

        const completedHandlers: Record<string, (s: Stripe.Checkout.Session) => Promise<void>> = {
            TopUp: async () => {
                const amount = (session.amount_total || 0) / 100
                const userId = session.metadata?.userId
                const transactionId = session.metadata?.transactionId

                if (!userId || !transactionId) {
                    throw new AppError("Id不存在", 400)
                }

                const [user, transaction] = await Promise.all([
                    prisma.user.findUnique({
                        where: { id: userId }
                    }),
                    prisma.transaction.findUnique({
                        where: {
                            id: transactionId
                        }
                    })
                ])

                if (!user) {
                    throw new AppError('用戶不存在', 404)
                }

                if (!transaction) {
                    throw new AppError('交易不存在', 404)
                }

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: userId },
                        data: { balance: { increment: amount } },
                    }),
                    prisma.transaction.update({
                        where: { id: transactionId },
                        data: {
                            status: "SUCCESS",
                            paidAt: new Date(),
                        }
                    }),

                ])
            },

            Purchase: async () => {
                const userId = session.metadata?.userId
                const cartId = session.metadata?.cartId
                const purchaseId = session.metadata?.purchaseId

                if (!userId || !cartId || !purchaseId) {
                    throw new AppError("無此交易", 400)
                }

                const [user, cart, purchase] = await Promise.all([
                    prisma.user.findUnique({ where: { id: userId } }),
                    prisma.cart.findUnique({
                        where: { userId: userId },
                        include: {
                            items: {
                                orderBy: { name: "desc" },
                                include: {
                                    product: { select: { stock: true } }
                                }
                            }
                        }
                    }),

                    prisma.transaction.findUnique({
                        where: {
                            id: purchaseId,
                        }
                    })
                ])

                if (!user) throw new AppError("無此用戶", 404)
                if (!cart) throw new AppError("購物車出問題", 404)
                if (!purchase) throw new AppError('交易不存在', 404)


                await prisma.$transaction([
                    prisma.transaction.update({
                        where: {
                            id: purchaseId
                        },
                        data: {
                            status: "SUCCESS",
                            paidAt: new Date()
                        }
                    }),
                    prisma.stockLog.updateMany({
                        where: {
                            transactionId: purchaseId,
                            type: "SALE",
                            completed: false,
                        },
                        data: {
                            completed: true,
                        }
                    })
                    ,
                    prisma.cartItem.deleteMany({
                        where: { cartId: cartId }
                    })
                ])
            }
        }

        const expiredHandlers: Record<string, (s: Stripe.Checkout.Session) => Promise<void>> = {
            TopUp: async () => {
                const userId = session.metadata?.userId
                const transactionId = session.metadata?.transactionId

                if (!userId || !transactionId) {
                    throw new AppError("Id不存在", 400)
                }

                const transaction = await prisma.transaction.findFirst({
                    where: {
                        id: transactionId,
                        status: "PENDING"
                    }
                })

                if (!transaction) {
                    throw new AppError('交易不存在', 404)
                }

                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        status: "FAILED",
                        sessionId: null,
                        sessionUrl: null
                    }
                })

            },
            Purchase: async () => {
                const userId = session.metadata?.userId
                const cartId = session.metadata?.cartId
                const purchaseId = session.metadata?.purchaseId

                if (!userId || !cartId || !purchaseId) {
                    throw new AppError("無此交易", 400)
                }

                const [user, cart, transaction] = await Promise.all([
                    prisma.user.findUnique({ where: { id: userId } }),
                    prisma.cart.findUnique({
                        where: { userId: userId },
                        include: {
                            items: {
                                orderBy: { name: "desc" },
                                include: {
                                    product: { select: { stock: true } }
                                }
                            }
                        }
                    }),
                    prisma.transaction.findFirst({
                        where: {
                            id: purchaseId,
                            status: "PENDING"
                        }
                    })
                ])

                if (!user) throw new AppError("無此用戶", 404)
                if (!cart) throw new AppError("購物車出問題", 404)
                if (!transaction) throw new AppError("交易不存在或已處理", 404)

                await prisma.$transaction(async (tx) => {

                    for (const item of cart.items) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stock: { increment: item.quantity }
                            }
                        })
                    }

                    await tx.stockLog.createMany({
                        data: cart.items.map((item) => ({
                            productId: item.productId,
                            transactionId: purchaseId,
                            userId,
                            quantity: item.quantity,
                            type: "ADJUSTMENT",
                            completed: true
                        }))
                    })

                    await tx.transaction.update({
                        where: { id: purchaseId },
                        data: {
                            status: "FAILED",
                            sessionId: null,
                            sessionUrl: null
                        }
                    })
                })

            }
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const handler = completedHandlers[type]
                await handler(session)
                break
            }
            case 'checkout.session.expired': {
                const handler = expiredHandlers[type]
                await handler(session)
                break
            }
            default: {
                throw new AppError("received: true", 400)
            }
        }
        res.status(200).json({
            status: "success",
            received: true
        })
    }
)



export default {
    handleWebhook
}