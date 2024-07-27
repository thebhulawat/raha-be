import { Request, Response } from 'express';
import { db } from '../../db';
import { scheduleTable } from '../../db/schema';
import { SelectSchedule } from '../../db/schema';
import { getUserFromClerkId } from '../../utils/db';
import moment from 'moment-timezone';
import { eq } from 'drizzle-orm';
import { time } from 'console';

export default async function getSchedule(req: Request, res: Response) {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerkUserId = req.auth.userId;

    // Fetch user from the database
    const user = await getUserFromClerkId(clerkUserId);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch the schedule for this user
    const schedule = await db
      .select()
      .from(scheduleTable)
      .where(eq(scheduleTable.userId, user[0].id));

    if (schedule.length === 0) {
      return res
        .status(404)
        .json({ error: 'Schedule not found for this user' });
    }

    const userSchedule: SelectSchedule = schedule[0];

    // Prepare the response
    const scheduleResponse = {
      time: userSchedule.time,
      scheduleFrequency: userSchedule.scheduleFrequency,
      scheduleDays: userSchedule.scheduleDays,
    };

    res.status(200).json(scheduleResponse);
  } catch (error) {
    console.error('Error retrieving schedule:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while retrieving the schedule' });
  }
}
