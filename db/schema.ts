import {
    pgTable,
    text,
    timestamp,
    integer,
    boolean,
    jsonb,
    uuid,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
    "none",
    "active",
    "canceled",
    "past_due",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
    "gmail",
    "google_calendar",
    "telegram",
]);

export const taskStatusEnum = pgEnum("task_status", [
    "pending",
    "completed",
    "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
    "low",
    "medium",
    "high",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
    "running",
    "success",
    "failed",
]);

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Shape of each entry in agentRuns.actionsLog (jsonb) */
export interface ActionLogEntry {
    emailId: string;
    from: string;
    subject: string;
    date: string;
    status: "success" | "error";
    summary?: string;
    priority?: string;
    category?: string;
    needsReply?: boolean;
    draftReply?: string | null;
    actionItems?: {
        title: string;
        description: string;
        dueDate: string | null;
    }[];
    tasksCreated?: number;
    draftCreated?: boolean;
    eventsCreated?: number;
}

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * users
 * Core identity table — synced with Clerk for auth.
 */
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").unique().notNull(),
    email: text("email").notNull(),
    name: text("name"),
    subscriptionStatus: subscriptionStatusEnum("subscription_status")
        .default("none")
        .notNull(),
    subscriptionId: text("subscription_id"),
    agentEnabled: boolean("agent_enabled").default(true).notNull(),
    heartbeatInterval: integer("heartbeat_interval").default(15).notNull(), // minutes
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    preferences: jsonb("preferences").default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * integrations
 * OAuth connections (gmail, google_calendar).
 * accessToken & refreshToken are encrypted at rest — handle in app layer.
 */
export const integrations = pgTable("integrations", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    accessToken: text("access_token").notNull(),   // Encrypted
    refreshToken: text("refresh_token").notNull(),   // Encrypted
    expiresAt: timestamp("expires_at"),
    scope: text("scope").array().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * tasks
 * Structured action items surfaced by the agent or created manually.
 */
export const tasks = pgTable("tasks", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("pending").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueDate: timestamp("due_date"),
    createdByAgent: boolean("created_by_agent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

/**
 * agentRuns
 * One record per autonomous execution loop invocation.
 */
export const agentRuns = pgTable("agent_runs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    status: agentRunStatusEnum("status").default("running").notNull(),
    summary: text("summary"),
    actionsLog: jsonb("actions_log")
        .$type<ActionLogEntry[]>()
        .default([])
        .notNull(),
    emailsProcessed: integer("emails_processed").default(0).notNull(),
    tasksCreated: integer("tasks_created").default(0).notNull(),
    draftsCreated: integer("drafts_created").default(0).notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
    integrations: many(integrations),
    agentRuns: many(agentRuns),
    tasks: many(tasks),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
    user: one(users, {
        fields: [integrations.userId],
        references: [users.id],
    }),
}));

export const agentRunsRelations = relations(agentRuns, ({ one }) => ({
    user: one(users, {
        fields: [agentRuns.userId],
        references: [users.id],
    }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    user: one(users, {
        fields: [tasks.userId],
        references: [users.id],
    }),
}));

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type ProcessedEmail = ActionLogEntry & { processedAt: Date };