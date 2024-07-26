import Retell from 'retell-sdk';
import { Request, Response } from 'express';
import { processTranscript } from '../../utils/transcriptProcessor';

export default async function handleRetellWebhook(req: Request, res: Response) {
  try {
    const retell_api_key = process.env.RETELL_API_KEY || '';
  if (
    !Retell.verify(
      JSON.stringify(req.body),
      retell_api_key,
      req.headers['x-retell-signature'] as string
    )
  ) {
    console.error('Invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }
  const content = req.body;
  //console.log('in webhook', content);
  switch (content.event) {
    case 'call_started':
      console.log('Call started event received in webhook', content.call.call_id);
      break;
    case 'call_ended':
      console.log('Call ended event received in webhook', content.call.call_id);
      //console.log('Processing transcript...', content.call);
      await processTranscript(content.call.transcript_object, content.call);
      break;
    case 'call_analyzed':
      console.log('Call analyzed event received in webhook', content.call.call_id);
      break;
    default:
      console.log('Received an unknown event in webhook', content.event);
      break;
  }
  res.json({ received: true });
  } catch (err) {
    console.error('Error processing the webhook from retell', err)
    res.status(500).json({
      recieved: false, 
      mesaage: 'Error processing the webhook'
    })
  }
}