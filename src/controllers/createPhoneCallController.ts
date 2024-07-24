import { Request, Response } from 'express';
import { RetellClient } from '../clients/retellClient';

export default async function createPhoneCallController(req: Request, res: Response) {
  const { phoneNumber } = req.body;
  const retellClient = new RetellClient();

  try {
    const result = await retellClient.createCall(phoneNumber);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Retell phone number is not configured') {
        res.status(500).json({ error: 'Server configuration error' });
      } else {
        res.status(400).json({ error: err.message });
      }
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
}