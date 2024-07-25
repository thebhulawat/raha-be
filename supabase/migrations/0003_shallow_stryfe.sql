ALTER TABLE "calls" ADD COLUMN "created_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN "updated_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule" ADD COLUMN "created_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule" ADD COLUMN "updated_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" text NOT NULL;