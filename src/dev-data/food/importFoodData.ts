import fs from "fs"
import "dotenv/config"
import mongoose from "mongoose"
import Food from "../../models/foodModel"

mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string)
    .then(() => console.log("Connected Database"))

const foodData = JSON.parse(fs.readFileSync(`${__dirname}/foodData.json`, 'utf-8'))

type foodType = {
    name: string,
    description: string,
    image: string,
    price: number,
    calories: number,
    protein: number,
    fat: number,
    saturatedFat: number,
    transFat: number,
    carbohydrates: number,
    sodium: number,
    seasonal: Boolean,
    limited: Boolean,
    category: string
}


const importData = async () => {
    await Promise.all(foodData.map(async (item: foodType) => {
        try {
            await Food.findOneAndUpdate(
                { name: item.name },
                item,
                { upsert: true, new: true }
            )
        } catch (err) {
            console.log(`Error updating sidedishes ${foodData.name}:`, err)
        }
    }))
    console.log('Data import finished')
    process.exit()
}

if (process.argv[2] === '--import') {
    importData();
}