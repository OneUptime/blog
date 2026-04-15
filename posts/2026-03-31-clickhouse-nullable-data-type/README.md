# How to Use Nullable Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Nullable, NULL

Description: Learn how Nullable(T) works in ClickHouse, its performance overhead, how to test for NULL, and when to prefer alternatives.

---

`Nullable(T)` wraps any non-nullable ClickHouse type to allow `NULL` values. ClickHouse stores a separate null-marker bitmap file alongside the data file for every `Nullable` column, which adds read and write overhead. While `Nullable` is essential when data is genuinely absent, overusing it degrades query performance and prevents some optimizations. Understanding when to use it - and when to avoid it - is important for building efficient schemas.

## Defining Nullable Columns

Wrap any base type with `Nullable(T)`. Only scalar and simple types are supported - you cannot write `Nullable(Array(...))` or `Nullable(Map(...))`.

```sql
CREATE TABLE user_profiles (
    user_id      UInt64,
    username     String,
    email        String,
    phone        Nullable(String),      -- optional
    birth_year   Nullable(UInt16),      -- optional
    referrer_id  Nullable(UInt64),      -- optional foreign key
    created_at   DateTime
) ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO user_profiles VALUES
    (1, 'alice', 'alice@example.com', '+1-555-0101', 1990, NULL,  '2026-01-01 00:00:00'),
    (2, 'bob',   'bob@example.com',   NULL,           NULL, 1,    '2026-01-02 00:00:00'),
    (3, 'carol', 'carol@example.com', '+1-555-0303', 1985, 1,    '2026-01-03 00:00:00');
```

## Checking for NULL: isNull and isNotNull

Use `isNull(x)` or `IS NULL` syntax to test for NULL. Comparisons like `phone = NULL` always return `NULL` (not true), so always use `isNull`.

```sql
-- Users without a phone number
SELECT user_id, username
FROM user_profiles
WHERE isNull(phone);

-- Users with a birth year recorded
SELECT user_id, username, birth_year
FROM user_profiles
WHERE isNotNull(birth_year);

-- Standard IS NULL / IS NOT NULL syntax also works
SELECT user_id FROM user_profiles WHERE phone IS NULL;
```

## Handling NULL in Expressions

NULL propagates through most expressions. Use `ifNull`, `coalesce`, or `assumeNotNull` to provide fallback values.

```sql
-- ifNull: return a default when value is NULL
SELECT
    user_id,
    ifNull(phone, 'no phone') AS phone_display,
    ifNull(birth_year, 0)     AS birth_year_or_zero
FROM user_profiles;

-- coalesce: return first non-NULL value from a list
SELECT
    user_id,
    coalesce(phone, email, username) AS best_contact
FROM user_profiles;

-- assumeNotNull: strip Nullable wrapper (UB if actual NULLs exist)
-- Use only when you are certain no NULLs are present
SELECT assumeNotNull(birth_year) AS year FROM user_profiles WHERE isNotNull(birth_year);
```

## Performance Cost of Nullable

Every `Nullable` column writes a separate `.null` binary mask file per data part. This means:

- Extra I/O for reads even when NULLs are rare
- Aggregation functions must check the mask per row
- Primary key and index columns cannot be `Nullable`

```sql
-- Measure impact: compare nullable vs non-nullable column in aggregation
CREATE TABLE bench_nullable (val Nullable(UInt32)) ENGINE = MergeTree() ORDER BY tuple();
CREATE TABLE bench_plain    (val UInt32)            ENGINE = MergeTree() ORDER BY tuple();

INSERT INTO bench_nullable SELECT if(number % 10 = 0, NULL, toUInt32(number)) FROM numbers(5000000);
INSERT INTO bench_plain    SELECT if(number % 10 = 0, toUInt32(0), toUInt32(number)) FROM numbers(5000000);

-- Compare query time
SELECT sum(val) FROM bench_nullable;
SELECT sum(val) FROM bench_plain;
```

## When to Avoid Nullable

Prefer sentinel values over `Nullable` when NULL semantics are not required by your application logic.

```sql
-- Use empty string instead of Nullable(String)
-- Use 0 or -1 instead of Nullable(UInt64)
-- Use a min date sentinel instead of Nullable(DateTime)

CREATE TABLE events_efficient (
    event_id    UInt64,
    user_id     UInt64,
    session_id  String,            -- '' means no session
    duration_ms UInt32,            -- 0 means not measured
    ended_at    DateTime           -- '1970-01-01' means not ended
) ENGINE = MergeTree()
ORDER BY event_id;
```

## NULL in Aggregations

Most aggregate functions ignore `NULL` values, following SQL standard behavior.

```sql
-- count(expr) counts non-NULL values; count() counts all rows
SELECT
    count(phone)       AS users_with_phone,
    count()            AS total_users,
    avg(birth_year)    AS avg_birth_year  -- NULLs excluded from average
FROM user_profiles;
```

## Summary

`Nullable(T)` is necessary when data is genuinely absent and `NULL` semantics matter, but it comes with real performance costs - extra storage per column and per-row null checks during aggregation. Avoid `Nullable` on primary key or sort key columns, high-cardinality columns used in frequent aggregations, and any column where a sentinel value (empty string, zero, epoch date) is an acceptable substitute. Audit your schema regularly and replace `Nullable` columns with sentinel-based alternatives wherever feasible.
