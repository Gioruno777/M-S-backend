import express from "express"
import userController from "../controllers/userController"
import auth from "../middleware/auth"
import { validateUpdatePassword, validateUpdateUserInfo } from "../middleware/userValidation"
import { upload } from "../utils/multer"

const router = express()

router
    .route("/updatepassword")
    .patch(validateUpdatePassword, auth.validateToken, userController.updatePassword)

router
    .route("/userinfo")
    .get(auth.validateToken, userController.getUserInfo)
    .patch(upload.single("photo"), validateUpdateUserInfo, auth.validateToken, userController.updateUserinfo)

export default router