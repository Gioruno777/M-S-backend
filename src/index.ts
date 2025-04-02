import express, { Request, Response } from "express"
import "dotenv/config"
import cors from "cors"
import mongoose from "mongoose"
import foodRoutes from "./routes/foodRoutes"
import globalErrorHandler from "./controllers/errorController"


mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string)
    .then(() => console.log("Connected Database"))

const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}
))

app.use(express.json())

app.get("/health", async (req: Request, res: Response) => {
    res.status(200).json({ message: "health!" });
})

app.use("/api/menu", foodRoutes)

app.use(globalErrorHandler)

app.listen(3000, "0.0.0.0", () => {
    console.log(`Server is running on port 3000`);
})