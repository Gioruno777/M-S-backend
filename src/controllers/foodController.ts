import { Request, Response, NextFunction } from "express"
import catchAsync from "../utils/catchAsync";
import Food from "../models/foodModel";
import APIFeatures from "../utils/apifeatures";
import AppError from "../utils/appError";

const getAllFoods = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const features = new APIFeatures(Food.find(), req.query)
            .filter()
            .sort()

        const data = await features.query.exec()

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                items: data
            }
        })
    }
)

const getFoodDetail = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const productID = req.params.id
        const data = await Food.findById(productID).exec()
        if (data === null) {
            throw new AppError("無此商品", 404)
        }
        res.status(200).json({
            status: "success",
            data: {
                item: data
            }
        })

    }
)

const searchFoods = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
        const keyword = req.query.keyword as string

        if (!keyword) {
            throw new AppError("請提供關鍵字", 400)
        }

        const features = new APIFeatures(Food.find({ name: { $regex: keyword, $options: "i" } }), req.query)
            .filter()
            .sort()

        const data = await features.query.exec()

        res.status(200).json({
            status: "success",
            results: data.length,
            data: {
                items: data
            }
        })
    }
)

export default {
    getAllFoods,
    getFoodDetail,
    searchFoods
}