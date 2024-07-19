import { Request, Response } from 'express'
import expressWs from 'express-ws'
import Retell from 'retell-sdk'
import twilio, { Twilio } from 'twilio'
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse'

export class TwilloClient {
    private twillio: Twilio
    private retellClient: Retell

    constructor(retellClient: Retell) {
        this.twillio = twilio(process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILLIO_AUTH_TOKEN)
        this.retellClient = retellClient
    }

    CreatePhoneCall = async (
        fromNumber: string, 
        toNumber : string, 
        agentId: string) => {
            try {
                await this.twillio.calls.create({
                    machineDetection: "Enable", 
                    machineDetectionTimeout: 8,
                    asyncAmd: "true", 
                    asyncAmdStatusCallback: `${process.env.NGROK_IP_ADDRESSS}/twilio-voice-webhook/${agentId}`,
                    url: `${process.env.NGROK_IP_ADDRESS}/twilio-voice-webhook/${agentId}`,
                    to: toNumber, 
                    from: fromNumber,
                })
                console.log(`Call from ${fromNumber} to ${toNumber}`);
            } catch (error) {
                console.log('failed to retrieve caller infomation: ', error);  
            }         
        }

    EndCall = async(sid: string) => {
        try {
            const call = await this.twillio.calls(sid).update({
                twiml: "<Response><Hangup></Hangup></Response>"
            })
            console.log("End phone call: ", call);
            
        } catch (error) {
            console.error("Error ending call: ", error);
             
        }
    }

    TransferCall = async(sid: string, transferTo: string) => {
        try {
            const call = await this.twillio.calls(sid).update({
                twiml: `<Response><Dial>${transferTo}</Dial></Response>`
            })
            console.log("Transferred phone call: ", call);
        } catch (error) {
            console.error("Error transferring call: ", error);
        }
    }

    ListenTwilioVoiceWebhook = (app: expressWs.Application) => {
        app.post('twilio-voice-webhook/:agent_id', 
            async(req: Request, res: Response) => {
                const agent_id = req.params.agent_id
                const {AnsweredBy, from, to, callSid} = req.body
                try {
                    if (AnsweredBy
                         && AnsweredBy === "machine_start") {
                            this.EndCall(req.body.callSid)
                            return
                         } else if (AnsweredBy !== "human") {
                            // Todo: check this 
                            return
                         }
                         const callResponse: Retell.PhoneCallResponse  = 
                         await this.retellClient.call.createPhoneCall({
                            from_number: from, 
                            to_number: to
                         })
                         if (callResponse) {
                            const response = new VoiceResponse()
                            const start = response.connect()
                            const stream = start.stream({
                                url: `wss://api.retellai.com/audio-websocket/${callResponse.call_id}`
                            })
                            res.set("Content_Type", "text/xml")
                            res.send(response.toString())
                         }
                    } catch(err) {
                        console.error("Error in twilio voice webhhok: ", err);
                        return res.status(500).send() 
                    } 
                }
            )
        }
}