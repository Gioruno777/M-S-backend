import express from "express"
import foodController from "../controllers/foodController"

const router = express()

router.get("/", foodController.getAllFoods)
router.get("/search", foodController.searchFoods)
router.get("/:id", foodController.getFoodDetail)



export default router