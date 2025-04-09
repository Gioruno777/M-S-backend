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

        if (event.type !== "checkout.session.completed") {
            throw new AppError("received: true", 400)
        }

        const session = event.data.object as Stripe.Checkout.Session
        const type = session.metadata?.type

        if (!type) {
            return res.status(400).send("Webhook不支援")
        }

        const handlers: Record<string, (s: Stripe.Checkout.Session) => Promise<void>> = {
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

                res.status(200).json({
                    status: "success",
                    received: true
                })
            },

            Purchase: async () => {
                const amount = (session.amount_total || 0) / 100
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
                                orderBy: { name: "desc" }
                            }
                        }
                    }),

                    prisma.transaction.findUnique({
                        where: {
                            id: purchaseId,
                        }
                    })
                ])

                if (!user) {
                    throw new AppError("無此用戶", 404)
                }
                if (!cart) {
                    throw new AppError("購物車出問題", 404)
                }
                if (!purchase) {
                    throw new AppError('交易不存在', 404)
                }

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
                    prisma.cartItem.deleteMany({
                        where: { cartId: cartId }
                    })
                ])

                res.status(200).json({
                    status: "success",
                    received: true
                })
            }
        }
        const handler = handlers[type]
        await handler(session)
    }
)



export default {
    handleWebhook
}