# How to Use generateUUIDv4() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UUID, Data Generation, Schema Design, Insert

Description: Learn how generateUUIDv4() generates random RFC-4122 version 4 UUIDs in ClickHouse, covering default values, bulk generation, and surrogate key patterns.

---

`generateUUIDv4()` returns a randomly generated UUID (version 4) of the `UUID` type on every call. It requires no arguments and produces a 128-bit value encoded as a standard `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` string when cast to `String`, but stored internally as two `UInt64` values for efficiency. It is the primary way to generate surrogate keys, idempotency tokens, and correlation IDs directly inside ClickHouse without relying on the application layer.

## Basic Usage

```sql
-- Generate a single UUID
SELECT generateUUIDv4() AS new_id;
```

```text
new_id
550e8400-e29b-41d4-a716-446655440000
```

```sql
-- Each call produces a different value
SELECT
    generateUUIDv4() AS id1,
    generateUUIDv4() AS id2,
    generateUUIDv4() AS id3;
```

```text
id1                                   id2                                   id3
f47ac10b-58cc-4372-a567-0e02b2c3d479  b1f3c5d7-e9a0-4b2c-8d4e-6f7a8b9c0d1e  ...
```

## Using generateUUIDv4() as a Default Column Value

```sql
-- Table with an auto-generated UUID primary key
CREATE TABLE events (
    id          UUID    DEFAULT generateUUIDv4(),
    event_time  DateTime,
    event_type  LowCardinality(String),
    payload     String
) ENGINE = MergeTree
ORDER BY (event_time, id);

-- Insert without supplying an ID - ClickHouse generates one
INSERT INTO events (event_time, event_type, payload)
VALUES
    (now(), 'click', '{"button":"signup"}'),
    (now(), 'view',  '{"page":"/pricing"}');
```

## Bulk Generation of Test Data

```sql
-- Generate 1 million rows with unique UUIDs for testing
INSERT INTO events
SELECT
    generateUUIDv4()                          AS id,
    now() - toIntervalSecond(rand() % 86400)  AS event_time,
    ['click','view','submit','scroll'][rand() % 4 + 1] AS event_type,
    '{"test":true}'                           AS payload
FROM numbers(1000000);
```

## Verifying UUID Version

UUID v4 has `4` in the 13th hex digit and `8`, `9`, `a`, or `b` in the 17th.

```sql
-- Check that generated UUIDs are version 4
SELECT
    id,
    substring(toString(id), 15, 1) AS version_digit,   -- should be '4'
    substring(toString(id), 20, 1) AS variant_digit     -- should be 8, 9, a, or b
FROM (
    SELECT generateUUIDv4() AS id
    FROM numbers(5)
);
```

```text
id                                    version_digit  variant_digit
550e8400-e29b-41d4-a716-446655440000  4              a
...
```

## Generating UUIDs for Lookup Table Population

```sql
-- Populate a user table with UUID surrogate keys
CREATE TABLE users (
    user_id     UUID DEFAULT generateUUIDv4(),
    username    String,
    email       String,
    created_at  DateTime DEFAULT now()
) ENGINE = MergeTree ORDER BY (created_at, user_id);

INSERT INTO users (username, email)
SELECT
    concat('user_', toString(number)) AS username,
    concat('user_', toString(number), '@example.com') AS email
FROM numbers(100);
```

## Deduplication-Safe Inserts with generateUUIDv4()

When using `ReplicatedMergeTree`, ClickHouse deduplicates inserts by hashing the content of each inserted block. Because `generateUUIDv4()` produces a new value on each attempt, retried inserts yield different block hashes and will not be deduplicated, so for idempotent retries you should generate the UUID in the application and pass it explicitly.

```sql
-- Good: application generates UUID once and retries with the same value
INSERT INTO events (id, event_time, event_type, payload)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', now(), 'click', '{}');
```

## Using generateUUIDv4() in a Materialized View

```sql
-- Assign stable IDs to deduplicated events as they arrive
CREATE MATERIALIZED VIEW events_with_ids
ENGINE = MergeTree ORDER BY (event_time, id)
AS
SELECT
    generateUUIDv4()  AS id,
    event_time,
    event_type,
    payload
FROM raw_events;
```

## Converting Generated UUIDs to Other Formats

```sql
-- Show UUID in string form, numeric form, and as two UInt64 halves
SELECT
    u                                          AS uuid_native,
    toString(u)                                AS uuid_string,
    UUIDStringToNum(toString(u))               AS uuid_bytes,
    reinterpretAsUInt64(substring(UUIDStringToNum(toString(u)), 1, 8))  AS high_64,
    reinterpretAsUInt64(substring(UUIDStringToNum(toString(u)), 9, 8))  AS low_64
FROM (SELECT generateUUIDv4() AS u);
```

## Performance Characteristics

```sql
-- Measure UUID generation throughput
SELECT count() FROM (
    SELECT generateUUIDv4() AS id FROM numbers(10000000)
);
-- Typically completes in under 1 second on modern hardware
```

`generateUUIDv4()` uses a fast PRNG seeded per thread, so it scales linearly with the number of CPU cores ClickHouse uses for the query.

## Summary

`generateUUIDv4()` produces a random RFC-4122 version 4 UUID on every invocation. Use it as a `DEFAULT` expression in table schemas to auto-assign surrogate keys, in `INSERT ... SELECT` statements for bulk test data generation, and inside materialized views to stamp incoming rows with stable identifiers. For idempotent retry scenarios, generate the UUID in your application and pass it explicitly rather than relying on `DEFAULT generateUUIDv4()`, which produces a new value on each attempt.
