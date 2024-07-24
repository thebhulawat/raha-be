CREATE TABLE IF NOT EXISTS "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"transcript" jsonb NOT NULL,
	"insights" text NOT NULL,
	"user_id" integer NOT NULL,
	"call_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"time" timestamp NOT NULL,
	"user_id" integer NOT NULL,
	"frequency" text NOT NULL,
	"last_call_timestamp" timestamp,
	"active_days" json NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"photo" text,
	"subscription" text,
	"free_calls_left" integer NOT NULL,
	"phone_number" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calls" ADD CONSTRAINT "calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedule" ADD CONSTRAINT "schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
