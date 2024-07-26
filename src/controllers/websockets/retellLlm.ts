import { WebSocket, RawData } from 'ws';
import { Request } from 'express';
import { CustomLlmRequest, CustomLlmResponse } from '../../types/types';
import { OpenAiClient } from '../../clients/openai';
import { processTranscript } from '../../utils/transcriptProcessor';

export default function handleRetellLlmWebSocket(ws: WebSocket, req: Request) {
  const callId = req.params.call_id;
  console.log('Handle llm ws for: ', callId);
  let fullTranscript: any[] = [];

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

  ws.on('close', () => {
    console.error('Closing llm ws for: ', callId);
    //processTranscript(fullTranscript, callId);
  });

  ws.on('message', async (data: RawData) => {
    if (data instanceof Buffer) {
      console.error('Got binary message instead of text in websocket.');
      ws.close(1007, 'Cannot find corresponding Retell LLM.');
      return;
    }

    const request: CustomLlmRequest = JSON.parse(data.toString());

    switch (request.interaction_type) {
      case 'call_details':
        console.log('call details: ', request.call);
        llmClient.BeginMessage(ws);
        break;
      case 'reminder_required':
      case 'response_required':
        console.clear();
        console.log('req object received in the websocket/n', request);
        llmClient.DraftResponse(request, ws);
        break;
      case 'ping_pong':
        const pingpongResponse: CustomLlmResponse = {
          response_type: 'ping_pong',
          timestamp: request.timestamp,
        };
        ws.send(JSON.stringify(pingpongResponse));
        break;
      case 'update_only':
        //fullTranscript = request.transcript;
        //console.log('Transcript updated:', request);
        break;
    }
  });
}
