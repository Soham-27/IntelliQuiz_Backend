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

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { userName: user_name }],
        },
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Email and username already exist" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in database
      const user = await prisma.user.create({
        data: {
          userName: user_name, // Match Prisma schema
          email,
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
        userName: user.userName,
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

export const signOutUser = async (req, res) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    // Extract the token from the header
    const userToken = authHeader.split(" ")[1];

    // Check if token exists in the database
    const existingToken = await prisma.userToken.findFirst({
      where: { token: userToken },
    });

    if (!existingToken) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Delete the token from the database
    await prisma.userToken.deleteMany({
      where: { token: userToken },
    });

    return res.status(200).json({ message: "User signed out successfully" });
  } catch (error) {
    console.error("Error in signing out user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
export const userinfo = async (req, res) => {
  try {
    if (!req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Fetch basic user info
    const user = await prisma.user.findFirst({
      where: { id: req.user.id },
      select: {
        id: true,
        userName: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count the number of quizzes completed by the user
    const completedQuizCount = await prisma.test.count({
      where: {
        userId: req.user.id,
        isCompleted: true,
      },
    });

    // Return user info along with the number of completed quizzes
    return res.json({ ...user, completedQuizzes: completedQuizCount });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
