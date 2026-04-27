import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { payersTable } from "./payers";

export const paymentsTable = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    payerId: integer("payer_id")
      .notNull()
      .references(() => payersTable.id, { onDelete: "cascade" }),
    referenceMonth: text("reference_month").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
  },
  (table) => ({
    uniquePayerMonth: uniqueIndex("payments_payer_month_unique").on(
      table.payerId,
      table.referenceMonth,
    ),
  }),
);

export type PaymentRow = typeof paymentsTable.$inferSelect;
export type InsertPaymentRow = typeof paymentsTable.$inferInsert;
