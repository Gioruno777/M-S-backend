import express from "express"
import webhookController from "../controllers/webhookController"
import auth from "../middleware/auth"
import orderController from "../controllers/orderController"
import { validateAddToCart, validateCheckout, validateDeleteCartItem, validateTopUp, validateUpdateCartItem } from "../middleware/orderValidation"
const router = express()

router
    .route("/addtocart")
    .post(validateAddToCart, auth.validateToken, orderController.addToCart)

router
    .route("/cartitem")
    .get(auth.validateToken, orderController.getCartItem)
    .patch(validateUpdateCartItem, auth.validateToken, orderController.updateCartItem)
    .delete(validateDeleteCartItem, auth.validateToken, orderController.deleteCartItem)

router
    .route("/topup")
    .post(validateTopUp, auth.validateToken, orderController.topUP)

router
    .route("/checkout")
    .post(validateCheckout, auth.validateToken, orderController.checkOut)

router
    .route("/webhook")
    .post(webhookController.handleWebhook)

export default router