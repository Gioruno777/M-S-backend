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

        const handlers: Record<string, (s: Stripe.Checkout.Session) => Promise<void>> = {
            TOP_UP: handleTopUp,
            PURCHASE: handlePurchase
        }

        const handler = handlers[type || ""]

        if (!handler) {
            console.warn(`目前不支援${type}`)
            return res.status(200).json({
                status: "ignored",
                message: `目前不支援${type}`,
                received: true
            })
        }

        await handler(session)

        res.status(200).json({
            status: "success",
            received: true
        })
    }
)

const handleTopUp = async (session: Stripe.Checkout.Session) => {
    const amount = (session.amount_total || 0) / 100
    const userId = session.metadata?.userId

    if (!userId) {
        throw new AppError("Id不存在", 400)
    }

    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!user) {
        console.warn(`[TopUp] 找不到 userId=${userId}, sessionId=${session.id}`)
        throw new AppError('用戶不存在', 404)
    }

    const previousBalance = user.balance

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { balance: { increment: amount } },
        }),

        prisma.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                previousBalance: previousBalance,
                type: "TOP_UP",
                method: "STRIPE",
                status: "SUCCESS",
                record: `會員卡儲值 ${amount} 元`,
            },
        }),
    ])
}

const handlePurchase = async (session: Stripe.Checkout.Session) => {
    const amount = (session.amount_total || 0) / 100
    const userId = session.metadata?.userId
    const cartId = session.metadata?.cartId
    const note = session.metadata?.note

    if (!userId) {
        throw new AppError("缺少 userId", 400)
    }
    if (!cartId) {
        throw new AppError("缺少 cartId", 400)
    }

    const [user, cart] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.cart.findUnique({
            where: { userId: userId },
            include: {
                items: {
                    orderBy: { name: "desc" }
                }
            }
        })
    ])

    if (!user) {
        throw new AppError("無此用戶", 404)
    }
    if (!cart) {
        throw new AppError("購物車出問題", 404)
    }

    await prisma.$transaction([

        prisma.transaction.create({
            data: {
                userId: userId,
                amount: amount,
                type: "PURCHASE",
                method: "STRIPE",
                status: "SUCCESS",
                record: `信用卡消費 ${amount} 元`,
                note: note,
                items: {
                    create: cart.items.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        imageUrl: item.imageUrl,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
        }),

        prisma.cartItem.deleteMany({
            where: {
                cartId: cartId
            }
        })
    ])
}

export default {
    handleWebhook
}