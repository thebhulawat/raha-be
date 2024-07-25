import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  json,
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
});

export const scheduleTable = pgTable('schedule', {
  id: serial('id').primaryKey(),
  time: timestamp('time').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  frequency: text('frequency', { enum: ['daily', 'weekly'] }).notNull(),
  lastCallTimestamp: timestamp('last_call_timestamp'),
  activeDays: json('active_days').notNull().$type<number[]>(),
});

export type InsertSchedule = typeof scheduleTable.$inferInsert;
export type SelectSchedule = typeof scheduleTable.$inferSelect;

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertCall = typeof callsTable.$inferInsert;
export type SelectCall = typeof callsTable.$inferSelect;
