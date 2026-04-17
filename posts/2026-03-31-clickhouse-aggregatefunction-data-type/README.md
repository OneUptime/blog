# How to Use AggregateFunction Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, AggregateFunction, Aggregation

Description: Learn how AggregateFunction stores binary aggregate states, how to use -State and -Merge combinators, and how AggregatingMergeTree works.

---

`AggregateFunction(func, T)` stores the intermediate binary state of an aggregate function rather than a final value. This enables incremental pre-aggregation: you accumulate partial states using `-State` combinators on insert, and later merge them with `-Merge` combinators on read. The `AggregatingMergeTree` engine automates the merging of these partial states on background merges, making it the foundation for materialized aggregation views in ClickHouse.

## How AggregateFunction Works

When you call `uniqState(user_id)` the result is a compact binary aggregate state, not a plain number. Calling `uniqMerge(state_column)` combines multiple states and returns the final cardinality estimate. The exact internal representation depends on the aggregate function, but the same `-State`/`-Merge` pattern applies to any aggregate function.

```sql
-- Demonstrate the State/Merge pattern manually
SELECT
    uniqState(number) AS uniq_state,
    toTypeName(uniqState(number)) AS state_type
FROM numbers(1000);

-- Merge two states
WITH
    (SELECT uniqState(number) FROM numbers(0, 500))  AS state_a,
    (SELECT uniqState(number) FROM numbers(500, 500)) AS state_b
SELECT uniqMerge(state)
FROM (
    SELECT state_a AS state
    UNION ALL
    SELECT state_b
);
```

## Creating an AggregatingMergeTree Table

`AggregatingMergeTree` automatically merges `AggregateFunction` columns when parts are combined in the background.

```sql
CREATE TABLE daily_user_stats (
    date           Date,
    country        LowCardinality(String),
    unique_users   AggregateFunction(uniq,          UInt64),
    unique_sessions AggregateFunction(uniq,         String),
    p50_latency    AggregateFunction(quantile(0.5), Float32),
    p99_latency    AggregateFunction(quantile(0.99), Float32),
    total_events   SimpleAggregateFunction(sum,     UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (date, country);
```

## Inserting Partial States with -State Combinators

Use the `-State` suffix on any aggregate function call to produce binary state values for insert.

```sql
-- Populate from a raw events table
INSERT INTO daily_user_stats
SELECT
    toDate(event_time)           AS date,
    country                      AS country,
    uniqState(user_id)           AS unique_users,
    uniqState(session_id)        AS unique_sessions,
    quantileState(0.5)(latency_ms)  AS p50_latency,
    quantileState(0.99)(latency_ms) AS p99_latency,
    count()                      AS total_events
FROM raw_events
GROUP BY date, country;
```

## Querying with -Merge Combinators

Use `-Merge` combinators to finalize aggregate states when reading. This works correctly whether AggregatingMergeTree has already merged parts in the background or not.

```sql
-- Read merged results
SELECT
    date,
    country,
    uniqMerge(unique_users)            AS dau,
    uniqMerge(unique_sessions)         AS daily_sessions,
    quantileMerge(0.5)(p50_latency)    AS p50_ms,
    quantileMerge(0.99)(p99_latency)   AS p99_ms,
    sum(total_events)                  AS events
FROM daily_user_stats
GROUP BY date, country
ORDER BY date DESC, dau DESC;
```

## Using Materialized Views for Automatic Aggregation

The standard pattern is to define a raw table, a pre-aggregated AggregatingMergeTree table, and a materialized view that transforms inserts automatically.

```sql
-- 1. Raw events table
CREATE TABLE raw_events (
    event_time  DateTime,
    user_id     UInt64,
    session_id  String,
    country     LowCardinality(String),
    latency_ms  Float32
) ENGINE = MergeTree()
ORDER BY event_time;

-- 2. Pre-aggregated table
CREATE TABLE hourly_stats (
    hour           DateTime,
    country        LowCardinality(String),
    unique_users   AggregateFunction(uniq,          UInt64),
    p99_latency    AggregateFunction(quantile(0.99), Float32),
    total_events   SimpleAggregateFunction(sum,     UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (hour, country);

-- 3. Materialized view that feeds raw events into hourly_stats
CREATE MATERIALIZED VIEW hourly_stats_mv TO hourly_stats AS
SELECT
    toStartOfHour(event_time) AS hour,
    country,
    uniqState(user_id)            AS unique_users,
    quantileState(0.99)(latency_ms) AS p99_latency,
    count()                       AS total_events
FROM raw_events
GROUP BY hour, country;
```

## Querying the Materialized View

```sql
-- After inserting into raw_events, query hourly_stats directly
INSERT INTO raw_events
SELECT
    now() - randUniform(0, 3600),
    rand() % 100000,
    toString(rand() % 50000),
    ['US', 'DE', 'FR', 'JP'][(rand() % 4) + 1],
    randUniform(10, 500)
FROM numbers(100000);

SELECT
    hour,
    country,
    uniqMerge(unique_users)          AS dau,
    quantileMerge(0.99)(p99_latency) AS p99_ms,
    sum(total_events)                AS events
FROM hourly_stats
GROUP BY hour, country
ORDER BY hour DESC, dau DESC
LIMIT 20;
```

## -MergeState Combinator for Nested Aggregation

Use `-MergeState` to re-merge already-merged states back into a state column - useful for rolling up from hourly to daily aggregates.

```sql
-- Roll up hourly_stats into daily_stats
CREATE TABLE daily_stats (
    date           Date,
    country        LowCardinality(String),
    unique_users   AggregateFunction(uniq,           UInt64),
    p99_latency    AggregateFunction(quantile(0.99), Float32),
    total_events   SimpleAggregateFunction(sum,      UInt64)
) ENGINE = AggregatingMergeTree()
ORDER BY (date, country);

INSERT INTO daily_stats
SELECT
    toDate(hour)                         AS date,
    country,
    uniqMergeState(unique_users)         AS unique_users,
    quantileMergeState(0.99)(p99_latency) AS p99_latency,
    sum(total_events)                    AS total_events
FROM hourly_stats
GROUP BY date, country;
```

## Summary

`AggregateFunction(func, T)` stores compact binary aggregate states that can be accumulated and merged incrementally across multiple inserts and background part merges. The `-State` combinator produces these states during `INSERT ... SELECT` operations, and the `-Merge` combinator finalizes them during reads. Combined with `AggregatingMergeTree` and materialized views, this pattern enables extremely efficient pre-aggregation for dashboards and reports - computing cardinality, percentiles, and other complex aggregates over billions of rows without re-scanning raw data.
