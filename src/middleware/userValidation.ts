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

export const validateUpdatePassword = [
    body("currentPassword").isString().notEmpty().withMessage("請輸入舊密碼"),
    body("newPassword").isString().notEmpty().withMessage("請輸入新密碼"),
    body("confirmNewPassword")
        .isString()
        .notEmpty()
        .withMessage("請輸入確認新密碼")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("密碼與確認密碼不一致")
            }
            return true
        }),
    handleValidationErrors
]

export const validateUpdateUserInfo = [
    body("userName").optional().isString().notEmpty().withMessage("請輸入使用者名稱"),
    handleValidationErrors
]