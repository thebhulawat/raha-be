// File: src/controllers/getCallsController.ts

import { Request, Response } from 'express';
import { db } from '../db';
import { callsTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { WithAuthProp } from '@clerk/clerk-sdk-node';

export async function getCalls(req: Request, res: Response) {
  try {

    if (!req.auth || !req.auth.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const clerkUserId = req.auth.userId;

    // Fetch user from the database
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch calls for the user
    const calls = await db.select({
      date: callsTable.date,
      title: callsTable.title,
      transcript: callsTable.transcript,
      insights: callsTable.insights,
    })
    .from(callsTable)
    .where(eq(callsTable.userId, user[0].id))
    .execute();

    // Format the response
    const formattedCalls = calls.map(call => ({
      date: call.date.toISOString().split('T')[0], // Format: YYYY-MM-DD
      time: call.date.toISOString().split('T')[1].split('.')[0], // Format: HH:MM:SS
      title: call.title,
      transcript: call.transcript,
      insights: call.insights,
    }));

    res.status(200).json(formattedCalls);
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({ error: 'An error occurred while fetching calls' });
  }
}

export default getCalls;