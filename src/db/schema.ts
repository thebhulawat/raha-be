
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean
} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  email: text('email').notNull(),
  photo: text('photo'),
  subscription: text('subscription'),
  freeCallsLeft: integer('free_calls_left').notNull(),
  phoneNumber: text('phone_number'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const callsTable = pgTable('calls', {
  id: serial('id').primaryKey(),
  retellCallId: text('retell_call_id').notNull(),
  date: timestamp('date').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  transcript: jsonb('transcript')
    .notNull()
    .$type<Array<{ role: string; content: string }>>(),
  insights: text('insights').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const scheduleTable = pgTable('schedule', {
  id: serial('id').primaryKey(),
  time: text('time').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  scheduleFrequency: text('schedule_frequency', { enum: ['daily', 'weekly'] }).notNull(),
  scheduleDays: boolean('schedule_days').array().notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export type InsertSchedule = typeof scheduleTable.$inferInsert;
export type SelectSchedule = typeof scheduleTable.$inferSelect;

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertCall = typeof callsTable.$inferInsert;
export type SelectCall = typeof callsTable.$inferSelect;
