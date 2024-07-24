import 'dotenv/config';
import expressWs from 'express-ws';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { RetellClient } from './clients/retellClient';
import { CallScheduler } from './utils/callScheduler';
import helloRahaController from './controllers/helloRahaController';
import createPhoneCallController from './controllers/createPhoneCallController';
import handleRetellLlmWebSocketController  from './controllers/retellLlmWebScoketController';
import  handleRetellWebhookController from './controllers/webhook/retellWebhookHandler';
import handleClerkWebhookController from './controllers/webhook/clerkWebhookHandler';
import { requireAuth } from './middleware/authMiddleware';

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
    this.callScheduler = new CallScheduler(
      `http://localhost:${process.env.PORT || 3000}`
    );
  }

  private setupRoutes() {
    this.app.get('/', requireAuth, helloRahaController);
    this.app.post('/create-phone-call', requireAuth, createPhoneCallController);
    this.app.ws('/llm-websocket/:call_id', handleRetellLlmWebSocketController);
    this.app.post('/webhook', handleRetellWebhookController);
    this.app.post(
      '/clerk-webhook',
      bodyParser.raw({ type: 'application/json' }),
      handleClerkWebhookController
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