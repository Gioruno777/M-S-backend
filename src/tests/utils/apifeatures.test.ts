import APIFeatures from "../../utils/apifeatures"

describe("APIFeatures class", () => {
    let mockQuery: any

    beforeEach(() => {
        mockQuery = {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis()
        }
    })

    it("filter() should exclude sort and keyword", () => {
        const queryString = {
            sort: "price",
            keyword: "牛肉麵",
            category: "noodle",
            price: 80
        }

        new APIFeatures(mockQuery, queryString).filter()

        expect(mockQuery.find).toHaveBeenCalledWith({ category: "noodle", price: 80 })
    })

    it("sort() should apply sorting from query.sort", () => {
        const queryString = {
            sort: "price,-createdAt"
        }

        new APIFeatures(mockQuery, queryString).sort()

        expect(mockQuery.sort).toHaveBeenCalledWith("price -createdAt")
    })

    it("sort() should default to -_id when no sort provided", () => {
        const queryString = {}

        new APIFeatures(mockQuery, queryString).sort()

        expect(mockQuery.sort).toHaveBeenCalledWith("-_id")
    })


})