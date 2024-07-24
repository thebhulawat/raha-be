import 'dotenv/config';
import { RawData, WebSocket } from 'ws';
import Retell from 'retell-sdk';
import expressWs from 'express-ws';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { CustomLlmRequest, CustomLlmResponse } from './types/types';
import { OpenAiClient } from './llm/openai';
import { RetellClient } from './retell/client';
import { ClerkExpressRequireAuth, WithAuthProp } from '@clerk/clerk-sdk-node';
import { CallScheduler } from './scheduler/callScheduler';
import { Webhook } from 'svix';
import bodyParser from 'body-parser';
import {buffer} from 'micro'
import  handleClerkWebhookContoller from './webhook/clerkWebhookHandler';

export class Server {
  public app: expressWs.Application;
  private retellClient: RetellClient;
  private callScheduler: CallScheduler;

  constructor() {
    this.app = expressWs(express()).app;
    // Middlewares
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));
    //this.app.use(ClerkExpressRequireAuth());

    // handle errors
    // this.app.use((err: any, req: any, res: any, next: any) => {
    //   console.error(err.stack);
    //   res.status(401).send('Unauthenticated!');
    // });

    // Set up dependencies
    this.retellClient = new RetellClient();

    // Set up routes
    this.handleRetellLlmWebSocket();
    this.createPhoneCall();
    this.handleWebhook();
    this.handleClerkWebhook();

    this.helloRaha();
    this.callScheduler = new CallScheduler(
      `http://localhost:${process.env.PORT || 3000}`
    );
  }

  listen(port: number): void {
    this.app.listen(port);
    console.log('Listening on port ' + port);
    this.callScheduler.start();
    console.log('Call scheduler started');
  }

  helloRaha() {
    this.app.get('/', (req: Request, res: Response) => {
      const auth = (req as WithAuthProp<Request>).auth;
      // console.log('Authenticated user:', auth);
      res.json({ message: 'hello Raha', user: auth });
    });
  }

  handleClerkWebhook() {
    this.app.post(
      "/clerk-webhook",
      bodyParser.raw({ type: 'application/json' }),
      handleClerkWebhookContoller
    );
  }

  /* This webhook is used to handle webhooks from retell servers which has a number of events. We will be handling all the events here. */
  handleWebhook() {
    this.app.post('/webhook', (req: Request, res: Response) => {
      const retell_api_key = process.env.RETELL_API_KEY || '';
      if (
        !Retell.verify(
          JSON.stringify(req.body),
          retell_api_key,
          req.headers['x-retell-signature'] as string
        )
      ) {
        console.error('Invalid signature');
        return;
      }
      const content = req.body;
      switch (content.event) {
        case 'call_started':
          console.log('Call started event received ', content.data.call_id);
          break;
        case 'call_ended':
          console.log('Call ended event received', content.data.call_id);
          break;
        case 'call_analyzed':
          console.log('Call analyzed event received', content.data.call_id);
          break;
        default:
          console.log('Received an unkown event', content.event);
          break;
      }
      res.json({ received: true });
    });
  }

  createPhoneCall() {
    this.app.post('/create-phone-call', async (req: Request, res: Response) => {
      const { phoneNumber } = req.body;
      try {
        const result = await this.retellClient.createCall(phoneNumber);
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
    });
  }

  handleRetellLlmWebSocket() {
    this.app.ws(
      '/llm-websocket/:call_id',
      async (ws: WebSocket, req: Request) => {
        try {
          const callId = req.params.call_id;
          console.log('Handle llm ws for: ', callId);

          // Send config to Retell server
          const config: CustomLlmResponse = {
            response_type: 'config',
            config: {
              auto_reconnect: true,
              call_details: true,
            },
          };
          ws.send(JSON.stringify(config));

          // Start sending the begin message to signal the client is ready.
          const llmClient = new OpenAiClient();

          ws.on('error', (err) => {
            console.error('Error received in LLM websocket client: ', err);
          });
          ws.on('close', (err) => {
            console.error('Closing llm ws for: ', callId);
          });

          ws.on('message', async (data: RawData, isBinary: boolean) => {
            if (isBinary) {
              console.error('Got binary message instead of text in websocket.');
              ws.close(1007, 'Cannot find corresponding Retell LLM.');
            }
            const request: CustomLlmRequest = JSON.parse(data.toString());

            // There are 5 types of interaction_type: call_details, ping_pong, update_only,response_required, and reminder_required.
            // Not all of them need to be handled, only response_required and reminder_required.
            if (request.interaction_type === 'call_details') {
              // print call details
              console.log('call details: ', request.call);
              // Send begin message to start the conversation
              llmClient.BeginMessage(ws);
            } else if (
              request.interaction_type === 'reminder_required' ||
              request.interaction_type === 'response_required'
            ) {
              console.clear();
              console.log('req', request);
              llmClient.DraftResponse(request, ws);
            } else if (request.interaction_type === 'ping_pong') {
              let pingpongResponse: CustomLlmResponse = {
                response_type: 'ping_pong',
                timestamp: request.timestamp,
              };
              ws.send(JSON.stringify(pingpongResponse));
            } else if (request.interaction_type === 'update_only') {
              // process live transcript update if needed
            }
          });
        } catch (err) {
          console.error('Encountered error:', err);
          ws.close(1011, 'Encountered error: ' + err);
        }
      }
    );
  }
}
