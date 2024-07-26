import { Paddle, EventName } from '@paddle/paddle-node-sdk';
import { Request } from 'express';

const paddle = new Paddle(process.env.PADDLE_API_KEY || '');

export async function verifyAndUnmarshalPaddleWebhook(req: Request) {
  const signature = req.headers['paddle-signature'] as string;
  const rawBody = req.body;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      'PADDLE_WEBHOOK_SECRET is not set in environment variables'
    );
  }

  if (!signature) {
    throw new Error('Paddle-Signature header is missing');
  }

  if (!rawBody) {
    throw new Error('Request body is empty');
  }

  try {
    const bodyString =
      typeof rawBody === 'object' ? JSON.stringify(rawBody) : rawBody;

    const result = paddle.webhooks.unmarshal(
      bodyString,
      webhookSecret,
      signature
    );
    return result;
  } catch (error) {
    console.error('Webhook verification failed:', error);
    throw error;
  }
}

export { EventName };
