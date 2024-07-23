import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  photo: text('photo'),
  subscription: text('subscription'),
  freeCallsLeft: integer('free_calls_left').notNull(),
  phoneNumber: text('phone_number').notNull(),
});

export const callsTable = pgTable('calls', {
  id: serial('id').primaryKey(),
  date: timestamp('date').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  transcript: text('transcript').notNull(),
  insights: text('insights').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  callType: text('call_type', { enum: ['scheduled', 'ad_hoc'] }).notNull(),
});

export const scheduleTable = pgTable('schedule', {
  id: serial('id').primaryKey(),
  time: timestamp('time').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly'] }).notNull(),
  lastCallTimestamp: timestamp('last_call_timestamp'),
});

export type InsertSchedule = typeof scheduleTable.$inferInsert;
export type SelectSchedule = typeof scheduleTable.$inferSelect;

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertCall = typeof callsTable.$inferInsert;
export type SelectCall = typeof callsTable.$inferSelect;
