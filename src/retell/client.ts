import {Retell} from 'retell-sdk'
export class RetellClient{
  private client: Retell

  constructor() {
    const retell_api_key = process.env.RETELL_API_KEY || ''
    this.client = new Retell({
      apiKey: retell_api_key
    })
  }

  async createCall(to_number: string) {
    const retellPhoneNumber = process.env.RETELL_PHONE_NUMBER || '';
    
    if (!retellPhoneNumber) {
      console.error('RETELL_PHONE_NUMBER is not set in the environment variables.');
      throw new Error('Retell phone number is not configured');
    }
  
    try {
      const createPhoneCallResponse = await this.client.call.createPhoneCall({
        from_number: retellPhoneNumber,
        to_number: to_number,
      });
      console.log('Create phone call response: ', createPhoneCallResponse);
      return createPhoneCallResponse;
    } catch (error) {
      console.error('Error creating phone call:', error);
      throw error; 
    }
  }
}