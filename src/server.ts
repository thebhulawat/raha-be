import 'dotenv/config';
import expressWs from 'express-ws';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { RetellClient } from './clients/retell';
import { CallScheduler } from './utils/callScheduler';
import helloRaha from './controllers/helloRaha';
import createPhoneCall from './controllers/calls/createPhoneCall';
import handleRetellLlmWebSocket from './controllers/websockets/retellLlm';
import handleRetellWebhook from './controllers/webhooks/retell';
import handleClerkWebhook from './controllers/webhooks/clerk';
import { requireAuth } from './middleware/auth';
import getCalls from './controllers/calls/getCalls';
import createOrUpdateSchedule from './controllers/calls/createSchedule';
import { deleteSchedule } from './controllers/calls/deleteSchedule';
import handlePaddleWebhook from './controllers/webhooks/paddle';
import getUser from './controllers/user/getUser';
import getSchedule from './controllers/calls/getSchedule';

export class Server {
  public app: expressWs.Application;
  private callScheduler: CallScheduler;

  constructor() {
    this.app = expressWs(express()).app;

    //TODO: this might cause trouble with the incoming webhooks
    const corsOptions = {
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    // Middlewares
    this.app.use(cors(corsOptions));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Set up routes
    this.setupRoutes();

    // Set up scehduler
    this.callScheduler = new CallScheduler();
    this.callScheduler.start();
  }

  private setupRoutes() {
    // Authenticated routes
    this.app.get('/', requireAuth, helloRaha);
    this.app.post('/calls', requireAuth, createPhoneCall);
    this.app.get('/calls', requireAuth, getCalls);
    this.app.get('/schedules', requireAuth, getSchedule);
    this.app.post('/schedules', requireAuth, createOrUpdateSchedule);
    this.app.delete('/schedules', requireAuth, deleteSchedule);
    this.app.get('/users', requireAuth, getUser);

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
