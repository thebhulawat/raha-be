import { db } from '../db/index';
import { scheduleTable, usersTable } from '../db/schema';
import { eq, lte } from 'drizzle-orm';
import axios from 'axios';
import cron from 'node-cron';

export class CallScheduler {
  private serverUrl: string;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  public start() {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      console.log('Running scheduled call check...');
      await this.checkAndTriggerCalls();
    });
  }

  private async checkAndTriggerCalls() {
    const now = new Date();
    const scheduledCalls = await db
      .select({
        scheduleId: scheduleTable.id,
        userId: scheduleTable.userId,
        time: scheduleTable.time,
        frequency: scheduleTable.frequency,
        lastCallTimestamp: scheduleTable.lastCallTimestamp,
        phoneNumber: usersTable.phoneNumber,
        activeDays: scheduleTable.activeDays,
      })
      .from(scheduleTable)
      .leftJoin(usersTable, eq(scheduleTable.userId, usersTable.id))
      .where(lte(scheduleTable.time, now));

    for (const call of scheduledCalls) {
      if (this.shouldTriggerCall(call, now) && call.phoneNumber) {
        await this.triggerCall(call.phoneNumber);
        await this.updateLastCallTimestamp(call.scheduleId, now);
      }
    }
  }

  private shouldTriggerCall(
    call: {
      time: Date;
      frequency: string;
      lastCallTimestamp: Date | null;
      activeDays: number[];
    },
    now: Date
  ): boolean {
    if (!call.lastCallTimestamp) return true;

    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const scheduleTime = call.time.getHours() * 60 + call.time.getMinutes();

    if (call.frequency === 'daily') {
      const timeSinceLastCall =
        now.getTime() - call.lastCallTimestamp.getTime();
      return timeSinceLastCall >= 24 * 60 * 60 * 1000;
    } else if (call.frequency === 'weekly') {
      if (!call.activeDays.includes(currentDay)) return false;

      const lastCallDate = new Date(call.lastCallTimestamp);
      lastCallDate.setHours(0, 0, 0, 0);
      const nowDate = new Date(now);
      nowDate.setHours(0, 0, 0, 0);

      return lastCallDate < nowDate && currentTime >= scheduleTime;
    }

    return false;
  }

  private async triggerCall(phoneNumber: string) {
    try {
      await axios.post(`${this.serverUrl}/create-phone-call`, { phoneNumber });
      console.log(`Triggered call for ${phoneNumber}`);
    } catch (error) {
      console.error(`Failed to trigger call for ${phoneNumber}:`, error);
    }
  }

  private async updateLastCallTimestamp(scheduleId: number, timestamp: Date) {
    await db
      .update(scheduleTable)
      .set({ lastCallTimestamp: timestamp })
      .where(eq(scheduleTable.id, scheduleId));
  }
}
