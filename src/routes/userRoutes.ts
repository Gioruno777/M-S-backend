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

router
    .route("/purchases")
    .get(auth.validateToken, userController.getPurchases)

router
    .route("/purchases/:purchaseId")
    .get(auth.validateToken, userController.getPurchaseDetail)

router
    .route("/transactions")
    .get(auth.validateToken, userController.getTransactions)

router
    .route("/transactions/:transactionId")
    .get(auth.validateToken, userController.getTransactionDetail)

export default router