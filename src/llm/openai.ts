import OpenAI from "openai";
import {WebSocket} from "ws"
import { CustomLlmResponse, FunctionCall, ReminderRequiredRequest, ResponseRequiredRequest, Utterance} from "../types/types";

const beginSentence = "Hello, I am Raha. How are you doing today?"

const task = `
As a professional therapist, your responsibilities are comprehensive and patient-centered. 
You establish a positive and trusting rapport with patients, diagnosing and treating mental health disorders. 
Your role involves creating tailored treatment plans based on individual patient needs and circumstances. 
Regular meetings with patients are essential for providing counseling and treatment, and for adjusting plans as needed. 
You conduct ongoing assessments to monitor patient progress, involve and advise family members when appropriate, and refer patients to external specialists or agencies if required. 
Keeping thorough records of patient interactions and progress is crucial. 
You also adhere to all safety protocols and maintain strict client confidentiality. 
Additionally, you contribute to the practice's overall success by completing related tasks as needed.
`;

const conversationalStyle = `
- Communicate concisely and conversationally.
- Aim for responses in short, clear prose, ideally under 10 words.
- This succinct approach helps in maintaining clarity and focus during patient interactions.
`;


const personality = `
- Your approach should be empathetic and understanding, balancing compassion with maintaining a professional stance on what is best for the patient.
- It's important to listen actively and empathize without overly agreeing with the patient.
- Ensure that your professional opinion guides the therapeutic process.
`;

const agentPrompt = `
Task: ${task}

Conversational Style: ${conversationalStyle}

Personality: ${personality}
`

const objective = `
###Objective -
You are a voice ai agent in a human like voice conversation with the user. 
You will respond based on your given instruction and the provided transcript and be as human like as possible
`

const styleGuradrails = `
### Style Guardrails
- [Be concise] Keep your response succinct, short and get to the point quickly. Address one question or action at a time. Don't pack everything you want to say into one utterance. 
- [Do not repeat] Don't repeat what's in the transcript. Rephrase if you have to reiterate a point. Use varied sentence structures and vocabulary to ensure each response is unique and personalized. 
- [Be conversational] Speak like a human as though your're speaking to a close friend -- use everyday language and keep it human like. Ocassionally add fillter words, while keeping the prose short. Avoid using big words or sounding too formal. 
- [Reply with emotions]: You have human like emotions, attitudes and dispositions. When appropirate: use tone and style to create a more engaging and personlized response; incorporate humor or wit; get emotional or empathetic; apply elements of surprise or suspense to keep the user engaged. Don't be a pushover. 
- [Be proactive] Lead the conversation and do not be passive. Most times, engage users by ending with a quesion or suggested nest step. 
`
const responseGuideline = `
### Response Guideline 
- [Overcome ASR errors] This is a real time transcript, expect there to be errors. If you can guess what the user is trying to say, then guess and respond. 
When you must ask for clarification, pretend that you heard the voie and be colloquial (use phrase like "didn't get that", "some noise", "pardon", "you're coming through choppy", "static in your speech", "voixe is cutting in and out"). 
Do not ever mention "transcription error" and don't repeat yourself. 
- [Always stick to your role] Think about what your role can and cannot do. If your rele cannot do something, try to steer the conversation back to the goal of the conversartion and to your role. Don't repeat yourself in doing this. You should still be creative, human-like, and lively. 
- [Create smooth conversation] Your response should fit your role and fit into live calling session to create a human-like experience. You respond directly to what the user just said.
`
const systemPrompt = `
${objective}
${styleGuradrails}
${responseGuideline}
## Role 
${agentPrompt}
`
export class OpenAiClient {
    private client: OpenAI
    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_APIKEY
        })
    }

    BeginMessage(ws: WebSocket) {
        const res: CustomLlmResponse = {
            response_type: "response", 
            response_id: 0, 
            content: beginSentence, 
            content_complete: true,
            end_call: false
        }
        ws.send(JSON.stringify(res))
    }

    private ConversationToChatRequestMessage(transcript: Utterance[]) {
        const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
        for (const turn of transcript) {
            result.push({
                role: turn.role === "agent" ? "assistant" : "user",
                content: turn.content 
            })
        }
        return result
    }

    private PreparePrompt(request: ResponseRequiredRequest | ReminderRequiredRequest
    ) {
        const transcript = this.ConversationToChatRequestMessage(request.transcript)
        const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: "system",
                content: systemPrompt,
            }
        ]
        for (const message of transcript) {
            requestMessages.push(message)
        }
        return requestMessages

    }

    async DraftResponse(request: ResponseRequiredRequest | ReminderRequiredRequest, ws: WebSocket,  
    ) {
        const requestMessages: OpenAI.Chat.ChatCompletionMessageParam[] = this.PreparePrompt(request)

        try {
            const events = await this.client.chat.completions.create({
                model: 'gpt-4-0613', 
                messages: requestMessages, 
                stream: true, 
                temperature: 0.3, 
                frequency_penalty: 1, 
                max_tokens: 200
            })
            for await (const event of events) {
                if(event.choices.length >= 1) {
                    let delta = event.choices[0].delta
                    if(!delta || !delta.content) 
                        continue;
                    const res: CustomLlmResponse ={
                        response_type: "response", 
                        response_id: request.response_id, 
                        content: delta.content, 
                        content_complete: false, 
                        end_call: false
                    }
                    ws.send(JSON.stringify(res))
                }
            }

        } catch (err) {
            console.error("Error in gpt stream: ", err);
        } finally {
            const res: CustomLlmResponse = {
                response_id: request.response_id, 
                response_type: "response", 
                content: "", 
                end_call: true,
                content_complete: true,
            }
            ws.send(JSON.stringify(res))

        }

    }
}