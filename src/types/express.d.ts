declare namespace Express {
  export interface Request {
    federatedUser: import('passport-twitter').Profile
  }
  export interface User {
    id: string;
    username: string;
  }
}