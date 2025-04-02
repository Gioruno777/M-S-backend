import mongoose from "mongoose"

const foodSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    image: {
        type: String,
        required: true
    },

    price: {
        type: Number,
        required: true
    },

    calories: {
        type: Number,
        required: true
    },

    protein: {
        type: Number,
        required: true
    },

    fat: {
        type: Number,
        required: true
    },

    saturatedFat: {
        type: Number,
        required: true
    },

    transFat: {
        type: Number,
        required: true
    },

    carbohydrates: {
        type: Number,
        required: true
    },

    sodium: {
        type: Number,
        required: true
    },

    seasonal: {
        type: Boolean,
        default: false
    },
    limited: {
        type: Boolean,
        default: false
    },
    category: {
        type: String,
        required: true
    }
}, { timestamps: true })

const Food = mongoose.model("Food", foodSchema)
export default Food

