import { Request, Response, NextFunction } from "express"
import AppError from "../utils/appError"
import catchAsync from "../utils/catchAsync"
import { PrismaClient as RemoteDB } from '../../generated/remote'
import Stripe from "stripe"
import Food from "../models/foodModel"

const prisma = new RemoteDB()
const FRONTEND_URL = process.env.FRONTEND_URL as string
const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string)

const topUP = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const { amount } = req.body
        const userId = req.userId

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new AppError('用戶不存在', 404)
        }

        const previousBalance = user.balance
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                amount: amount,
                previousBalance: previousBalance,
                type: "TOP_UP",
                method: "STRIPE",
                status: "PENDING",
                record: `會員卡儲值 ${amount} 元`,
            }
        })

        const session = await STRIPE.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "TWD",
                        product_data: {
                            name: `會員卡儲值 $${amount}`,
                        },
                        unit_amount: amount * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
            success_url: `${FRONTEND_URL}/member/transaction/${transaction.id}?topup_success=true`,
            cancel_url: `${FRONTEND_URL}/member/main?topup_cancelled=true`,
            metadata: {
                type: "TopUp",
                userId: userId,
                transactionId: transaction.id
            },
        })
        await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                sessionId: session.id,
                sessionUrl: session.url
            }
        })

        res.status(200).json({
            status: "success",
            url: session.url

        })
    }
)

const addToCart = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const { quantity, productId } = req.body
        const userId = req.userId

        const food = await Food.findById(productId)
        const cart = await prisma.cart.findUnique({
            where: { userId: userId }
        })

        if (!food) {
            throw new AppError("無此產品", 400)
        }

        if (!cart) {
            throw new AppError("購物車出問題", 400)
        }

        const item = await prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: productId
                }
            }
        })

        if (!item) {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: productId,
                    name: food.name,
                    imageUrl: food.image,
                    price: food.price,
                    quantity: quantity
                }
            })

        } else {
            await prisma.cartItem.update({
                where: {
                    cartId_productId: {
                        cartId: cart.id,
                        productId: productId
                    }
                },
                data: {
                    quantity: item.quantity + quantity
                }
            })
        }

        res.status(200).json({
            status: "success"
        })
    }
)

const getCartItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId

        const cart = await prisma.cart.findUnique({
            where: { userId: userId },
            include: {
                items: {
                    orderBy: {
                        name: 'desc'
                    }
                }
            }
        })

        if (!cart) {
            throw new AppError("購物車出問題", 400)
        }
        res.status(200).json({
            status: "success",
            data: {
                items: cart.items
            }
        })
    }
)

const updateCartItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { productId, quantity } = req.body
        const userId = req.userId

        const cart = await prisma.cart.findUnique({
            where: {
                userId: userId
            },
            include: { items: true }
        })

        if (!cart) {
            throw new AppError("購物車出問題", 400)
        }

        const cartItem = cart.items.find(item => item.productId === productId)

        if (!cartItem) {
            throw new AppError("無此物", 404)
        }

        await prisma.cartItem.update({
            where: { id: cartItem.id },
            data: { quantity }
        })

        res.status(200).json({
            status: "success",
        })
    }
)

const deleteCartItem = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const { productId } = req.body
        const userId = req.userId

        const cart = await prisma.cart.findUnique({
            where: { userId: userId },
            include: { items: true }
        })

        if (!cart) {
            throw new AppError("購物車出問題", 400)
        }

        const cartItem = cart.items.find(item => item.productId === productId)

        if (!cartItem) {
            throw new AppError("查無此物", 404)
        }

        await prisma.cartItem.delete({
            where: { id: cartItem.id }
        })

        res.status(200).json({
            status: "success"
        })

    }
)

const checkOut = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { amount, payment, note } = req.body
        const userId = req.userId

        const [user, cart] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId } }),
            prisma.cart.findUnique({
                where: { userId },
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

        const total = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
        if (total !== amount) {
            throw new AppError("金額出問題", 400)
        }

        const paymentHandlers: Record<string, () => Promise<void>> = {
            MEMBER_CARD: async () => {
                if (user.balance < amount) {
                    throw new AppError('餘額不足', 404)
                }
                const previousBalance = user.balance

                const [, transaction] = await prisma.$transaction([
                    prisma.user.update({
                        where: { id: userId },
                        data: { balance: { decrement: amount } },
                    }),

                    prisma.transaction.create({
                        data: {
                            userId: userId,
                            amount: amount,
                            previousBalance: previousBalance,
                            type: "PURCHASE",
                            method: "MEMBER_CARD",
                            status: "SUCCESS",
                            record: `會員卡消費 ${amount} 元`,
                            note: note,
                            paidAt: new Date(),
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
                        select: {
                            id: true
                        }
                    }),

                    prisma.cartItem.deleteMany({
                        where: { cartId: cart.id }
                    })
                ])
                res.status(200).json({
                    status: "success",
                    transaction: transaction.id
                })
            },

            STRIPE: async () => {
                const stripeAmount = amount * 100

                const purchase = await prisma.transaction.create({
                    data: {
                        userId: userId,
                        amount: amount,
                        type: "PURCHASE",
                        method: "STRIPE",
                        status: "PENDING",
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
                    include: {
                        items: true
                    }
                })


                const description = purchase.items
                    .map(item => `${item.name}x${item.quantity} `)
                    .join('\n')

                const session = await STRIPE.checkout.sessions.create({
                    payment_method_types: ["card"],
                    line_items: [
                        {
                            price_data: {
                                currency: "TWD",
                                product_data: {
                                    name: `商品消費 $${amount}`,
                                    description: description
                                },
                                unit_amount: stripeAmount
                            },
                            quantity: 1,
                        },
                    ],
                    mode: "payment",
                    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
                    success_url: `${FRONTEND_URL}/member/purchase/${purchase.id}?order_success=true`,
                    cancel_url: `${FRONTEND_URL}/cart/checkout?order_cancelled=true`,
                    metadata: {
                        type: "Purchase",
                        userId: userId,
                        cartId: cart.id,
                        purchaseId: purchase.id,
                    },
                })

                await prisma.transaction.update({
                    where: { id: purchase.id },
                    data: {
                        sessionId: session.id,
                        sessionUrl: session.url
                    }
                })

                res.status(200).json({
                    status: "success",
                    url: session.url
                })
            }
        }

        const handler = paymentHandlers[payment]

        if (!handler) {
            throw new AppError("尚未支援的付款方式", 400)
        }
        await handler()
    }
)

const getLatestNote = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId

        const transaction = await prisma.transaction.findFirst({
            where: {
                userId: userId,
            },
            orderBy: { createdAt: "desc" },
            select: {
                status: true,
                note: true
            }
        })

        if (!transaction) {
            throw new AppError("找不到備註", 400)
        }

        const note = transaction.status === "PENDING" ? transaction.note : ""

        res.status(200).json({
            status: "success",
            data: {
                note: note
            }
        })
    }
)

export default {
    topUP,
    addToCart,
    getCartItem,
    updateCartItem,
    deleteCartItem,
    checkOut,
    getLatestNote
}