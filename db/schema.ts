import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "records",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    value: text("value").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);
export const locks = sqliteTable("locks", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at").notNull(),
});
export const counters = sqliteTable("counters", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
});
