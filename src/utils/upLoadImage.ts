import cloudinary from "cloudinary"

export const uploadImage = async (userId: string, file: Express.Multer.File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
            {
                folder: "photo",
                public_id: `user_${userId}`,
                overwrite: true
            },
            (error, result) => {
                if (error) return reject(error);
                if (result) return resolve(result.secure_url);
            }
        )
        stream.end(file.buffer)
    })
}