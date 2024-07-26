import 'dotenv/config';
import expressWs from 'express-ws';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { RetellClient } from './clients/retellClient';
import { CallScheduler } from './utils/callScheduler';
import helloRaha from './controllers/helloRahaController';
import createPhoneCall from './controllers/createPhoneCallController';
import handleRetellLlmWebSocket from './controllers/retellLlmWebScoketController';
import handleRetellWebhook from './controllers/webhook/retellWebhookController';
import handleClerkWebhook from './controllers/webhook/clerkWebhookController';
import { requireAuth } from './middleware/authMiddleware';
import getCalls from './controllers/getCallsController';
import createOrUpdateSchedule from './controllers/createScheduleController';
import { deleteSchedule } from './controllers/deleteScheduleController';
import handlePaddleWebhook from './controllers/webhook/paddleWebhookController';

export class Server {
  public app: expressWs.Application;
  private callScheduler: CallScheduler;

  constructor() {
    this.app = expressWs(express()).app;

    // Middlewares
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    // Set up routes
    this.setupRoutes();

    // Set up scehduler 
    this.callScheduler = new CallScheduler();
    this.callScheduler.start()
  }

  private setupRoutes() {
    // Authenticated routes
    this.app.get('/', requireAuth, helloRaha);
    this.app.post('/calls', requireAuth, createPhoneCall);
    this.app.get('/calls', requireAuth, getCalls)
    this.app.post('/schedules', requireAuth, createOrUpdateSchedule);
    this.app.delete('/schedules', requireAuth, deleteSchedule)
    
    // Websocket route 
    this.app.ws('/llm-websocket/:call_id', handleRetellLlmWebSocket);

    // Webhooks
    this.app.post('/retell-webhook', handleRetellWebhook);
    this.app.post(
      '/clerk-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleClerkWebhook
    );
    this.app.post(
      '/paddle-webhook',
      express.raw({ type: 'application/json' }),
      handlePaddleWebhook
    );
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log('Listening on port ' + port);
      this.callScheduler.start();
      console.log('Call scheduler started');
    });
  }
}
