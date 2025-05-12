import { PrismaClient as RemoteDB } from "../../generated/remote"

const prisma = new RemoteDB()

export default prisma