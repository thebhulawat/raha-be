import { db } from '../db/index';
import { scheduleTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import cron from 'node-cron';
import { RetellClient } from '../clients/retellClient';

export class CallScheduler {
  private retellClient: RetellClient;

  constructor() {
    this.retellClient = new RetellClient();
  }

  public start() {
    // Run every 5th minute
    cron.schedule('*/5 * * * *', async () => {
      console.log('Running scheduled call check...');
      await this.checkAndTriggerCalls();
    });
  }

  private async checkAndTriggerCalls() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = this.getCurrentUTCTimeString();

    console.log(`Current day: ${currentDay}, Current time: ${currentTime}`);

    const scheduledCalls = await db
      .select({
        frequency: scheduleTable.scheduleFrequency,
        phoneNumber: usersTable.phoneNumber,
        scheduleDays: scheduleTable.scheduleDays,
      })
      .from(scheduleTable)
      .leftJoin(usersTable, eq(scheduleTable.userId, usersTable.id))
      .where(eq(scheduleTable.time, currentTime));

    console.log(
      `Found ${scheduledCalls.length} scheduled calls for the current time`
    );

    for (const call of scheduledCalls) {
      if (this.shouldTriggerCall(call, currentDay) && call.phoneNumber) {
        await this.triggerCall(call.phoneNumber);
      }
    }
  }

  private getCurrentUTCTimeString(): string {
    const now = new Date();
    const hoursUTC = now.getUTCHours().toString().padStart(2, '0');
    const minutesUTC = now.getUTCMinutes().toString().padStart(2, '0');
    return `${hoursUTC}:${minutesUTC}`;
  }

  private shouldTriggerCall(
    call: {
      frequency: string;
      scheduleDays: boolean[];
      phoneNumber: string | null;
    },
    currentDay: number
  ): boolean {
    if (!call.phoneNumber) return false;

    if (call.frequency === 'daily') {
      return true;
    } else if (call.frequency === 'weekly') {
      return call.scheduleDays[currentDay];
    }

    return false;
  }

  private async triggerCall(phoneNumber: string) {
    try {
      console.log(`Attempting to trigger call for ${phoneNumber}`);
      const response = await this.retellClient.createCall(phoneNumber);
      console.log(
        `Successfully triggered call for ${phoneNumber}. Response:`,
        response
      );
    } catch (error) {
      console.error(`Failed to trigger call for ${phoneNumber}:`, error);
    }
  }
}
