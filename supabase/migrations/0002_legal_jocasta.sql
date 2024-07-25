ALTER TABLE "schedule" RENAME COLUMN "frequency" TO "schedule_frequency";--> statement-breakpoint
ALTER TABLE "schedule" ALTER COLUMN "time" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "schedule" ADD COLUMN "schedule_days" boolean[] NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule" DROP COLUMN IF EXISTS "last_call_timestamp";--> statement-breakpoint
ALTER TABLE "schedule" DROP COLUMN IF EXISTS "active_days";