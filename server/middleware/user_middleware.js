import jwt from "jsonwebtoken";
import { prisma } from "../models/db.js";

export const isUserAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        const token = authHeader ? authHeader.replace("Bearer ", "") : null;
        
        if (!token) {
            return res.status(401).json({ error: "Missing token" });
        }
        
        const tokenRecord = await prisma.userToken.findUnique({
            where: { token },
            include: { user: true },
        });
        
        if (!tokenRecord || !tokenRecord.user) {
            return res.status(401).json({ error: "Unauthorized User!" });
        }
        
        req.user = tokenRecord.user.id;
        req.token = token;
        next();
    } catch (error) {
        console.error("Error in authentication middleware:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export const generateUserToken = async (user_id) => {
    try {
        const timeStamp = new Date();
        const key = process.env.TOKEN_SECRET || "default_secret_key";
        const token = jwt.sign({ id: user_id }, key, { expiresIn: "30d" });
        
        await prisma.userToken.create({
            data: {
                fk_user: user_id,
                token,
                created_at: timeStamp,
                updated_at: timeStamp,
            },
        });
        
        console.log("Token generated:", token);
        return token;
    } catch (err) {
        console.error("Error in token generation:", err);
        throw err;
    }
};
