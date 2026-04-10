# How to Use VREM in Redis Vector Sets to Remove Vectors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Vector, Database, Search, Machine Learning

Description: Learn how to use the VREM command in Redis vector sets to remove one or more vector members, and understand how deletion affects the HNSW index and search results.

---

## Introduction

When documents are deleted, products are discontinued, or embeddings need to be refreshed, you need to remove vectors from a Redis vector set. The `VREM` command removes a single member from a vector set, cleaning up its associated vector data, attributes, and HNSW graph edges. After removal, the deleted member no longer appears in similarity search results.

## VREM Syntax

```redis
VREM key element
```

Returns an integer: `1` if the element was removed, or `0` if the element does not exist in the vector set.

## Prerequisites

- Redis 8.0 or later
- `redis-cli` or a compatible client library

## Basic Usage

```redis
VADD products VALUES 4 0.1 0.9 0.3 0.7 product:1
VADD products VALUES 4 0.8 0.2 0.6 0.4 product:2
VADD products VALUES 4 0.4 0.5 0.5 0.6 product:3

VCARD products
# 3

VREM products product:2
# (integer) 1

VCARD products
# 2
```

## Removing Multiple Members

Since `VREM` accepts only one element at a time, remove multiple members with separate calls:

```redis
VREM products product:1
# (integer) 1
VREM products product:3
# (integer) 1
```

## Workflow Diagram

```mermaid
flowchart TD
    A[VREM key element] --> B{Element exists?}
    B -- Yes --> C[Remove vector data]
    C --> D[Remove JSON attribute if set]
    D --> E[Update HNSW graph edges]
    E --> F[Return 1]
    F --> G[Element no longer appears in VSIM]
    B -- No --> H[Return 0]
```

## Using VREM in Python

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Setup
for i in range(5):
    vec = [str(i * 0.1 + 0.05 * j) for j in range(4)]
    r.execute_command("VADD", "products", "VALUES", "4", *vec, f"product:{i}")

print("Before:", r.execute_command("VCARD", "products"))  # 5

# Remove a single member
removed = r.execute_command("VREM", "products", "product:2")
print(f"Removed: {removed}")  # 1

# Remove multiple members one at a time
for member in ["product:0", "product:4"]:
    removed = r.execute_command("VREM", "products", member)
    print(f"Removed {member}: {removed}")

print("After:", r.execute_command("VCARD", "products"))  # 2
```

## Using VREM in Node.js

```javascript
const Redis = require("ioredis");
const redis = new Redis();

async function removeVector(key, member) {
  return redis.call("VREM", key, member);
}

// Setup
for (let i = 0; i < 5; i++) {
  const vec = [i * 0.1, i * 0.2, i * 0.3, i * 0.4].map(String);
  await redis.call("VADD", "products", "VALUES", "4", ...vec, `product:${i}`);
}

// Remove multiple members one at a time
for (const member of ["product:1", "product:3"]) {
  const removed = await removeVector("products", member);
  console.log(`Removed ${member}: ${removed}`);  // 1
}

const remaining = await redis.call("VCARD", "products");
console.log(`Remaining: ${remaining}`);  // 3
```

## Batch Deletion Pattern

For large-scale removals, chunk the deletes to avoid blocking Redis:

```python
def batch_remove(r, key, members, batch_size=500):
    total_removed = 0
    for i in range(0, len(members), batch_size):
        batch = members[i:i + batch_size]
        pipe = r.pipeline()
        for member in batch:
            pipe.execute_command("VREM", key, member)
        results = pipe.execute()
        removed = sum(results)
        total_removed += removed
        print(f"Batch {i // batch_size + 1}: removed {removed}")
    return total_removed

# Remove 2000 discontinued products
discontinued = [f"product:{i}" for i in range(2000)]
batch_remove(r, "products", discontinued)
```

## Update Pattern: Replace a Vector

To update a vector (e.g. re-encode a document with a new embedding model), remove and re-add:

```python
def update_vector(r, key, member, new_vector, new_attrs=None):
    r.execute_command("VREM", key, member)
    vec_args = [str(v) for v in new_vector]
    cmd = ["VADD", key, "VALUES", str(len(new_vector))]
    cmd += vec_args + [member]
    if new_attrs:
        import json
        cmd += ["SETATTR", json.dumps(new_attrs)]
    r.execute_command(*cmd)
```

Alternatively, calling `VADD` on an existing member updates its vector in place without needing `VREM` first.

## Verifying Removal from Search Results

```python
# Confirm removed member no longer appears in results
query_vec = ["0.8", "0.2", "0.6", "0.4"]
results = r.execute_command("VSIM", "products", "VALUES", "4", *query_vec, "COUNT", 10)
assert "product:2" not in results, "Deleted member still appearing in search!"
print("Removal verified -- deleted member not in search results")
```

## Removing Non-Existent Members

```redis
VREM products nonexistent_member
# (integer) 0
```

No error is returned. The count reflects only the members that actually existed.

## Handling VREM in a Deletion Sync Pipeline

When syncing deletes from a primary database:

```python
def sync_deletes(r, key, deleted_ids):
    # Group by batch for efficiency
    pipe = r.pipeline()
    for doc_id in deleted_ids:
        member = f"doc:{doc_id}"
        pipe.execute_command("VREM", key, member)
    results = pipe.execute()
    removed_count = sum(results)
    print(f"Synced {removed_count} deletions to vector set '{key}'")
```

## Summary

`VREM` removes a single member from a Redis vector set, cleaning up its vector data, attributes, and HNSW graph edges. It returns `1` if the member was removed, or `0` if it did not exist (without error). Use pipelines with batch processing for large-scale deletions, and either `VREM` + `VADD` or a direct `VADD` for updates. After removal, the member is immediately excluded from all subsequent `VSIM` search results.
