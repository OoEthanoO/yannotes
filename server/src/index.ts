import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "./db";
import { User } from "./types/user.types";
import dotenv from "dotenv";
import {
  authenticateToken,
  AuthenticatedRequest,
} from "./middleware/auth.middleware";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/ping", (req: Request, res: Response) => {
  res.status(200).send("pong");
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Hello World from Express server!");
});

app.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body as Partial<User> & {
    password?: string;
  };

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  if (username.length < 3 || username.length > 20) {
    return res
      .status(400)
      .json({ message: "Username must be between 3 and 20 characters." });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res
      .status(400)
      .json({
        message: "Username can only contain letters, numbers, and underscores.",
      });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  try {
    const existingUserCheck = await query(
      "SELECT username, email FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUserCheck.rows.length > 0) {
      const existing = existingUserCheck.rows[0];
      if (existing.username === username) {
        return res.status(409).json({ message: "Username already exists." });
      }
      if (existing.email === email) {
        return res.status(409).json({ message: "Email already exists." });
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at, updated_at;
    `;
    const newUserResult = await query(insertUserQuery, [
      username,
      email,
      passwordHash,
    ]);
    const newUser: User = newUserResult.rows[0];

    console.log("User registered successfully:", newUser.id);

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error during registration:", error);
    if (error.code === "23505") {
      if (error.constraint && error.constraint.includes("username")) {
        return res.status(409).json({ message: "Username already exists." });
      }
      if (error.constraint && error.constraint.includes("email")) {
        return res.status(409).json({ message: "Email already exists." });
      }
      return res
        .status(409)
        .json({ message: "User with this username or email already exists." });
    }
    res
      .status(500)
      .json({ message: "Internal server error during registration." });
  }
});

app.post("/login", async (req: Request, res: Response) => {
  const {
    email,
    username: bodyUsername,
    password,
  } = req.body as { email?: string; username?: string; password?: string };

  const identifier = email || bodyUsername;

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ message: "Email/username and password are required." });
  }

  try {
    const userQuery = `
      SELECT id, username, email, password_hash AS "passwordHash"
      FROM users
      WHERE email = $1 OR username = $1;
    `;
    const result = await query(userQuery, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const foundUser: User = result.rows[0];
    const isPasswordMatch = await bcrypt.compare(
      password,
      foundUser.passwordHash
    );

    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not defined in .env file");
      return res.status(500).json({
        message: "Internal server error - JWT configuration missing.",
      });
    }

    const tokenPayload = {
      userId: foundUser.id,
      username: foundUser.username,
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: "1h",
    });

    console.log(
      "Login successful, token generated for user:",
      foundUser.username
    );

    res.status(200).json({
      message: "Login successful.",
      token: token,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error during login." });
  }
});

app.get(
  "/profile",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication failed." });
    }

    console.log(
      "Accessing protected /profile endpoint for user:",
      req.user.username
    );

    try {
      const userProfileQuery =
        "SELECT id, username, email, created_at FROM users WHERE id = $1";
      const profileResult = await query(userProfileQuery, [req.user.userId]);

      if (profileResult.rows.length === 0) {
        return res.status(404).json({ message: "User profile not found." });
      }

      const userProfile = profileResult.rows[0];

      res.status(200).json({
        message: "Successfully accessed protected profile data.",
        user: {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          createdAt: userProfile.created_at,
        },
      });
    } catch (error) {
      console.error(
        "Error fetching profile for user:",
        req.user.username,
        error
      );
      res
        .status(500)
        .json({ message: "Internal server error while fetching profile." });
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
