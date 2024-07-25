import { Request, Response } from 'express';
import { db } from '../db';
import { scheduleTable, usersTable } from '../db/schema';
import { InsertSchedule } from '../db/schema';
import { getUserFromClerkId } from '../utils/dbUtils';
import moment from 'moment-timezone';

export default async function createSchedule(req: Request, res: Response) {
  try {
    if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerkUserId = req.auth.userId;
    const { time, frequency, scheduleDays, timezone } = req.body;

    // Validate input
    if (!time || !frequency || !Array.isArray(scheduleDays) || !timezone) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    if (frequency !== 'daily' && frequency !== 'weekly') {
      return res.status(400).json({error: 'Invalid frequency'})
    }

    if (scheduleDays.length !== 7 && !scheduleDays.every(day => typeof day === 'boolean' )) {
      return res.status(400).json({error: 'Invalid schedule days'})
    }

    // Fetch user from the database
    const user = await getUserFromClerkId(clerkUserId)

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert time to UTC 
    const localtime = moment.tz(time, "HH:mm", timezone)
    const utcTime = localtime.clone().tz("UTC").format("HH:mm")

    // Prepare the schedule data
    const newSchedule: InsertSchedule = {
      time: utcTime,
      userId: user[0].id,
      scheduleFrequency: frequency, 
      scheduleDays: scheduleDays,
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
