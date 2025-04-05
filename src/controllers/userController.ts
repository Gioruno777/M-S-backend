import { PrismaClient as RemoteDB } from '../../generated/remote'
import catchAsync from "../utils/catchAsync"
import AppError from "../utils/appError"
import { Request, Response, NextFunction } from "express"
import bcrypt from "bcryptjs"
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

export default {
    getUserInfo,
    updatePassword,
    updateUserinfo
}