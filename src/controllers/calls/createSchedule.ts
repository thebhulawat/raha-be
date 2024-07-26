import { Request, Response } from 'express';
import { db } from '../../db';
import { scheduleTable, usersTable } from '../../db/schema';
import { InsertSchedule, SelectSchedule } from '../../db/schema';
import { getUserFromClerkId } from '../../utils/db';
import moment from 'moment-timezone';
import { eq } from 'drizzle-orm';

export default async function createOrUpdateSchedule(
  req: Request,
  res: Response
) {
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
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    if (
      scheduleDays.length !== 7 ||
      !scheduleDays.every((day) => typeof day === 'boolean')
    ) {
      return res.status(400).json({ error: 'Invalid schedule days' });
    }

    // Fetch user from the database
    const user = await getUserFromClerkId(clerkUserId);

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert time to UTC
    const localTime = moment.tz(time, 'HH:mm', timezone);
    const utcTime = localTime.clone().tz('UTC').format('HH:mm');

    // Prepare the schedule data
    const scheduleData: Omit<InsertSchedule, 'id'> = {
      time: utcTime,
      userId: user[0].id,
      scheduleFrequency: frequency,
      scheduleDays: scheduleDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Check if a schedule already exists for this user
    const existingSchedule = await db
      .select()
      .from(scheduleTable)
      .where(eq(scheduleTable.userId, user[0].id));

    let resultSchedule: SelectSchedule;

    if (existingSchedule.length > 0) {
      // Update existing schedule
      const [updatedSchedule] = await db
        .update(scheduleTable)
        .set(scheduleData)
        .where(eq(scheduleTable.id, existingSchedule[0].id))
        .returning();
      resultSchedule = updatedSchedule;
    } else {
      // Insert new schedule
      scheduleData.createdAt = new Date().toISOString();
      const [insertedSchedule] = await db
        .insert(scheduleTable)
        .values(scheduleData)
        .returning();
      resultSchedule = insertedSchedule;
    }

    res.status(200).json({
      message:
        existingSchedule.length > 0
          ? 'Schedule updated successfully'
          : 'Schedule created successfully',
      schedule: resultSchedule,
    });
  } catch (error) {
    console.error('Error saving/updating schedule:', error);
    res
      .status(500)
      .json({ error: 'An error occurred while saving/updating the schedule' });
  }
}
