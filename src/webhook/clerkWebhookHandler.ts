import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { db} from '../db'; 
import { usersTable, InsertUser } from '../db/schema'; 
import { eq } from 'drizzle-orm';

export default async function handleClerkWebhookContoller(req: Request, res: Response) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("You need a WEBHOOK_SECRET in your .env");
  }

  // Get the headers
  const headers = req.headers;
  const svix_id = headers["svix-id"] as string;
  const svix_timestamp = headers["svix-timestamp"] as string;
  const svix_signature = headers["svix-signature"] as string;

  // If there are no Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({"error": "No svix headers"});
  }

  console.log('Svix Headers:', { svix_id, svix_timestamp, svix_signature });

  // Get the body
  const body = JSON.stringify(req.body);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.log("Error verifying webhook:", err instanceof Error ? err.message : 'Unknown error');
    if (err instanceof Error) {
      console.log('Error stack:', err.stack);
    }
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  // Webhook verified, process the event
  const eventType = evt.type;

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log('Unhandled event type:', eventType);
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Error processing webhook",
    });
  }
}

async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data;
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id)?.email_address;
  const primaryPhone = phone_numbers.find((phone: any) => phone.id === data.primary_phone_number_id)?.phone_number;

  const name = `${first_name} ${last_name}`.trim();

  if (!id) {
    throw new Error("Clerk Id is required");
  }

  if (!name) {
    throw new Error("User name is required");
  }

  if (!primaryEmail) {
    throw new Error("User email is required");
  }

  const newUser: InsertUser = {
    clerkId: id,
    name: name,
    email: primaryEmail,
    photo: image_url || null,
    subscription: 'free', // Default subscription
    freeCallsLeft: 3, // Default number of free calls
    phoneNumber: primaryPhone || null,
  };

  await db.insert(usersTable).values(newUser);
}

async function handleUserUpdated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = data;
  const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id)?.email_address;
  const primaryPhone = phone_numbers.find((phone: any) => phone.id === data.primary_phone_number_id)?.phone_number;

  const name = `${first_name} ${last_name}`.trim();

  if (!id) {
    throw new Error("Clerk Id is required");
  }
  
  if (!name) {
    throw new Error("User name is required");
  }

  if (!primaryEmail) {
    throw new Error("User email is required");
  }

  const updatedUser: Partial<InsertUser> = {
    name: name,
    email: primaryEmail,
    photo: image_url || null,
    phoneNumber: primaryPhone || null,
  };

  await db.update(usersTable)
    .set(updatedUser)
    .where(eq(usersTable.clerkId, id));
}

async function handleUserDeleted(data: any) {
  const { id } = data;
  await db.delete(usersTable).where(eq(usersTable.clerkId, id));
}