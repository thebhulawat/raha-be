import { Request, Response } from 'express';
import { db } from '../../db';
import { usersTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyAndUnmarshalPaddleWebhook, EventName } from '../../utils/paddle';

export default async function handlePaddleWebhook(req: Request, res: Response) {
  try {
    const eventData = await verifyAndUnmarshalPaddleWebhook(req);

    if (!eventData) {
      throw new Error('Invalid webhook data');
    }

    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
        console.log(`Handling Paddle event type: ${eventData.eventType}`);
        await handleSubscriptionCreated(eventData.data);
        break;
      case EventName.SubscriptionUpdated:
        console.log(`Handling Paddle event type: ${eventData.eventType}`);
        await handleSubscriptionUpdated(eventData.data);
        break;
      default:
        console.log(`Unhandled Paddle event type: ${eventData.eventType}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing Paddle webhook:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
}

async function handleSubscriptionCreated(data: any) {
  try {
    const {
      id,
      status,
      customerId,
      items,
      collectionMode,
      nextBilledAt,
      scheduledChange,
      createdAt,
      customData,
    } = data;

    if (!id || !status || !customerId || !items || !createdAt || !customData) {
      throw new Error('Missing required fields in subscription data');
    }

    const updateData = {
      subscriptionStatus: status,
      paddleSubscriptionId: id,
      paddleCustomerId: customerId,
      subscriptionItems: items,
      collectionMode: collectionMode,
      subscriptionCreatedAt: new Date(createdAt),
      subscriptionNextBilledAt: nextBilledAt ? new Date(nextBilledAt) : null,
      subscriptionScheduledChange: scheduledChange,
    };

    // First, try to update the user by Paddle customer ID
    const result = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.paddleCustomerId, customerId))
      .returning({ updatedId: usersTable.id });

    // If no user was updated (result is empty), try to update by email
    if (result.length === 0) {
      if (!customData.userEmail) {
        throw new Error('User email not provided in custom data');
      }
      const emailUpdateResult = await db
        .update(usersTable)
        .set(updateData)
        .where(eq(usersTable.email, customData.userEmail))
        .returning({ updatedId: usersTable.id });

      if (emailUpdateResult.length === 0) {
        throw new Error('No user found with provided customer ID or email');
      }
    }
    console.log('Subscription created successfully');
  } catch (error) {
    console.error('Error handling subscription creation:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

async function handleSubscriptionUpdated(data: any) {
  try {
    const { id, status, items, collectionMode, nextBilledAt, scheduledChange } =
      data;

    if (!id || !status || !items) {
      throw new Error('Missing required fields in subscription update data');
    }

    const occurredAt = new Date();

    const updateResult = await db
      .update(usersTable)
      .set({
        subscriptionStatus: status,
        subscriptionItems: items,
        collectionMode: collectionMode,
        subscriptionCreatedAt: occurredAt,
        subscriptionNextBilledAt: nextBilledAt ? new Date(nextBilledAt) : null,
        subscriptionScheduledChange: scheduledChange,
      })
      .where(eq(usersTable.paddleSubscriptionId, id))
      .returning({ updatedId: usersTable.id });

    if (updateResult.length === 0) {
      throw new Error('No user found with provided subscription ID');
    }

    console.log('Subscription updated successfully');
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}
