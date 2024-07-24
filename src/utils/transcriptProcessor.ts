import { db } from '../db/index';
import { callsTable, InsertCall } from '../db/schema';
import { ChatOpenAI } from '@langchain/openai';
import * as hub from 'langchain/hub';
import { promptVariables } from './promptVariables';
import { XMLParser } from 'fast-xml-parser';

export async function processTranscript(transcript: any[], callId: string) {
  //TODO - Add the user's real name here
  try {
    // Extract relevant information from the transcript
    const transcriptObject: { role: string; content: string }[] = [];
    var transcriptString: string = '';
    transcript.forEach((t) => {
      const role =
        t.role === 'agent' ? 'Raha' : t.role === 'user' ? 'User' : t.role;
      transcriptObject.push({ role, content: t.content });
      transcriptString += `${role}: ${t.content}\n`;
    });

    console.log(transcriptObject);
    const { title, summary, insights } =
      await generateInsights(transcriptString);

    console.log('Analysed', title, summary, insights);

    // Prepare the call data
    // const callData: InsertCall = {
    //   date: new Date(),
    //   title: title,
    //   summary,
    //   transcript: transcriptObject,
    //   insights,
    //   userId: 1, // You'll need to determine the correct userId
    //   callType: 'ad_hoc', // Assuming this is an ad-hoc call
    // };

    // // Insert the call data into the database
    // await db.insert(callsTable).values(callData);

    console.log(
      `Transcript for call ${callId} processed and saved to the database.`
    );
  } catch (error) {
    console.error(`Error processing transcript for call ${callId}:`, error);
  }
}

const chatModel = new ChatOpenAI({
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateInsights(transcript: string) {
  try {
    const vars = promptVariables;
    const prompt = await hub.pull('raha');

    const constructedPrompt = await prompt.invoke({
      conversation: transcript,
      ...vars,
    });

    const processesdOutput =
      await invokeChatModelWithParsingAndRetry(constructedPrompt);

    const title = processesdOutput.conversation_title;
    const summary = processesdOutput.conversation_summary;
    const insights = processesdOutput.conversation_highlights;

    const output = {
      title,
      summary,
      insights,
    };

    return output;
  } catch (error) {
    console.error('Error in noteCreator:', error);
    throw error;
  }
}

async function invokeChatModelWithParsingAndRetry(
  constructedPrompt: any,
  retryCount = 0
): Promise<any> {
  try {
    const response = await chatModel.invoke(constructedPrompt.toChatMessages());
    const xmlContent = await extractXMLContent(response.content.toString());
    const processesdOutput = convertNoteToStructuredValue(xmlContent);

    if (processesdOutput === null) {
      throw new Error('Failed to convert note content');
    }

    return processesdOutput;
  } catch (error) {
    if (retryCount < 2) {
      console.warn(
        `Attempt ${retryCount + 1} failed. Retrying ChatModel invocation...`
      );
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              invokeChatModelWithParsingAndRetry(
                constructedPrompt,
                retryCount + 1
              )
            ),
          1000
        )
      );
    }
    throw error;
  }
}

function convertNoteToStructuredValue(xmlContent: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsedXml = parser.parse(xmlContent);

  if (!parsedXml.analysis) {
    throw new Error('Invalid XML structure: missing analysis tag');
  }

  const analysis = parsedXml.analysis;

  return {
    conversation_title: analysis.conversation_title,
    conversation_summary: analysis.conversation_summary,
    conversation_highlights: {
      insights: Array.isArray(analysis.conversation_highlights.insight)
        ? analysis.conversation_highlights.insight.map((insight: any) => ({
            title: insight.title,
            description: insight.description,
            emoji: insight.emoji,
          }))
        : [
            {
              title: analysis.conversation_highlights.insight.title,
              description: analysis.conversation_highlights.insight.description,
              emoji: analysis.conversation_highlights.insight.emoji,
            },
          ],
    },
  };
}

export async function extractXMLContent(text: string): Promise<string> {
  const xmlStartIndex = text.indexOf('<analysis>');
  const xmlEndIndex = text.lastIndexOf('</analysis>');

  if (xmlStartIndex === -1 || xmlEndIndex === -1) {
    throw new Error('Valid XML content not found in the response');
  }

  return text.slice(xmlStartIndex, xmlEndIndex + 11); // +11 to include '</analysis>'
}
