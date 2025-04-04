import jwt, { JwtPayload } from "jsonwebtoken"
import { NextFunction, Request, Response } from "express"

declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}

const validateToken = async (req: Request, res: Response, next: NextFunction) => {

    let token = req.cookies["auth_token"]

    if (!token && req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        res.status(401).json({ message: "unauthorized" })
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
        req.userId = (decoded as JwtPayload).userId;
        next()
    } catch (error) {
        res.status(401).json({ message: "unauthorized" })
        return
    }
}

export default {
    validateToken
}