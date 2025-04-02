import httpMocks from "node-mocks-http"
import { jest } from "@jest/globals"
import foodController from "../../controllers/foodController"
import Food from "../../models/foodModel"
import AppError from "../../utils/appError"

jest.mock("../../models/foodModel")

type IFood = {
    name: string,
    price: number
}

describe("searchFoods controller", () => {
    it("should return a list of search results with status 200", async () => {

        const searchResults: IFood[] = [
            { name: "牛肉麵", price: 160 },
            { name: "炒牛肉", price: 120 },
            { name: "牛雜湯", price: 80 },

        ]

        const mockQuery = {
            sort: jest.fn().mockReturnThis(),
            find: jest.fn().mockReturnThis(),
            exec: jest.fn<() => Promise<IFood[]>>().mockResolvedValue(searchResults)
        };

        (Food.find as jest.Mock).mockReturnValue(mockQuery)

        const req = httpMocks.createRequest({
            method: "GET",
            query: {
                sort: "price",
                keyword: "牛"
            }
        })
        const res = httpMocks.createResponse()
        const next = jest.fn()

        await foodController.searchFoods(req, res, next)

        const json = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(json.status).toBe("success")
        expect(json.results).toBe(3)
        expect(json.data.items).toEqual(searchResults)
    })
})

describe("searchFoods controller", () => {
    it("should return status 404 if no keyword", async () => {

        const req = httpMocks.createRequest({
            method: "GET",
            query: {}
        })
        const res = httpMocks.createResponse()

        const next = jest.fn((err) => {
            const error = err as AppError
            expect(error.message).toBe("請提供關鍵字")
            expect(error.statusCode).toBe(400)
        })

        await foodController.searchFoods(req, res, next)

    })
})

it("should return 200 and empty result if keyword is only whitespace", async () => {
    const searchResults: IFood[] = []

    const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        find: jest.fn().mockReturnThis(),
        exec: jest.fn<() => Promise<IFood[]>>().mockResolvedValue(searchResults)
    };

    (Food.find as jest.Mock).mockImplementation(() => mockQuery)

    const req = httpMocks.createRequest({
        method: "GET",
        query: {
            keyword: " ",
            sort: "price"
        }
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await foodController.searchFoods(req, res, next)

    const json = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(json.status).toBe("success")
    expect(json.results).toBe(0)
    expect(json.data.items).toEqual([])
})
