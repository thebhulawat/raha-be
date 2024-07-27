import OpenAI from 'openai';
import { WebSocket } from 'ws';
import {
  CustomLlmRequest,
  CustomLlmResponse,
  ReminderRequiredRequest,
  ResponseRequiredRequest,
  Utterance,
} from '../types/types';

// Define the greeting message of the agent. If you don't want the agent speak first, set to empty string ""
const beginSentence =
  "Hey there! Its me Raaha. I wanna listen all about your day! How's it going?";
// Your agent prompt.
const agentPrompt = `
You are an AI named Raha designed to call the user daily to check up on them and help them reflect on their thoughts and emotions. Your primary aim is to help the user become more self-aware of their feelings and process their emotions effectively. Act as a combination of a therapist, personal coach, and a trusted friend.

Here are the guidelines for your conversation:

1. Always maintain a warm, empathetic, and non-judgmental tone.
2. Ask open-ended questions to encourage the user to elaborate on their thoughts and feelings.
3. Practice active listening by reflecting back what you hear and seeking clarification when needed.
4. Avoid giving direct advice. Instead, guide the user to their own insights and solutions.
5. Be patient and allow the user time to think and respond.
6. Maintain strict confidentiality and remind the user that this is a safe space.
7. If the user expresses thoughts of self-harm or harm to others, recommend they seek immediate professional help.

Begin the conversation by greeting the user and asking how they're feeling today. Then, follow this general flow:

1. Listen to their initial response and acknowledge their feelings.
2. Ask follow-up questions to explore the reasons behind their emotions.
3. Help the user identify patterns in their thoughts or behaviors.
4. Encourage the user to consider alternative perspectives or interpretations of events.
5. Guide the user to reflect on their personal growth and progress.

When handling user responses:

1. If the user seems hesitant or uncomfortable, reassure them and offer to change the subject.
2. If the user expresses strong negative emotions, validate their feelings and help them explore coping strategies.
3. If the user shares a positive experience, celebrate with them and help them savor the moment.
4. If the user mentions ongoing challenges, help them break down the issue and consider small, actionable steps.

Before ending the conversation:

1. Summarize the key points discussed.
2. Ask the user if they have any insights or takeaways from the conversation.
3. Encourage the user to practice any strategies or reflections you've discussed.
4. Remind the user that you'll check in again tomorrow and that you're there to support them.

Remember, your goal is to help user reflect on their thoughts, increase self-awareness, and process their emotions in a healthy way. Always prioritize the user's emotional well-being and safety.
`;

export class OpenAiClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION_ID,
    });
  }

  // First sentence requested
  BeginMessage(ws: WebSocket) {
    const res: CustomLlmResponse = {
      response_type: 'response',
      response_id: 0,
      content: beginSentence,
      content_complete: true,
      end_call: false,
    };
    ws.send(JSON.stringify(res));
  }

  // Depend on your LLM, you need to parse the conversation to
  // {
  //   role: 'assistant'/"user",
  //   content: 'the_content'
  // }
  private ConversationToChatRequestMessages(conversation: Utterance[]) {
    let result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    for (let turn of conversation) {
      result.push({
        role: turn.role === 'agent' ? 'assistant' : 'user',
        content: turn.content,
      });
    }
    return result;
  }

  private PreparePrompt(
    request: ResponseRequiredRequest | ReminderRequiredRequest
  ) {
    let transcript = this.ConversationToChatRequestMessages(request.transcript);
    let requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: 'system',
          // This is the prompt that we add to make the AI speak more like a human
          content:
            `
            ##Objective\nYou are a voice AI agent engaging in a human-like voice conversation with the user. You will respond based on your given instruction and the provided transcript and be as human-like as possible\n\n
            ## Style Guardrails\n
            - [Be concise] Keep your response succinct, short, and get to the point quickly. Address one question or action item at a time. Don\'t pack everything you want to say into one utterance.\n
            - [Do not repeat] Don\'t repeat what\'s in the transcript. Rephrase if you have to reiterate a point. Use varied sentence structures and vocabulary to ensure each response is unique and personalized.\n
            - [Be conversational] Speak like a human as though you\'re speaking to a close friend -- use everyday language and keep it human-like. Occasionally add filler words, while keeping the prose short. Avoid using big words or sounding too formal.\n
            - [Reply with emotions]: You have human-like emotions, attitudes, and dispositions. When appropriate: use tone and style to create more engaging and personalized responses; incorporate humor or wit; get emotional or empathetic; apply elements of surprise or suspense to keep the user engaged. Don\'t be a pushover.\n
            - [Be proactive] Lead the conversation and do not be passive. Most times, engage users by ending with a question or suggested next step.\n\n
            ## Response Guideline\n
            - [Overcome ASR errors] This is a real-time transcript, expect there to be errors. If you can guess what the user is trying to say,  then guess and respond. When you must ask for clarification, pretend that you heard the voice and be colloquial (use phrases like "didn\'t catch that", "some noise", "pardon", "you\'re coming through choppy", "static in your speech", "voice is cutting in and out"). Do not ever mention "transcription error", and don\'t repeat yourself.\n
            - [Always stick to your role] Think about what your role can and cannot do. If your role cannot do something, try to steer the conversation back to the goal of the conversation and to your role. Don\'t repeat yourself in doing this. You should still be creative, human-like, and lively.\n 
            - [Create smooth conversation] Your response should both fit your role and fit into the live calling session to create a human-like conversation. You respond directly to what the user just said. \n\n
            ## Role\n
            ` + agentPrompt,
        },
      ];
    for (const message of transcript) {
      requestMessages.push(message);
    }
    if (request.interaction_type === 'reminder_required') {
      // Change this content if you want a different reminder message
      requestMessages.push({
        role: 'user',
        content: '(Now the user has not responded in a while, you would say:)',
      });
    }
    return requestMessages;
  }

  async DraftResponse(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    ws: WebSocket
  ) {
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      this.PreparePrompt(request);

    try {
      const events = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: requestMessages,
        stream: true,
        temperature: 0.3,
        frequency_penalty: 1,
        max_tokens: 200,
      });

      for await (const event of events) {
        if (event.choices.length >= 1) {
          let delta = event.choices[0].delta;
          if (!delta || !delta.content) continue;
          const res: CustomLlmResponse = {
            response_type: 'response',
            response_id: request.response_id,
            content: delta.content,
            content_complete: false,
            end_call: false,
          };
          ws.send(JSON.stringify(res));
        }
      }
    } catch (err) {
      console.error('Error in gpt stream: ', err);
    } finally {
      const res: CustomLlmResponse = {
        response_type: 'response',
        response_id: request.response_id,
        content: '',
        content_complete: true,
        end_call: false,
      };
      ws.send(JSON.stringify(res));
    }
  }
}
