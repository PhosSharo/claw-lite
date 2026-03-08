import {
    pgTable,
    text,
    timestamp,
    integer,
    pgEnum,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const integrationProviderEnum = pgEnum("integration_provider", [
    "google",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
    "running",
    "complete",
    "failed",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
    "high",
    "med",
    "low",
]);

export const taskStatusEnum = pgEnum("task_status", ["todo", "done"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * users
 * Core identity table — synced with Clerk for auth.
 */
export const users = pgTable("users", {
    id: text("id").primaryKey(),
    clerkUserId: text("clerk_user_id").unique().notNull(),
    email: text("email").unique().notNull(),
    name: text("name"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * integrations
 * OAuth connections (e.g. Google).
 * accessToken & refreshToken are encrypted at rest with AES-256-GCM
 * before being persisted — handle encryption in the application layer.
 */
export const integrations = pgTable("integrations", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    // Store the ciphertext produced by AES-256-GCM encryption
    accessToken: text("access_token").notNull(),   // encrypted
    refreshToken: text("refresh_token"),             // encrypted
    tokenExpiresAt: timestamp("token_expires_at"),
    scope: text("scope"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * agentRuns
 * One record per autonomous execution loop invocation.
 */
export const agentRuns = pgTable("agent_runs", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    status: agentRunStatusEnum("status").notNull().default("running"),
    emailsProcessed: integer("emails_processed").default(0).notNull(),
    tasksCreated: integer("tasks_created").default(0).notNull(),
    draftsCreated: integer("drafts_created").default(0).notNull(),
    summary: text("summary"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

/**
 * tasks
 * Structured action items surfaced by the agent.
 */
export const tasks = pgTable("tasks", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    agentRunId: text("agent_run_id")
        .notNull()
        .references(() => agentRuns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: taskPriorityEnum("priority").notNull().default("med"),
    status: taskStatusEnum("status").notNull().default("todo"),
    sourceEmailId: text("source_email_id"),   // external email message ID
    dueDate: timestamp("due_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
    user: one(users, {
        fields: [agentRuns.userId],
        references: [users.id],
    }),
    tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
    user: one(users, {
        fields: [tasks.userId],
        references: [users.id],
    }),
    agentRun: one(agentRuns, {
        fields: [tasks.agentRunId],
        references: [agentRuns.id],
    }),
}));

// ─── Type exports (Drizzle inferred types) ────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;