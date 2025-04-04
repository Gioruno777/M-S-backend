import express from "express"
import authController from "../controllers/authController"
import { valideEmail, valideLogin, valideResetPassword, valideSignUp } from "../middleware/authValidation"
import auth from "../middleware/auth"

const router = express()

router.post("/signup", valideSignUp, authController.signUp)
router.post("/login", valideLogin, authController.login)
router.post("/logout", authController.logout)

router.get("/validatetoken", auth.validateToken, authController.verifyUser)

router.post("/forgotpassword", valideEmail, authController.forgotPassword)

router
    .route("/resetpassword/:resetToken")
    .get(authController.verifyResetToken)
    .post(valideResetPassword, authController.resetPassword)



export default router