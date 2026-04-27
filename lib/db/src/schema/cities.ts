import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const citiesTable = pgTable("cities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dueDay: integer("due_day").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CityRow = typeof citiesTable.$inferSelect;
export type InsertCityRow = typeof citiesTable.$inferInsert;
