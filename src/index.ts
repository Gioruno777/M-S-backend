import express, { Request, Response } from "express"
import { PrismaClient as RemoteDB } from '../generated/remote'
import "dotenv/config"
import cors from "cors"
import mongoose from "mongoose"
import foodRoutes from "./routes/foodRoutes"
import globalErrorHandler from "./controllers/errorController"
import authRoutes from "./routes/authRoutes"
import cookieParser from "cookie-parser"
import userRoutes from "./routes/userRoutes"
import { v2 as cloudinary } from "cloudinary"


mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string)
    .then(() => console.log("Connected Database"))

const prisma = new RemoteDB();

const testDB = async () => {
    try {
        await prisma.$connect();
        console.log("Prisma 成功連接到 PostgreSQL")
    } catch (error) {
        console.error("Prisma 連接失敗", error)
    } finally {
        await prisma.$disconnect()
    }
}
testDB()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})



const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}
))
app.use(cookieParser())
app.use(express.json())

app.get("/health", async (req: Request, res: Response) => {
    res.status(200).json({ message: "health!" });
})

app.use("/api/menu", foodRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/user", userRoutes)

app.use(globalErrorHandler)

app.listen(3000, "0.0.0.0", () => {
    console.log(`Server is running on port 3000`);
})