import fs from "fs"
import "dotenv/config"
import { PrismaClient as RemoteDB } from "../../../generated/remote"

const prisma = new RemoteDB()
const foodData = JSON.parse(fs.readFileSync(`${__dirname}/foodData.json`, 'utf-8'))

type foodType = {
    _id: string,
    name: string,
}


const importData = async () => {
    await Promise.all(foodData.map(async (item: foodType) => {
        try {
            await prisma.product.upsert({
                where: { id: item._id },
                update: { stock: 15 },
                create: {
                    id: item._id,
                    stock: 15
                }
            })

            console.log(`${item._id} OK!`)
        } catch (error) {
            console.log(`Error updating sidedishes ${foodData.name}:`, error)
        }
    }))
    console.log('Data import finished')
    process.exit()
}

if (process.argv[2] === '--import') {
    importData();
}
// npx ts-node src/dev-data/food/importFoodStock.ts --import