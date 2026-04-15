# How to Use sipHash64() and sipHash128() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Security, SipHash, Deduplication

Description: Learn how to use sipHash64() and sipHash128() in ClickHouse for keyed hashing, security-sensitive applications, and generating stable identifiers.

---

SipHash is a keyed hash function designed to be fast while providing protection against hash-flooding attacks. Unlike CityHash or xxHash, SipHash uses an internal key, making it harder for adversaries to craft inputs that collide. ClickHouse provides two variants: `sipHash64()` returns a 64-bit UInt64, and `sipHash128()` returns a 128-bit UInt128.

## Basic Usage of sipHash64

`sipHash64()` accepts one or more arguments. All arguments are combined and hashed together.

```sql
-- Hash a single string
SELECT sipHash64('hello world');

-- Hash multiple columns as a composite key
SELECT
    user_id,
    sipHash64(user_id, session_id) AS session_hash
FROM sessions
LIMIT 10;
```

## Basic Usage of sipHash128

`sipHash128()` returns a 128-bit hash as a UInt128. Use `hex()` to get a human-readable hexadecimal string.

```sql
-- Get a 128-bit hash as hex
SELECT hex(sipHash128('hello world')) AS hash_hex;

-- Hash multiple columns and display as hex
SELECT
    request_id,
    hex(sipHash128(request_id, user_agent, ip_address)) AS request_fingerprint
FROM http_logs
LIMIT 10;
```

## Generating Stable Session IDs

SipHash is well suited for generating stable session or request IDs from multiple identifying fields.

```sql
-- Generate a stable session ID from user and time window
SELECT
    user_id,
    toStartOfHour(event_time) AS hour_window,
    sipHash64(user_id, toStartOfHour(event_time)) AS stable_session_id
FROM events
LIMIT 10;
```

## Hash-Flooding Protection in Analytics

When building analytics that process user-controlled strings (such as URLs, user agents, or form values), using `sipHash64` instead of a plain hash reduces the risk of adversarial inputs causing skewed hash distributions.

```sql
-- Count events grouped by a hash of the user-agent string
-- This avoids the overhead of storing long strings
SELECT
    sipHash64(user_agent) AS ua_hash,
    count() AS request_count
FROM http_logs
GROUP BY ua_hash
ORDER BY request_count DESC
LIMIT 20;
```

## Generating Unique IDs for Deduplication

`sipHash128` produces a 128-bit value that is extremely unlikely to collide. It is suitable as a stable fingerprint for deduplication across large datasets.

```sql
-- Generate a 128-bit fingerprint for each log line
SELECT
    hex(sipHash128(
        toString(timestamp),
        host,
        message
    )) AS log_fingerprint,
    timestamp,
    host,
    message
FROM system_logs
LIMIT 10;
```

## Combining sipHash64 with Sampling

Because `sipHash64` is deterministic, it enables reproducible sampling.

```sql
-- Sample 5% of requests deterministically
SELECT
    request_id,
    url,
    status_code
FROM http_logs
WHERE sipHash64(request_id) % 20 = 0
LIMIT 1000;
```

## Comparing sipHash64 and sipHash128

```sql
-- Compare the two variants on the same input
SELECT
    'test input'               AS input,
    sipHash64('test input')    AS sip64,
    hex(sipHash128('test input')) AS sip128_hex;
```

Use `sipHash64` when you need a UInt64 for arithmetic (bucketing, modulo, ordering). Use `sipHash128` when you need a 128-bit fingerprint and lower collision probability.

## Materialized Hash Column for Fast Lookup

Store the SipHash as a materialized column so it is always up to date without recomputing at query time.

```sql
CREATE TABLE requests
(
    request_id   String,
    user_id      UInt64,
    url          String,
    user_agent   String,
    request_time DateTime,
    req_hash     UInt64 MATERIALIZED sipHash64(request_id, user_id, url)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(request_time)
ORDER BY (user_id, request_time);
```

## Summary

`sipHash64()` and `sipHash128()` provide fast, keyed hashing that is more resistant to adversarial inputs than non-cryptographic alternatives like CityHash. Use `sipHash64` for bucketing, sampling, and generating 64-bit stable IDs. Use `sipHash128` when you need 128-bit fingerprints with very low collision probability. Neither variant is a substitute for cryptographic hashing in security-critical contexts such as password storage.
