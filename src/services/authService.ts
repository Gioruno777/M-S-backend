import prisma from "../lib/remotePrisma"
import AppError from "../utils/appError"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"


export const signUpService = async (userName: string, email: string, password: string) => {
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

    return newUser
}

export const loginSerive = async (email: string, password: string) => {
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
    return token
}