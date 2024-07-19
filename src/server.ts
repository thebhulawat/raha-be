import { Server as HttpServer, createServer } from "http";
import {RawData, WebSocket} from "ws"
import expressWs from 'express-ws'
import { Retell } from "retell-sdk";
import express, { Request, Response } from "express";
import cors from "cors"
import { CustomLlmRequest, CustomLlmResponse } from "./types/types";
import { OpenAiClient } from "./llm/openai";
import { TwilloClient } from "./twillio/twillio";

const retell_api_key = process.env.RETELL_API_KEY || ''

export class Server {
    public app: expressWs.Application
    private retellClient: Retell
    private twillioClient: TwilloClient;  


    constructor() {
        this.app = expressWs(express()).app
        this.app.use(express.json())
        this.app.use(cors())
        this.app.use(express.urlencoded({extended: true}))
        this.retellClient = new Retell({
            apiKey: retell_api_key
        })
        this.twillioClient = new TwilloClient(this.retellClient)
        this.twillioClient.ListenTwilioVoiceWebhook(this.app)
        this.handleRetellLlmWebSocket() 
        this.handleWebhook()
        this.helloWorld()
        // this.twillioClient.CreatePhoneCall(
        //     "123", "123", "123"
        // )
    }

    listen(port: number) : void {
        this.app.listen(port)
        console.log("Listening on port " + port);
    }


    /* This webhook is used to handle webhooks from retell servers which has a number of events. We will be handling all the events here. */
    handleWebhook() {
        this.app.post("/webhook", (req: Request, res: Response) => {
            if (!Retell.verify(JSON.stringify(req.body), retell_api_key, req.headers["x-retell-signature"] as string )) {
                console.error('Invalid signature');
                return  
            }
            const content = req.body
            switch (content.event) {
                case "call_started":
                    console.log("Call started event received ", content.data.call_id);
                    break;
                case "call_ended":
                    console.log("Call ended event received", content.data.call_id);
                    break;
                case "call_analyzed": 
                    console.log("Call analyzed event received", content.data.call_id);
                    break;
                default:
                    console.log("Received an unkown event", content.event);
                    break;
            }
            res.json({received: true})
        })
    }

    helloWorld() {
        this.app.get("/", (req: Request, res: Response) => {
            res.json({message: "hello world"})

        })
    }

    handleRetellLlmWebSocket() {
        this.app.ws("/llm-websocket/:call_id",
        async (ws: WebSocket, req: Request) => {
            try {
                const callId = req.params.call_id
                console.log("Handle LLM ws for: ", callId);
                const config : CustomLlmResponse ={
                    response_type: "config", 
                    config: {
                        auto_reconnect: true, 
                        call_details: true
                    }
                }
                ws.send(JSON.stringify(config))
                const llmClient = new OpenAiClient()

                ws.on("error", (err) => {
                    console.error("Error received in LLM websocket client: ", err);
                })
                ws.on("close", (err) => {
                    console.error("Closing llm ws for: ", callId);
                })

                ws.on("message", async (data: RawData, isBinary: boolean) => {
                    if(isBinary) {
                        console.error("Got binary message instead of text in websocket");
                        ws.close(1007, "Canot find corresponding retell llm")
                    }
                    const request: CustomLlmRequest = JSON.parse(data.toString())
                    if (request.interaction_type === "call_details") {
                        console.log("call details: ", request.call);
                         
                    } else if (request.interaction_type === "reminder_required" || request.interaction_type === "response_required") {
                        console.clear()
                        console.log("req", request);
                        llmClient.DraftResponse(request, ws)
                    } else if (request.interaction_type === "ping_pong") {
                        let pingPongResponse: CustomLlmResponse = {
                            response_type: "ping_pong", 
                            timestamp: request.timestamp
                        }
                        ws.send(JSON.stringify(pingPongResponse))
                    } else if (request.interaction_type === "update_only") {
                        // process live transcript if needed
                    }
                }) 
            } catch(err) {
                console.error("Encountered error: ", err);
                ws.close(1011, "Encountered error: " + err)
            }
        }
    )
    }
}