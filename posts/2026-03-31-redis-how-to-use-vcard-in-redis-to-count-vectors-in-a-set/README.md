# How to Use VCARD in Redis to Count Vectors in a Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vector Set, Embedding, Index Management

Description: Learn how to use VCARD in Redis to get the total count of vector elements stored in a Vector Set for index monitoring and capacity planning.

---

## What Is VCARD?

`VCARD` returns the number of elements (vectors) currently stored in a Redis Vector Set. The name follows the Redis convention of `CARD` commands (like `SCARD` for sets, `ZCARD` for sorted sets), and is the simplest way to monitor the size of your vector index.

## Syntax

```text
VCARD key
```

Returns an integer: the number of elements in the Vector Set, or 0 if the key does not exist.

## Basic Usage

```bash
# Create a vector set and add some elements
VADD products VALUES 4 0.1 0.2 0.3 0.4 prod:1001
VADD products VALUES 4 0.5 0.6 0.7 0.8 prod:1002
VADD products VALUES 4 0.2 0.3 0.4 0.5 prod:1003

VCARD products
# Returns: (integer) 3

# After adding more
VADD products VALUES 4 0.6 0.7 0.8 0.9 prod:1004

VCARD products
# Returns: (integer) 4

# After removing one
VREM products prod:1001

VCARD products
# Returns: (integer) 3
```

## Key Does Not Exist

```bash
# Key that doesn't exist returns 0
VCARD nonexistent_key
# Returns: (integer) 0
```

## Python Example: Index Size Monitoring

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_index_stats(key: str) -> dict:
    """Get basic stats about a vector index."""
    count = r.execute_command("VCARD", key)
    info = r.execute_command("VINFO", key) if count > 0 else None
    return {
        "key": key,
        "count": int(count) if count else 0,
        "exists": count is not None and int(count) > 0
    }

# Add some test vectors
r.execute_command("VADD", "docs:index", "VALUES", "4", "0.1", "0.2", "0.3", "0.4", "doc:1")
r.execute_command("VADD", "docs:index", "VALUES", "4", "0.5", "0.6", "0.7", "0.8", "doc:2")

stats = get_index_stats("docs:index")
print(f"Index '{stats['key']}': {stats['count']} vectors")

# Monitor growth
def check_index_health(key: str, min_docs: int, max_docs: int):
    count = int(r.execute_command("VCARD", key) or 0)
    if count < min_docs:
        print(f"WARNING: Index '{key}' has only {count} vectors (min: {min_docs})")
    elif count > max_docs:
        print(f"WARNING: Index '{key}' has {count} vectors (max: {max_docs})")
    else:
        print(f"OK: Index '{key}' has {count} vectors")

check_index_health("docs:index", 100, 100000)
```

## Capacity Planning with VCARD

Monitor multiple indexes and estimate memory usage:

```python
def audit_vector_indexes(key_pattern: str) -> list:
    """Audit all vector indexes matching a pattern."""
    keys = r.keys(key_pattern)
    results = []
    for key in sorted(keys):
        count = int(r.execute_command("VCARD", key) or 0)
        # Estimate memory: roughly 4 bytes * dims * count (for FP32)
        # Actual varies by quantization level
        results.append({
            "key": key,
            "count": count,
        })
    return results

# Report on all vector indexes
indexes = audit_vector_indexes("*:vectors")
total = sum(idx["count"] for idx in indexes)
print(f"\nVector Index Audit:")
for idx in indexes:
    print(f"  {idx['key']}: {idx['count']:,} vectors")
print(f"  Total: {total:,} vectors")
```

## Using VCARD in Health Check Endpoints

```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/health/vector-index")
def vector_index_health():
    indexes = {
        "products": r.execute_command("VCARD", "products:vectors"),
        "articles": r.execute_command("VCARD", "articles:vectors"),
        "users": r.execute_command("VCARD", "users:vectors"),
    }

    result = {
        "status": "ok",
        "indexes": {k: int(v or 0) for k, v in indexes.items()}
    }

    # Fail health check if any index is empty
    empty = [k for k, v in result["indexes"].items() if v == 0]
    if empty:
        result["status"] = "degraded"
        result["empty_indexes"] = empty

    return jsonify(result)
```

## Pipelining Multiple VCARD Calls

```python
with r.pipeline() as pipe:
    pipe.execute_command("VCARD", "products:vectors")
    pipe.execute_command("VCARD", "articles:vectors")
    pipe.execute_command("VCARD", "users:vectors")
    results = pipe.execute()

products_count, articles_count, users_count = [int(r or 0) for r in results]
print(f"Products: {products_count}, Articles: {articles_count}, Users: {users_count}")
```

## Comparing VCARD to VINFO

Both commands provide size information:

```bash
# Quick count only
VCARD my_vectors
# Returns: (integer) 1000

# Full metadata including count, dimensions, quantization
VINFO my_vectors
# Returns detailed metadata
```

Use `VCARD` when you only need the count (faster and simpler). Use `VINFO` when you also need dimension info or other metadata.

## Summary

`VCARD` returns the number of elements in a Redis Vector Set with O(1) complexity. It returns 0 for non-existent keys, making it safe to call without prior existence checks. Use it for index monitoring, capacity planning, health checks, and validating that bulk inserts or deletions completed successfully. For comprehensive index metadata including dimensions and quantization, use `VINFO` instead.
