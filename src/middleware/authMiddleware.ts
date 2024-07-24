import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const checkAuth = ClerkExpressRequireAuth();

  checkAuth(req, res, (error) => {
    if (error) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
    } else {
      next();
    }
  });
};
