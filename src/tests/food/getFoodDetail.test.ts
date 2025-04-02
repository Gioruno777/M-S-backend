import httpMocks from "node-mocks-http"
import { describe, jest } from "@jest/globals"
import foodController from "../../controllers/foodController"
import Food from "../../models/foodModel"
import AppError from "../../utils/appError"

jest.mock("../../models/foodModel")

type IFood = {
    id: string
    name: string
    price: number
    rating: string
}

describe("getFoodDetail controller", () => {
    it("should return food detail with status 200", async () => {
        // 1. 準備模擬資料
        const mockData: IFood[] = [
            { id: "2486", name: "牛肉麵", price: 160, rating: "3 stars" },
        ]

        // 2. 準備模擬 query 物件
        const mockQuery = {
            exec: jest.fn<() => Promise<IFood[]>>().mockResolvedValue(mockData)
        };

        // 3. mock Mongoose 的 Food.findById()
        (Food.findById as jest.Mock).mockReturnValue(mockQuery)

        // 4. 準備 req / res / next
        const req = httpMocks.createRequest({
            method: "GET",
            params: { id: "2486" }
        })
        const res = httpMocks.createResponse()
        const next = jest.fn()

        // 5. 執行 controller
        await foodController.getFoodDetail(req, res, next)

        // 6. 驗證結果
        const json = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(json.status).toBe("success")
        expect(json.data.item).toEqual(mockData)
    })

    //找不到id的狀況

    it("should return status 404 if food not found", async () => {

        const mockQuery = {
            exec: jest.fn<() => Promise<null>>().mockResolvedValue(null)
        };

        (Food.findById as jest.Mock).mockReturnValue(mockQuery)

        const req = httpMocks.createRequest({
            method: "GET",
            params: { id: "9999" }
        })
        const res = httpMocks.createResponse()


        const next = jest.fn((err) => {
            const error = err as AppError
            expect(error.message).toBe("無此商品")
            expect(error.statusCode).toBe(404)
        })

        await foodController.getFoodDetail(req, res, next)
    })
})
