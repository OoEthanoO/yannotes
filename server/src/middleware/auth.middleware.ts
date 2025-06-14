import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not defined in .env file for middleware");
    return res
      .status(500)
      .json({
        message: "Internal server error - Authentication configuration issue.",
      });
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Access denied. Token has expired." });
      }
      if (err.name === "JsonWebTokenError") {
        return res
          .status(403)
          .json({ message: "Access denied. Token is invalid." });
      }
      return res
        .status(403)
        .json({ message: "Access denied. Could not verify token." });
    }
    req.user = user as { userId: string; username: string };
    next();
  });
};
