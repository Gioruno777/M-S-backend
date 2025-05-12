import bcrypt from "bcryptjs"

jest.mock("../../lib/remotePrisma", () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn()
        },
        cart: {
            create: jest.fn()
        }
    }
}))

jest.mock("bcryptjs")


const mockPrisma = require("../../lib/remotePrisma").default
const mockHash = bcrypt.hash as unknown as jest.Mock
const authService = require("../../services/authService")

describe("signUpService", () => {
    it("成功註冊", async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockHash.mockResolvedValue("hashedhash")
        mockPrisma.user.create.mockResolvedValue({
            userName: "Test",
            email: "test@example.com",
            password: "hashedhash"
        })
        mockPrisma.cart.create.mockResolvedValue({})

        const result = await authService.signUpService("Test", "test@example.com", "12345678")

        expect(result).toEqual({
            userName: "Test",
            email: "test@example.com",
            password: "hashedhash"

        })
        expect(bcrypt.hash).toHaveBeenCalled()
        expect(mockPrisma.user.findUnique).toHaveBeenCalled()

        expect(bcrypt.hash).toHaveBeenCalledWith("12345678", 10)
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
            data: {
                userName: "Test",
                email: "test@example.com",
                password: "hashedhash"
            }
        })
    })

    it("信箱已註冊應報錯", async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            userName: "Test",
            email: "test@example.com",
            password: "hashedhash"
        })

        await expect(authService.signUpService("Test", "test@example.com", "123"))
            .rejects
            .toThrow("信箱已註冊")
    })
})
