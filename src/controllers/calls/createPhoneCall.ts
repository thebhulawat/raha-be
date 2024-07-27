import { Request, Response } from 'express';
import { RetellClient } from '../../clients/retell';
import { getUserFromClerkId } from '../../utils/db';

export default async function createPhoneCall(req: Request, res: Response) {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const clerkUserId = req.auth.userId;
    const user = await getUserFromClerkId(clerkUserId);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user[0].phoneNumber) {
      return res
        .status(404)
        .json({ error: 'No phone associated with the user' });
    }

    if (user[0].subscriptionStatus !== 'active' && user[0].freeCallsLeft <= 0) {
      return res
        .status(403)
        .json({
          error: 'No available calls. Please subscribe or purchase more calls.',
        });
    }

    // Call retell client
    const retellClient = new RetellClient();
    const result = await retellClient.createCall(user[0].phoneNumber);
    
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Retell phone number is not configured') {
        res.status(500).json({ error: 'Server configuration error' });
      } else {
        res.status(400).json({ error: err.message });
      }
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
}
