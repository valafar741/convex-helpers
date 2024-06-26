import { filter } from "convex-helpers/server/filter";
import { convexTest } from "convex-test";
import { v } from "convex/values";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { defineSchema, defineTable } from "convex/server";
import { table } from "console";

const schema = defineSchema({
  tableA: defineTable({
    count: v.number(),
  }),
  tableB: defineTable({
    tableAId: v.id("tableA"),
    name: v.string(),
  }),
});

test("filter", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    for (let i = 0; i < 10; i++) {
      const tableAId = await ctx.db.insert("tableA", { count: i });
      await ctx.db.insert("tableB", { tableAId, name: String(i) });
    }
  });
  const evens = await t.run((ctx) =>
    filter(ctx.db.query("tableA"), (c) => c.count % 2 === 0).collect(),
  );
  expect(evens).toMatchObject([
    { count: 0 },
    { count: 2 },
    { count: 4 },
    { count: 6 },
    { count: 8 },
  ]);
  // For comparison, even filters that were possible before, it's much more
  // readable to use the JavaScript filter.
  const evensBuiltin = await t.run((ctx) =>
    ctx.db
      .query("tableA")
      .filter((q) => q.eq(q.mod(q.field("count"), 2), 0))
      .collect(),
  );
  expect(evens).toMatchObject(evensBuiltin);

  const withLookup = await t.run((ctx) =>
    filter(
      ctx.db.query("tableB"),
      async (c) => ((await ctx.db.get(c.tableAId))?.count ?? 0) > 5,
    ).collect(),
  );
  expect(withLookup).toMatchObject([
    { name: "6" },
    { name: "7" },
    { name: "8" },
    { name: "9" },
  ]);
});
