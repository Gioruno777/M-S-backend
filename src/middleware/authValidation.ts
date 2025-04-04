import { Request, Response, NextFunction } from "express"
import { query, body, validationResult } from "express-validator"

const handleValidationErrors = async (req: Request, res: Response, next: NextFunction
) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ message: errors.array() });
        return
    }
    next()
}

export const valideSignUp = [
    body("userName").isString().notEmpty().withMessage("請輸入使用者名稱"),
    body("email").isString().isEmail().withMessage("請輸入電子郵件"),
    body("password").isString().notEmpty().withMessage("請輸入密碼"),
    body("confirmPassword")
        .isString()
        .notEmpty()
        .withMessage("請輸入確認密碼")
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("密碼與確認密碼不一致")
            }
            return true
        }),
    handleValidationErrors
]

export const valideLogin = [
    body("email").isString().isEmail().withMessage("請輸入電子郵件"),
    body("password").isString().notEmpty().withMessage("請輸入密碼"),
    handleValidationErrors
]

export const valideEmail = [
    body("email").isString().isEmail().withMessage("請輸入電子郵件"),
    handleValidationErrors
]

export const valideResetPassword = [
    body("newPassword").isString().notEmpty().withMessage("請輸入密碼"),
    body("confirmPassword")
        .isString()
        .notEmpty()
        .withMessage("請輸入確認密碼")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("密碼與確認密碼不一致")
            }
            return true
        }),
    handleValidationErrors
]