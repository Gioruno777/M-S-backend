import express from "express"
import stockController from "../controllers/stockController"

const router = express()

router.get("/:id", stockController.getStock)

export default router