import { google } from "googleapis";
import nodemailer from "nodemailer"

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = "https://developers.google.com/oauthplayground"
const REFRESH_TOKEN = process.env.REFRESH_TOKEN
const EMAIL_USER = process.env.EMAIL_USER

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

type Props = {
    to: string,
    subject: string,
    text: string
}

const sendEmail = async ({ to, subject, text }: Props) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken()
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: EMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken.token ?? ''
            }
        })

        const mailOptions = {
            from: `${EMAIL_USER}`,
            to,
            subject,
            text,
        }
        const result = await transporter.sendMail(mailOptions)
        console.log("Email sent:", result)

    } catch (err) {
        console.error("Error sending email:", err)
    }
}

export default sendEmail
