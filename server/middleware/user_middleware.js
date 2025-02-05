import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const isUserAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : null;

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Use findFirst instead of findUnique
    const tokenRecord = await prisma.userToken.findFirst({
      where: { token: token }, // This works now
      include: {
        user: {
          select: {
            id: true,
            userName: true, // Adjusted field to match Prisma schema
            email: true,
            grade: true,
            education: true,
          },
        },
      },
    });

    if (!tokenRecord || !tokenRecord.user) {
      return res.status(401).json({ error: "Unauthorized User!" });
    }

    // Attach only required user details to req
    req.user = tokenRecord.user;
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
        userId: user_id,
        token: token,
        createdAt: timeStamp,
        updatedAt: timeStamp,
      },
    });

    console.log("Token generated:", token);
    return token;
  } catch (err) {
    console.error("Error in token generation:", err);
    throw err;
  }
};
