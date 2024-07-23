import dotenv from 'dotenv';
import { Server } from './server';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const server = new Server();
server.listen(8080);
