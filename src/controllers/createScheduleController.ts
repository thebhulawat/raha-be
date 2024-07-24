import { Request, Response } from 'express';
import { db } from '../db';
import { scheduleTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { InsertSchedule } from '../db/schema';

export default async function createSchedule(req: Request, res: Response) {
  try {
    if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerkUserId = req.auth.userId;

    const { time, frequency, activeDays } = req.body;

    // Validate input
    if (!time || !frequency || !Array.isArray(activeDays)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    // Fetch user from the database
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkUserId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare the schedule data
    const newSchedule: InsertSchedule = {
      time: new Date(time),
      userId: user[0].id,
      frequency: frequency as 'daily' | 'weekly',
      activeDays: activeDays,
      lastCallTimestamp: null // Initially set to null
    };

    // Insert the new schedule
    const insertedSchedule = await db.insert(scheduleTable).values(newSchedule).returning();

    res.status(201).json({
      message: 'Schedule saved successfully',
      schedule: insertedSchedule[0]
    });

  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ error: 'An error occurred while saving the schedule' });
  }
}
