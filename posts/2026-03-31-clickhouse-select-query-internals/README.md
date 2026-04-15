# How ClickHouse Processes a SELECT Query Internally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Processing, Internal, Execution Pipeline, Performance

Description: Walk through the internal stages ClickHouse goes through when executing a SELECT query, from parsing to result streaming.

---

## The Query Lifecycle

When you send a SELECT query to ClickHouse, it passes through several distinct stages before results are returned. Understanding each stage helps you diagnose slow queries and tune performance.

## Stage 1 - Parsing and AST Building

ClickHouse parses the SQL text into an Abstract Syntax Tree (AST). You can inspect the AST with:

```sql
EXPLAIN AST SELECT user_id, count() FROM events WHERE event_date = today() GROUP BY user_id;
```

The parser validates syntax and builds the AST. ClickHouse's SQL dialect supports many non-standard extensions like `FINAL`, `SAMPLE`, and `PREWHERE`.

## Stage 2 - Query Analysis and Optimization

The analyzer resolves table names, column references, aliases, and applies logical rewrites:

- Constant folding (`1 + 1` becomes `2`)
- Predicate pushdown into subqueries
- Alias expansion
- PREWHERE optimization (moves cheap filter conditions to an earlier filtering pass)

```sql
EXPLAIN SYNTAX SELECT user_id, count() FROM events WHERE event_date = today() GROUP BY user_id;
```

## Stage 3 - Query Plan Creation

ClickHouse builds a physical query plan:

```sql
EXPLAIN PLAN SELECT user_id, count() FROM events WHERE event_date = today() GROUP BY user_id;
```

The plan shows steps like `ReadFromMergeTree`, `Filter`, `Aggregating`, and `Sorting`. Each step becomes a pipeline processor.

## Stage 4 - Pipeline Construction

ClickHouse converts the plan into a pipeline of processors that can run in parallel:

```sql
EXPLAIN PIPELINE SELECT user_id, count() FROM events WHERE event_date = today() GROUP BY user_id;
```

Each processor runs in a thread. Data flows as columnar blocks (chunks) between processors through queues.

## Stage 5 - Data Reading

`ReadFromMergeTree` uses the primary index and skip indexes to find relevant granules, then reads compressed column data from disk. Only columns referenced in the query are read (column pruning).

## Stage 6 - PREWHERE Filtering

If PREWHERE is specified (or auto-injected by the optimizer), the cheapest filter condition runs first on a subset of columns. Rows that fail this filter are discarded before other columns are decompressed, saving I/O.

```sql
SELECT * FROM events PREWHERE event_date = today() WHERE user_id > 100;
```

## Stage 7 - Aggregation

For GROUP BY queries, ClickHouse uses a two-phase aggregation:

1. Local aggregation in each read thread using hash tables
2. Final merge across all threads

```sql
-- Force single-threaded for debugging
SET max_threads = 1;
```

## Stage 8 - Result Serialization

The final block is serialized into the requested output format (JSON, CSV, Native, etc.) and streamed back to the client.

## Summary

A ClickHouse SELECT query flows through parsing, analysis, planning, pipeline construction, parallel data reading with index skipping, PREWHERE filtering, parallel aggregation, and result serialization. Using EXPLAIN at each stage reveals where time is spent and how to optimize.
