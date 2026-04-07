# How to Use GenerateRandom Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GenerateRandom, Table Engine, Testing, Benchmarking

Description: Learn how to use the GenerateRandom table engine in ClickHouse to produce synthetic test data for benchmarking, schema testing, and load simulation.

---

The GenerateRandom table engine in ClickHouse generates random data on the fly. It is a virtual engine - no data is stored - and every query produces a fresh batch of randomly generated rows. This makes it invaluable for testing query performance, validating schema designs, and simulating realistic data loads without a real dataset.

## Creating a GenerateRandom Table

You define the schema you want, and GenerateRandom fills it with random values of the appropriate types:

```sql
CREATE TABLE random_events
(
    event_id    UInt64,
    user_id     UInt32,
    event_name  String,
    score       Float64,
    event_date  DateTime,
    tags        Array(String),
    metadata    Map(String, String)
)
ENGINE = GenerateRandom(1, 5, 3);
```

The three optional parameters are:
- `random_seed` - seed for reproducibility (default: random)
- `max_string_length` - max length of generated strings (default: 10)
- `max_array_length` - max length of generated arrays (default: 10)

## Querying for Random Data

```sql
SELECT * FROM random_events LIMIT 5;
```

Each run returns different data (unless you fix the seed). To get exactly N rows:

```sql
SELECT
    event_id,
    user_id,
    event_name,
    event_date
FROM random_events
LIMIT 1000000;
```

## Benchmarking with GenerateRandom

The most common use case is inserting large volumes of test data into a real table:

```sql
INSERT INTO production_events
SELECT
    event_id,
    user_id,
    event_name,
    score,
    event_date
FROM random_events
LIMIT 50000000;
```

This lets you populate a 50-million-row table in seconds to test query performance, compression ratios, and merge behavior without maintaining a fixture dataset.

## Testing Aggregations and Functions

GenerateRandom is also useful for testing that your queries work correctly before real data arrives:

```sql
SELECT
    toDate(event_date) AS day,
    count() AS events,
    avg(score) AS avg_score,
    uniq(user_id) AS unique_users
FROM (SELECT * FROM random_events LIMIT 10000000)
GROUP BY day
ORDER BY day;
```

## Reproducible Results with a Fixed Seed

When you need consistent test output for CI pipelines or documentation:

```sql
CREATE TABLE seeded_data
(
    id UInt64,
    value Float64,
    label String
)
ENGINE = GenerateRandom(42, 8, 4);

SELECT * FROM seeded_data LIMIT 10;
-- Returns the same rows every time
```

## Supported Data Types

GenerateRandom supports all common ClickHouse types:
- Integer types: `UInt8` through `UInt256`, `Int8` through `Int256`
- Float types: `Float32`, `Float64`
- String types: `String`, `FixedString`
- Date/time types: `Date`, `DateTime`, `DateTime64`
- Complex types: `Array`, `Tuple`, `Map`, `Nullable`
- `UUID`, `IPv4`, `IPv6`

## Summary

The GenerateRandom table engine is a lightweight, zero-setup tool for generating synthetic ClickHouse data. Use it for benchmarking query performance, stress-testing ingestion pipelines, validating new schemas, and populating development environments. Since it produces data on the fly, there is no storage cost and no maintenance required.
