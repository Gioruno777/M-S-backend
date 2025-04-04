import { PrismaClient as RemoteDB, Prisma } from '../../generated/remote'
import catchAsync from "../utils/catchAsync"
import AppError from "../utils/appError"
import { NextFunction, Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import * as crypto from 'crypto'
import sendEmail from '../utils/email'
const FRONTEND_URL = process.env.FRONTEND_URL

const prisma = new RemoteDB()

const signUp = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { userName, email, password } = req.body

        const user = await prisma.user.findUnique({
            where: { email: email }
        })

        if (user) {
            throw new AppError("信箱已註冊", 400)
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                userName,
                email,
                password: hashedPassword
            }
        })

        await prisma.cart.create({
            data: {
                userId: newUser.id
            }
        })

        res.status(201).json({
            status: "success"
        })
    }
)

const login = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body

        const user = await prisma.user.findUnique({
            where: { email: email }
        })
        if (!user) {
            throw new AppError("登入失敗", 400)
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            throw new AppError("登入失敗", 400)
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET_KEY as string,
            {
                expiresIn: "1d",
            }
        )

        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 86400000,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        })

        res.status(200).json({
            status: "success",
            token
        })
    }
)

const logout = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {

        res.cookie("auth_token", "", {
            expires: new Date(0),
        })

        res.status(200).json({
            status: "success",
        })
    }
)

const verifyUser = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        res.status(200).json({
            status: "success",
        })
    }
)

const forgotPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { email } = req.body

        const user = await prisma.user.findUnique({
            where: { email: email }
        })

        if (!user) {
            res.status(200).json({
                status: "success"
            })
            return
        }

        const resetToken = email.split("@")[0] + crypto.randomBytes(32).toString('hex')
        const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')

        await prisma.user.update({
            where: { email },
            data: {
                passwordResetToken: passwordResetToken,
                passwordResetExpires: new Date(Date.now() + 3600000)
            }
        })

        try {
            await sendEmail({
                to: email as string,
                subject: "【MØS】忘記密碼-驗證碼通知信",
                text: `Forgot your password? Click the link below to reset it:\n${FRONTEND_URL}/auth/resetpassword/${resetToken}\nIf you didn't request a password reset, please ignore this email.`,
            })
            res.status(200).json({
                status: 'success',
            })

        } catch (error) {
            await prisma.user.update({
                where: { email },
                data: {
                    passwordResetToken: null,
                    passwordResetExpires: null
                }

            })
            throw new AppError("Failed to send email. Please try again later.", 500)
        }

    }
)

const verifyResetToken = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { resetToken } = req.params
        const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        const user = await prisma.user.findUnique({
            where: {
                passwordResetToken: passwordResetToken,
                passwordResetExpires: { gt: new Date() }
            }
        })

        if (!user) {
            throw new AppError("請求超時", 400)
        }

        res.status(200).json({
            status: "success",
        })
    }
)

const resetPassword = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const { resetToken } = req.params
        const { newPassword } = req.body

        const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        const user = await prisma.user.findUnique({
            where: {
                passwordResetToken: passwordResetToken,
                passwordResetExpires: { gt: new Date() }
            }
        })

        if (!user) {
            throw new AppError("請求超時", 400)
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
            where: {
                email: user.email
            },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null
            }
        })
        res.status(200).json({
            status: "success",
        })
    }
)

export default {
    signUp,
    login,
    logout,
    verifyUser,
    forgotPassword,
    verifyResetToken,
    resetPassword
}