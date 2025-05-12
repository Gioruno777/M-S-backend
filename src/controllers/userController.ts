import { PrismaClient as RemoteDB } from '../../generated/remote'
import catchAsync from "../utils/catchAsync"
import AppError from "../utils/appError"
import { Request, Response, NextFunction } from "express"
import bcrypt from "bcryptjs"
import { DateTime } from "luxon"
import { uploadImage } from '../utils/upLoadImage'

const prisma = new RemoteDB()

const getUserInfo = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const userId = req.userId as string

        const data = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                userName: true,
                photo: true,
                balance: true
            }
        })

        if (!data) {
            throw new AppError("查無此用戶", 404)
        }
        res.status(200).json({
            status: "success",
            data: {
                user: data
            }
        })
    }
)

const updatePassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        const { currentPassword, newPassword } = req.body
        const userId = req.userId as string


        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new AppError("查無此用戶", 404)
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch) {
            throw new AppError("當前密碼錯誤", 400)
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword
            }
        })

        res.status(200).json({
            status: "success"
        })
    }
)

const updateUserinfo = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { userName } = req.body
        const userId = req.userId as string

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new AppError("查無此用戶", 404)
        }

        const updateData: Record<string, any> = {}

        if (userName && userName !== user.userName) {
            updateData.userName = userName;
        }

        if (req.file) {
            updateData.photo = await uploadImage(req.userId, req.file)
        }

        if (Object.keys(updateData).length !== 0) {
            await prisma.user.update({
                where: { id: userId },
                data: updateData
            })
        }

        res.status(200).json({
            status: "success"
        })
    }
)

const getPurchases = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                type: "PURCHASE",
                status: "SUCCESS"
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                createdAt: true,
                method: true,
                amount: true
            }
        })

        if (!transactions) {
            throw new AppError("查無此用戶", 404)
        }

        const data = transactions.map(transaction => ({
            ...transaction,
            purchaseId: transaction.id.slice(0, 6),
            createdAt: DateTime
                .fromJSDate(transaction.createdAt, { zone: 'utc' })
                .setZone('Asia/Shanghai')
                .toFormat('yyyy-MM-dd HH:mm:ss')
        }))


        res.status(200).json({
            status: "success",
            data: {
                purchases: data
            }
        })
    }
)

const getTransactions = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId

        // const THIRTY_MINUTES_AGO = subMinutes(new Date(), 30)
        // await prisma.transaction.updateMany({
        //     where: {
        //         userId: userId,
        //         status: "PENDING",
        //         createdAt: { lt: THIRTY_MINUTES_AGO }
        //     },
        //     data: {
        //         status: "FAILED"
        //     }
        // })

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: userId,
                NOT: {
                    AND: [
                        { type: "PURCHASE" },
                        { method: "STRIPE" }
                    ],
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                createdAt: true,
                type: true,
                amount: true,
                status: true,
                record: true
            }
        })

        if (!transactions) {
            throw new AppError("查無此用戶", 404)
        }

        const data = transactions.map(transaction => ({
            ...transaction,
            transactionId: transaction.id.slice(0, 6),
            createdAt: DateTime
                .fromJSDate(transaction.createdAt, { zone: 'utc' })
                .setZone('Asia/Shanghai')
                .toFormat('yyyy-MM-dd HH:mm:ss'),
        }))

        res.status(200).json({
            status: "success",
            data: {
                transactions: data
            }
        })
    }
)

const getPurchaseDetail = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const transactionId = req.params.purchaseId
        const userId = req.userId

        const transaction = await prisma.transaction.findFirst({
            where: {
                id: transactionId,
                userId: userId,
                type: "PURCHASE",
                status: "SUCCESS"
            },
            select: {
                id: true,
                amount: true,
                note: true,
                createdAt: true,
                items: true,
                method: true,
                paidAt: true
            }
        })

        if (!transaction) {
            throw new AppError("無此交易", 404)
        }

        const data = {
            ...transaction,
            purchaseId: transaction.id.slice(0, 6),
            createdAt: DateTime
                .fromJSDate(transaction.createdAt, { zone: 'utc' })
                .setZone('Asia/Shanghai')
                .toFormat('yyyy-MM-dd HH:mm:ss'),
            paidAt: transaction.paidAt ?
                DateTime
                    .fromJSDate(transaction.paidAt, { zone: 'utc' })
                    .setZone('Asia/Shanghai')
                    .toFormat('yyyy-MM-dd HH:mm:ss')
                : null
        }

        res.status(200).json({
            status: "success",
            data: {
                purchase: data
            }
        })
    }
)

const getTransactionDetail = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const transactionId = req.params.transactionId
        const userId = req.userId

        const transaction = await prisma.transaction.findFirst({
            where: {
                id: transactionId,
                userId: userId,
                NOT: {
                    AND: [
                        { type: "PURCHASE" },
                        { method: "STRIPE" }
                    ],
                }
            },
            select: {
                id: true,
                type: true,
                method: true,
                record: true,
                status: true,
                amount: true,
                previousBalance: true,
                createdAt: true,
                paidAt: true,
                sessionUrl: true
            }
        })

        if (!transaction) {
            throw new AppError("無此交易", 404)
        }

        const data = {
            ...transaction,
            transactionId: transaction.id.slice(0, 6),
            createdAt: DateTime
                .fromJSDate(transaction.createdAt, { zone: 'utc' })
                .setZone('Asia/Shanghai')
                .toFormat('yyyy-MM-dd HH:mm:ss'),
            paidAt: transaction.paidAt ?
                DateTime
                    .fromJSDate(transaction.paidAt, { zone: 'utc' })
                    .setZone('Asia/Shanghai')
                    .toFormat('yyyy-MM-dd HH:mm:ss')
                : null
        }

        res.status(200).json({
            status: "success",
            data: {
                transaction: data
            }
        })
    }
)

export default {
    getUserInfo,
    updatePassword,
    updateUserinfo,
    getPurchases,
    getTransactions,
    getPurchaseDetail,
    getTransactionDetail
}