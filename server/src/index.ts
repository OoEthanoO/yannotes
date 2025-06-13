import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import "./db";
import { User } from "./types/user.types";

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

  console.log("Received registration request:");
  console.log("Username:", username);
  console.log("Email:", email);

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    console.log("Hashed Password:", passwordHash);

    res.status(201).json({
      message: "Registration request received. User processing pending.",
      user: { username, email },
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during registration." });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
