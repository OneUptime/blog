# How to Use hypothesis Skip Index in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Index, SkipIndex, Database, Performance, Query

Description: Learn how to use the hypothesis skip index in ClickHouse to prune granules for queries involving complex expressions and user-defined conditions.

---

The `hypothesis` skip index is a secondary index type in ClickHouse that stores per-granule boolean results for a given condition expression. When a query's `WHERE` clause matches the stored expression, ClickHouse uses the precomputed per-granule truth values to skip granules where the expression is known to be false.

> Note: The `hypothesis` index is an experimental, condition-based skip index and is distinct from the full-text/inverted text index (which is a separate feature for tokenized string search). Check your ClickHouse version's documentation for availability and any required experimental flags.

## How hypothesis Works

A hypothesis index stores one of three states per granule:

- `0`: The condition is definitely false for all rows in the granule (granule can be skipped)
- `1`: The condition is definitely true for some rows
- `unknown`: Cannot determine

This differs from bloom filter (probabilistic membership) and minmax (range bounds). Hypothesis is useful when you have a precomputed or derived boolean expression that you frequently filter on.

## When to Use hypothesis

- A column stores precomputed flags or scores
- You frequently filter on derived boolean conditions
- You want to skip granules without recomputing a complex expression at scan time

## Syntax

```sql
INDEX index_name expr TYPE hypothesis GRANULARITY n
```

The `expr` must evaluate to a boolean (0 or 1). ClickHouse stores the result per granule.

## Creating a hypothesis Index

```sql
CREATE TABLE fraud_transactions
(
    transaction_id  UInt64,
    amount_cents    UInt64,
    is_flagged      UInt8,
    risk_score      Float32,
    ts              DateTime,

    INDEX idx_flagged is_flagged TYPE hypothesis GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, transaction_id);
```

## Using the Index in Queries

```sql
-- This query can use the hypothesis index
SELECT transaction_id, amount_cents
FROM fraud_transactions
WHERE is_flagged = 1
  AND ts > now() - INTERVAL 7 DAY;
```

ClickHouse checks the per-granule `is_flagged` hypothesis before reading column data. Granules where the index recorded that `is_flagged` is never 1 are skipped.

## Precomputed Boolean Expressions

The hypothesis index is especially powerful when combined with a materialized column:

```sql
CREATE TABLE orders
(
    order_id        UInt64,
    amount_cents    UInt64,
    items_count     UInt8,
    is_large_order  UInt8 MATERIALIZED (amount_cents > 100000 AND items_count > 5),
    ts              DateTime,

    INDEX idx_large_order is_large_order TYPE hypothesis GRANULARITY 4
)
ENGINE = MergeTree()
ORDER BY (ts, order_id);
```

Query:

```sql
SELECT order_id, amount_cents
FROM orders
WHERE is_large_order = 1;
```

The hypothesis index prunes all granules that have never had a large order, avoiding full column scans.

## Inserting Data and Building the Index

```sql
INSERT INTO fraud_transactions
SELECT
    number,
    rand() % 1000000,
    rand() % 10 = 0,  -- ~10% flagged
    rand() / 4294967295.0 * 100,
    now() - rand() % 2592000
FROM numbers(5000000);

-- Build index on existing data
ALTER TABLE fraud_transactions MATERIALIZE INDEX idx_flagged;
```

## Verifying Index Usage

```sql
EXPLAIN indexes = 1
SELECT count()
FROM fraud_transactions
WHERE is_flagged = 1;
```

The output shows how many granules the hypothesis index eliminated.

## Granularity Tuning

```sql
-- Finer granularity: better pruning, larger index
INDEX idx_flagged is_flagged TYPE hypothesis GRANULARITY 1

-- Coarser granularity: less memory, less precise
INDEX idx_flagged is_flagged TYPE hypothesis GRANULARITY 16
```

## Comparing hypothesis vs set for Boolean Columns

For a binary flag (0 or 1), both `set(2)` and `hypothesis` can prune effectively:

```sql
-- set index for binary flag
INDEX idx_flag_set is_flagged TYPE set(2) GRANULARITY 4

-- hypothesis index for binary flag
INDEX idx_flag_hyp is_flagged TYPE hypothesis GRANULARITY 4
```

The `set(2)` index stores the set of distinct values per block (either `{0}`, `{1}`, or `{0,1}`). `hypothesis` stores a per-granule boolean truth value. For boolean columns, `set(2)` is simpler and equally effective in most cases. Use `hypothesis` for more complex expression-based conditions.

## Checking Index Size

```sql
SELECT
    name,
    type,
    formatReadableSize(data_compressed_bytes) AS index_size
FROM system.data_skipping_indices
WHERE table = 'fraud_transactions'
  AND database = currentDatabase();
```

## Summary

The hypothesis skip index stores per-granule boolean results for a specified expression, enabling ClickHouse to skip granules where the expression is known to be false. It is most useful for precomputed boolean flags and materialized condition columns. Pair it with fine granularity for precision, and always validate with `EXPLAIN indexes = 1`.
