# How Redis Strings Work Internally and When to Use Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, String, Internal, Memory, Performance

Description: Explore how Redis strings are encoded internally using embstr, raw SDS, and int encodings, and learn when each encoding is used for optimal performance.

---

Redis strings are the simplest and most versatile data type, but under the hood Redis applies several different encodings depending on the value's size and type. Understanding these encodings helps you write more memory-efficient applications.

## The Three String Encodings

Redis uses three internal encodings for strings:

| Encoding | Used when |
|----------|-----------|
| `int` | Value is an integer that fits in a long |
| `embstr` | String is 44 bytes or shorter |
| `raw` | String is longer than 44 bytes |

Check a key's encoding with `OBJECT ENCODING`:

```bash
SET counter 42
OBJECT ENCODING counter
# Returns: "int"

SET short_key "hello"
OBJECT ENCODING short_key
# Returns: "embstr"

SET long_key "this is a string that is definitely longer than forty-four bytes total"
OBJECT ENCODING long_key
# Returns: "raw"
```

## SDS: Simple Dynamic String

Redis does not use C's null-terminated strings. Instead, it uses its own SDS (Simple Dynamic String) structure:

```text
+------+--------+--------+----------+------+
| len  | alloc  | flags  | buf[]... | \0   |
+------+--------+--------+----------+------+
```

Key properties of SDS:
- `len` tracks the actual string length - O(1) `STRLEN`
- `alloc` tracks allocated capacity for amortized appends
- Binary-safe: no special meaning for null bytes

## embstr vs raw

For strings up to 44 bytes, Redis uses `embstr`, which stores the `robj` (Redis object) and SDS buffer in a single contiguous memory allocation. This reduces memory allocations and improves cache locality.

For strings over 44 bytes, Redis uses `raw` encoding with two separate allocations.

```bash
# Observe the threshold
SET key44 "12345678901234567890123456789012345678901234"
OBJECT ENCODING key44
# Returns: "embstr"  (44 bytes)

SET key45 "123456789012345678901234567890123456789012345"
OBJECT ENCODING key45
# Returns: "raw"  (45 bytes)
```

## Integer Encoding

When a string value is a valid integer, Redis stores it as a C long directly - no SDS allocation at all. Redis also maintains a shared integer pool for values 0-9999, so SET counter 100 reuses a pre-allocated object.

```bash
SET views 9999
OBJECT ENCODING views
# Returns: "int"

INCR views
OBJECT ENCODING views
# Still "int" (10000 is still a valid long)
```

## When to Use Strings

Strings are the right choice for:

- **Counters**: `INCR`, `INCRBY`, `INCRBYFLOAT` work only on string-encoded integers/floats
- **Caching serialized objects**: JSON, MessagePack, Protobuf blobs
- **Session tokens and API keys**: short embstr values with TTL
- **Distributed locks**: `SET key value NX PX 30000`
- **Feature flags**: simple `GET`/`SET` with boolean values

```bash
# Distributed lock pattern
SET lock:resource_123 "worker_1" NX PX 30000
# NX = only set if not exists, PX = expire in 30000ms
```

## Memory Considerations

```bash
# Check memory used by a key
MEMORY USAGE mykey
```

Prefer short keys and values when possible - each key has a base overhead of approximately 64 bytes regardless of content. Using `embstr` (under 44 bytes) saves one memory allocation per key compared to `raw`.

## Summary

Redis strings use three internal encodings: `int` for integer values, `embstr` for short strings up to 44 bytes, and `raw` for longer strings. These encodings are chosen automatically to minimize memory and maximize performance. Use strings for counters, cache entries, locks, and session data where simplicity and speed matter most.
