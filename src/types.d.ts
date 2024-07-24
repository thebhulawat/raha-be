// File: src/types.d.ts

import { Clerk } from "@clerk/clerk-sdk-node";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

// This empty export is necessary to make this a module
export {};