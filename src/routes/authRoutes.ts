import express from "express"
import authController from "../controllers/authController"
import { validateEmail, validateLogin, validateResetPassword, validateSignUp } from "../middleware/authValidation"
import auth from "../middleware/auth"

const router = express()

router.post("/signup", validateSignUp, authController.signUp)
router.post("/login", validateLogin, authController.login)
router.post("/logout", authController.logout)

router.get("/validatetoken", auth.validateToken, authController.verifyUser)

router.post("/forgotpassword", validateEmail, authController.forgotPassword)

router
    .route("/resetpassword/:resetToken")
    .get(authController.verifyResetToken)
    .post(validateResetPassword, authController.resetPassword)



export default router