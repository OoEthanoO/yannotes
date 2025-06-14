export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  created_at?: Date;
  updated_at?: Date;
}
