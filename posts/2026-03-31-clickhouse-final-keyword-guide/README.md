# What Is FINAL Keyword and When to Use It in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, FINAL, ReplacingMergeTree, Deduplication, Query

Description: Learn what the FINAL keyword does in ClickHouse queries, when to use it with ReplacingMergeTree tables, its performance trade-offs, and faster alternatives.

## Introduction

When you query a `ReplacingMergeTree`, `CollapsingMergeTree`, or any MergeTree variant that deduplicates or collapses rows during merges, you face a challenge: background merges happen asynchronously. At any given moment, a table may have duplicate rows from inserts that have not yet been merged.

The `FINAL` keyword forces ClickHouse to apply the deduplication or collapsing logic at query time, returning the same result you would see after all background merges completed. It trades query performance for result correctness.

## Why FINAL Exists

Consider a `ReplacingMergeTree` that keeps the latest version of each row by primary key:

```sql
CREATE TABLE user_profiles
(
    user_id     String,
    name        String,
    email       String,
    plan        LowCardinality(String),
    updated_at  DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id;
```

You insert a user twice with different plans:

```sql
INSERT INTO user_profiles VALUES ('U-001', 'Alice', 'alice@example.com', 'free',   '2024-01-01');
INSERT INTO user_profiles VALUES ('U-001', 'Alice', 'alice@example.com', 'pro',    '2024-06-01');
```

Without a merge, both rows exist in the table:

```sql
SELECT * FROM user_profiles WHERE user_id = 'U-001';
-- Returns 2 rows: one with plan='free' and one with plan='pro'
```

With `FINAL`, ClickHouse deduplicates at query time and returns only the latest:

```sql
SELECT * FROM user_profiles FINAL WHERE user_id = 'U-001';
-- Returns 1 row: plan='pro' (latest by updated_at)
```

## How FINAL Works Internally

When you add `FINAL`, ClickHouse performs an in-memory merge of all data parts at query time. It groups rows by the sorting key and applies the same logic the background merge would use:
- For `ReplacingMergeTree`: keep the row with the highest version
- For `CollapsingMergeTree`: cancel matching sign pairs
- For `SummingMergeTree`: sum numeric columns

This means FINAL forces ClickHouse to read all relevant parts, sort them, and apply the merge logic before returning results. This is more expensive than a normal SELECT.

## Performance Impact of FINAL

`FINAL` was single-threaded in early ClickHouse versions and significantly slower than a normal query. Modern ClickHouse executes FINAL in parallel (controlled by the `max_final_threads` setting), but it is still more expensive than a non-FINAL query because it has to merge rows on the fly.

Measure the difference:

```sql
-- Without FINAL (fast, possibly stale)
SELECT count() FROM user_profiles WHERE plan = 'pro';

-- With FINAL (correct, slower)
SELECT count() FROM user_profiles FINAL WHERE plan = 'pro';
```

On a table with many unmerged parts, FINAL can be 5-20x slower than a regular scan. The performance difference shrinks when the background merge threads have caught up.

## Checking Merge Backlog

Before deciding whether to use FINAL, check how many unmerged parts exist:

```sql
SELECT
    partition,
    count()    AS parts,
    sum(rows)  AS total_rows
FROM system.parts
WHERE table = 'user_profiles'
  AND active = 1
GROUP BY partition
ORDER BY parts DESC;
```

If each partition has many parts (dozens or hundreds), FINAL queries will be slow and background merges are behind. If each partition has 1-5 parts, FINAL is cheap.

## Alternatives to FINAL

### Alternative 1: argMax for Latest Value

Instead of reading the whole table with FINAL, use `argMax` to get the latest value of each column per primary key:

```sql
SELECT
    user_id,
    argMax(name,    updated_at) AS name,
    argMax(email,   updated_at) AS email,
    argMax(plan,    updated_at) AS plan,
    max(updated_at)             AS updated_at
FROM user_profiles
GROUP BY user_id;
```

This is significantly faster than FINAL because it does not require sorting all parts - it just aggregates. The trade-off is more verbose SQL.

### Alternative 2: Force a Merge First

If you need FINAL-correct results for a one-time report and can afford the wait:

```sql
OPTIMIZE TABLE user_profiles FINAL;
-- Now query without FINAL
SELECT * FROM user_profiles WHERE user_id = 'U-001';
```

Never use `OPTIMIZE TABLE FINAL` in production for large tables - it can take hours and blocks concurrent merges.

### Alternative 3: Snapshot Table for Latest State

Maintain a separate table populated with the already-deduplicated state, then refresh it on a schedule (for example via a scheduled job that runs `INSERT INTO ... SELECT ... FINAL`, or a refreshable materialized view on ClickHouse 23.12+):

```sql
CREATE TABLE user_profiles_current
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY user_id
AS SELECT * FROM user_profiles FINAL;
```

Query `user_profiles_current` instead of the main table. Note that `CREATE TABLE ... AS SELECT` produces a one-time snapshot, so you will need an external refresh mechanism to keep it current.

## When FINAL Is Acceptable

FINAL is appropriate in these situations:

1. **Low-traffic tables** - user profile lookups, configuration tables, or other small tables where the performance difference is negligible
2. **After scheduled merges** - if you run `OPTIMIZE TABLE` nightly, FINAL on a mostly-merged table is cheap
3. **Read-after-write correctness** - when your application inserts a row and immediately needs to read back the deduplicated state
4. **Ad hoc analytical queries** - exploratory queries where absolute correctness matters more than speed

## FINAL in Subqueries

FINAL applies to the table it qualifies. You can use it in subqueries:

```sql
SELECT
    p.plan,
    count(*) AS users
FROM (
    SELECT user_id, plan
    FROM user_profiles FINAL
) AS p
GROUP BY p.plan;
```

## FINAL with Joins

You can use FINAL on any table in a join:

```sql
SELECT
    p.user_id,
    p.plan,
    o.total_orders
FROM user_profiles FINAL AS p
JOIN (
    SELECT user_id, count() AS total_orders
    FROM orders
    GROUP BY user_id
) AS o ON p.user_id = o.user_id;
```

## Enabling FINAL Globally for a Session

You can force FINAL on all queries in a session (useful for compatibility with ORMs that generate plain SELECT statements):

```sql
SET final = 1;

-- All subsequent queries implicitly use FINAL
SELECT * FROM user_profiles WHERE user_id = 'U-001';
```

## FINAL with Lightweight Deletes

Since ClickHouse 22.8, lightweight deletes mark rows with a hidden `_row_exists` column. Without FINAL, deleted rows may still appear in results. With FINAL (or with `apply_deleted_mask = 1`), they are filtered out:

```sql
SET apply_deleted_mask = 1;  -- Default: enabled
SELECT * FROM my_table WHERE id = 'X';
```

## Conclusion

`FINAL` provides query-time correctness for MergeTree tables that rely on background merges for deduplication. It is a useful escape hatch but comes with a real performance cost. For high-traffic production queries, prefer the `argMax` pattern or ensure background merges are keeping up. Reserve FINAL for low-traffic lookups, admin queries, or cases where correctness cannot be compromised.

**Related Reading:**

- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is CollapsingMergeTree and When to Use It](https://oneuptime.com/blog/post/2026-03-31-clickhouse-collapsingmergetree-guide/view)
- [What Is the Difference Between Mutations and Lightweight Deletes in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mutations-vs-lightweight-deletes/view)
