ALTER TABLE "users" RENAME COLUMN "subscription" TO "subscription_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paddle_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paddle_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_items" json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "collection_mode" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_occurred_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_next_billed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_scheduled_change" json;