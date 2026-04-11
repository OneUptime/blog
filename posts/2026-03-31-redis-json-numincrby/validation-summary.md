# Validation Summary: How to Use JSON.NUMINCRBY in Redis to Increment JSON Numbers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisJSON module (JSON.NUMINCRBY command)
- Python (redis-py client library)

## Sources Consulted
- Official Redis documentation for JSON.NUMINCRBY: https://redis.io/docs/latest/commands/json.numincrby/
- Official Redis documentation for JSON.SET: https://redis.io/docs/latest/commands/json.set/
- redis-py documentation for JSON commands: https://redis-py.readthedocs.io/en/stable/commands.html#json-commands

## Issues Found

### 1. Incorrect redis-cli output format for all JSON.NUMINCRBY responses
**What was wrong:** All redis-cli output examples showed array reply format (e.g., `1) "[101]"`) instead of bulk string format (e.g., `"[101]"`). When using JSONPath ($ prefix) with RESP2 (the default protocol), JSON.NUMINCRBY returns a bulk string containing a JSON array, not an array reply. redis-cli displays bulk strings as `"[101]"` without the `1)` array index prefix.

**What was changed:** Removed the `1)` prefix from all single-path output examples in the Increment a Counter, Decrement, and Floating-Point Increment sections. Also updated the Nested Counter Update section comments.

**Why:** The official Redis docs confirm that JSONPath-based JSON.NUMINCRBY returns a bulk string reply under RESP2, displayed as `"[value]"` in redis-cli.

### 2. Incorrect wildcard output format
**What was wrong:** The wildcard example (`$.items[*].price`) showed three separate array elements (`1) "[1.25]"`, `2) "[0.75]"`, `3) "[2.25]"`). The actual return is a single bulk string containing all values in one JSON array: `"[1.25,0.75,2.25]"`.

**What was changed:** Replaced the three-line array output with a single bulk string: `"[1.25,0.75,2.25]"`.

**Why:** The official Redis docs show wildcard/recursive path results as a single JSON array bulk string (e.g., `"[null,4,7,null]"`), not as separate array elements.

## Review Notes
- The Python example uses a TOCTOU pattern (`r.exists()` then `r.json().set()`) which is technically racy under concurrent access. For a tutorial this is acceptable, but production code should use `JSON.SET ... NX` or handle the case where the key already exists.
- The floating-point arithmetic examples (4.5 + 0.1 = 4.6, 4.6 - 0.2 = 4.4) happen to be exact in this case, but readers should be aware that IEEE 754 floating-point arithmetic can produce unexpected results for some decimal values.
- The atomicity explanation in the Mermaid diagram is correct — Redis commands are atomic because the server processes commands sequentially in a single thread.
