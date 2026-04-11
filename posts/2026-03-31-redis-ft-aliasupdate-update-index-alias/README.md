# How to Use FT.ALIASUPDATE in Redis to Update Index Aliases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search

Description: Learn how to use FT.ALIASUPDATE in Redis to atomically reassign an existing search index alias to a new index for zero-downtime migrations.

---

`FT.ALIASUPDATE` reassigns an existing alias to a different RediSearch index in a single atomic operation. Unlike `FT.ALIASDEL` followed by `FT.ALIASADD`, this command guarantees no gap where the alias is undefined - making it the correct tool for zero-downtime index swaps.

## Syntax

```text
FT.ALIASUPDATE <alias> <index>
```

- `alias`: an existing alias name to reassign
- `index`: the new target index to point the alias at

## Key Difference from FT.ALIASADD

| Command | Behavior |
|---|---|
| `FT.ALIASADD` | Creates a new alias - fails if alias already exists |
| `FT.ALIASUPDATE` | Reassigns an existing alias - works whether alias exists or not |

`FT.ALIASUPDATE` behaves like an upsert: it creates the alias if it does not exist, and updates it if it does.

## Zero-Downtime Index Migration

This is the primary use case for `FT.ALIASUPDATE`. Build the new index while the old one serves traffic, then atomically switch:

```bash
# Step 1: Application queries go to the alias "catalog"
FT.ALIASADD catalog products_v1

# Step 2: Build new index with updated schema (background process)
FT.CREATE products_v2
  ON HASH
  PREFIX 1 product:
  SCHEMA name TEXT WEIGHT 5.0 price NUMERIC brand TAG category TAG

# Step 3: Populate and verify products_v2
FT.INFO products_v2
# Check "num_docs" matches expectations

# Step 4: Atomically swap - zero downtime
FT.ALIASUPDATE catalog products_v2

# Step 5: Clean up the old index
FT.DROPINDEX products_v1
```

During step 4, any queries against `catalog` shift immediately to `products_v2`. There is no window where the alias is missing.

## Python Example

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

def swap_index_alias(alias: str, new_index: str):
    """Atomically switch an alias to a new index."""
    try:
        r.execute_command("FT.ALIASUPDATE", alias, new_index)
        print(f"Alias '{alias}' now points to '{new_index}'")
    except redis.ResponseError as e:
        print(f"Failed to update alias: {e}")
        raise

# Usage
swap_index_alias("catalog", "products_v2")

# Verify
results = r.execute_command("FT.SEARCH", "catalog", "*", "LIMIT", "0", "1")
print(f"Catalog now returns {results[0]} documents")
```

## Verifying the Alias Target

After updating, confirm which index the alias resolves to:

```bash
FT.INFO catalog
```

Look for the `index_name` field in the output, which will show the underlying index name.

## Error Cases

If the new target index does not exist:

```text
(error) ERR Unknown index name
```

Always ensure the new index is fully built and populated before calling `FT.ALIASUPDATE`.

## Alias Management Workflow

```bash
# List all indexes (does not list aliases)
FT._LIST

# Create initial alias
FT.ALIASADD search_alias idx_v1

# Switch to new index
FT.ALIASUPDATE search_alias idx_v2

# Remove alias when no longer needed
FT.ALIASDEL search_alias
```

## Summary

`FT.ALIASUPDATE` is the safest way to migrate between RediSearch index versions in production. It atomically reassigns an alias in a single command, ensuring no downtime or gaps in service during index rebuilds. Always prefer `FT.ALIASUPDATE` over the delete-then-add pattern when swapping indexes that are actively being queried.
