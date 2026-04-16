# Validation Summary: How to Use intHash32() and intHash64() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse hash functions: `intHash32`, `intHash64`, `xxHash64`, `cityHash64`
- SQL (ClickHouse dialect)

## Sources Consulted
- Official ClickHouse hash functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse docs entries for `intHash32`, `intHash64`, `xxHash64`, `cityHash64`, and `toString`

## Issues Found
- **Input type imprecision**: The intro claimed `intHash32(n)` and `intHash64(n)` each "accepts a UInt64". Per the official ClickHouse docs, both functions accept any `(U)Int*` type, not specifically UInt64. Updated the intro to state they accept "any integer type" while still noting the return types (UInt32 and UInt64 respectively).

## Review Notes
- All SQL examples are syntactically valid ClickHouse SQL. Modulo-based sampling (`intHash32(col) % N = 0`) and bucketing patterns are idiomatic and widely used.
- The claim that `cityHash64(user_id)` works with integer arguments is correct — `cityHash64` in ClickHouse is variadic and accepts any supported types.
- The performance claim that `intHash*` is faster than `xxHash64(toString(user_id))` is correct, because the latter incurs integer-to-string conversion overhead.
- Minor observation (not corrected since the post doesn't claim otherwise): the official docs note that `intHash64` is actually slightly faster than `intHash32`. The post's guidance to choose between them based on output width and collision probability is still sound.
- The `intHash32(user_id) % 2` A/B split will produce an approximately even distribution, which is correctly verified in the post's example.
