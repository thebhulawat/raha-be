import { Request, Response } from 'express';
import { getUserFromClerkId } from '../../utils/db';

export async function getUser(req: Request, res: Response) {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerkUserId = req.auth.userId;

    const user = await getUserFromClerkId(clerkUserId);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract the required user details
    const userDetails = {
      clerkId: user[0].clerkId,
      firstName: user[0].firstName,
      email: user[0].email,
      phoneNumber: user[0].phoneNumber,
      subscriptionStatus: user[0].subscriptionStatus,
      freeCallsLeft: user[0].freeCallsLeft,
    };

    res.status(200).json(userDetails);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while fetching user details' });
  }
}

export default getUser;
