import { PrismaClient as RemoteDB } from "../../generated/remote"
import AppError from "../utils/appError"
import catchAsync from "../utils/catchAsync"
import { Request, Response, NextFunction } from "express"

const prisma = new RemoteDB()

const getStock = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const productID = req.params.id

        const data = await prisma.product.findUnique({
            where: { id: productID },
            select: { stock: true }
        })

        if (!data) {
            throw new AppError("無此商品", 404)
        }

        res.status(200).json({
            status: "success",
            data: {
                stock: data
            }
        })

    }
)

export default {
    getStock
}