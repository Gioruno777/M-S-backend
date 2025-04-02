import httpMocks from "node-mocks-http"
import { jest } from "@jest/globals"
import foodController from "../../controllers/foodController"
import Food from "../../models/foodModel"

// 模擬 Mongoose 的 find() 回傳
jest.mock("../../models/foodModel")

type IFood = {
    name: string
    price: number
}

describe("getAllFoods controller", () => {
    it("should return list of foods with status 200", async () => {
        // 1. 準備模擬資料
        const mockData: IFood[] = [
            { name: "牛肉麵", price: 160 },
            { name: "蘿蔔糕", price: 50 },
            { name: "雞腿飯", price: 120 }
        ]

        // 預期排序後結果（由小到大）
        const sortedData: IFood[] = [
            { name: "蘿蔔糕", price: 50 },
            { name: "雞腿飯", price: 120 },
            { name: "牛肉麵", price: 160 }
        ]


        // 2. 準備模擬 query 物件
        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            find: jest.fn().mockReturnThis(),
            filter: jest.fn().mockReturnThis(),
            exec: jest.fn<() => Promise<IFood[]>>().mockResolvedValue(sortedData)
        };

        // 3. mock Mongoose 的 Food.find()
        (Food.find as jest.Mock).mockReturnValue(mockQuery)

        // 4. 準備 req / res / next
        const req = httpMocks.createRequest({
            method: "GET",
            query: {
                sort: "price"
            }
        })
        const res = httpMocks.createResponse()
        const next = jest.fn()

        // 5. 執行 controller
        await foodController.getAllFoods(req, res, next)

        // 6. 驗證結果
        const json = res._getJSONData()
        console.log(json)
        expect(res.statusCode).toBe(200)
        expect(json.status).toBe("success")
        expect(json.results).toBe(3)
        expect(json.data.items).toEqual(sortedData)
    })
})
