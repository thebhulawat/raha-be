
import { Request, Response } from 'express';
import { getUserFromClerkId } from '../utils/dbUtils';
import { db } from '../db';
import { scheduleTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteSchedule(req:Request, res: Response) {
    try {
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({error: 'Unauthorized'})
        }

        const clerkUserId = req.auth.userId
        const user = await getUserFromClerkId(clerkUserId)

        if (user.length === 0) {
            return res.status(404).json({error: 'User not found'})
        }

        const deleteSchedule = await db.delete(scheduleTable).where(eq(scheduleTable.userId, user[0].id)).returning()
        
        
        if (deleteSchedule.length === 0 ) {
            return res.status(404).json({error: 'No schedule found for the user'})
        }
        
        console.log('Schedule deleted for the user: ', user[0].id);
        
        return res.status(200).json({
            message: 'Schedule deleted successfully', 
            deleteSchedule: deleteSchedule[0]
        })
    } catch (err) {
        console.error('Error deleting schedule: ', err)
        res.status(500).json({error: 'An error occured while deleting the schedule'})

    }
}