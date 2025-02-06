import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateUserToken } from "../middleware/user_middleware.js";

const prisma = new PrismaClient();
const saltRounds = 10; // Define salt rounds for bcrypt

export const createUser = async (req, res) => {
  try {
    const { user_name, email, password } = req.body;

    if (!user_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        userName: user_name, // Match Prisma schema (mapped as `user_name`)
        email: email,
        password: hashedPassword,
      },
    });

    // Generate token
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
    console.log("hitting");
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        userName: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = await generateUserToken(user.id);
    res.status(200).json({
      user: {
        id: user.id,
        user_name: user.userName,
        email: user.email,
        grade: user.grade,
        education: user.education,
      },
      token,
    });
  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
