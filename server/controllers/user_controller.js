import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateUserToken } from "../middleware/user_middleware.js";

const prisma = new PrismaClient();
const saltrounds = parseInt(process.env.SALT_ROUNDS) || 10;

export const createUser = async (req, res) => {
    try {
        const { user_name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, saltrounds);
        
        const user = await prisma.user.create({
            data: {
                user_name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                user_name: true,
                email: true,
            }
        });
        
        const token = await generateUserToken(user.id);
        res.status(201).json({ user, token });
    } catch (error) {
        console.error("Error in creating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                user_name: true,
                email: true,
                password: true,
            }
        });
        
        if (!user) {
            return res.status(401).json({ error: "Invalid email" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }
        
        const token = await generateUserToken(user.id);
        res.status(200).json({ user: { id: user.id, user_name: user.user_name, email: user.email }, token });
    } catch (error) {
        console.error("Error in user login:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
