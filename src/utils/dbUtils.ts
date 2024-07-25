import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema";

export async function getUserFromClerkId(clerkId:string) {
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1)
    return user
}