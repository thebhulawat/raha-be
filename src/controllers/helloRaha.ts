import { Request, Response } from 'express';
import { WithAuthProp } from '@clerk/clerk-sdk-node';

export default function helloRaha(req: Request, res: Response) {
  const auth = (req as WithAuthProp<Request>).auth;
  res.json({ message: 'hello Raha' });
}
