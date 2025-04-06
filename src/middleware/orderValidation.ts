import { Request, Response, NextFunction } from "express"
import { body, validationResult } from "express-validator"

const handleValidationErrors = async (req: Request, res: Response, next: NextFunction
) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array() });
        return
    }
    next()
}

export const validateTopUp = [
    body("amount")
        .isNumeric().withMessage("金額必須是數字")
        .custom(value => value > 0).withMessage("金額必須大於 0"),
    handleValidationErrors
]

export const validateAddToCart = [
    body("productId").isString().notEmpty().withMessage("請輸入產品ID"),
    body("quantity")
        .notEmpty().withMessage("請填寫數量")
        .isInt({ min: 1 }).withMessage("數量最少為1"),
    handleValidationErrors
]

export const validateUpdateCartItem = [
    body("productId").isString().notEmpty().withMessage("產品ID錯誤"),
    body("quantity")
        .notEmpty().withMessage("請填寫數量")
        .isInt({ min: 1 }).withMessage("數量最少為1"),
    handleValidationErrors
]

export const validateDeleteCartItem = [
    body("productId").isString().notEmpty().withMessage("產品ID錯誤"),
    handleValidationErrors
]

export const validateCheckout = [
    body("amount").isInt({ min: 1 }).notEmpty().withMessage("請確認金額"),
    handleValidationErrors
]