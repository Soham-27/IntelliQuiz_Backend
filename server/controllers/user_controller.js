import { client } from "../models/db.js";
import bcrypt from "bcrypt";
import { generateUserToken } from "../middleware/user_middleware.js";

const saltrounds = process.env.saltrounds

export const createUser = async (req, res) => {
    try {
        const { user_name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, parseInt(saltrounds));
        const query = "INSERT INTO users (user_name, email, password) VALUES ($1, $2, $3) RETURNING id, user_name, email";
        const params = [user_name, email, hashedPassword];
        const result = await client.query(query, params);
        const user = result.rows[0];
        const token = await generateUserToken(user.id); // Use 'id' here instead of 'user_id'
        res.status(201).json({ user, token });
    } catch (error) {
        console.error("Error in creating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const query = "SELECT id, user_name, email, password FROM users WHERE email = $1";
        const params = [email];
        const result = await client.query(query, params);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: "Invalid email" });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }
        const token = await generateUserToken(user.user_id);
        res.status(200).json({ user, token });
    } catch (error) {
        console.error("Error in user login:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}