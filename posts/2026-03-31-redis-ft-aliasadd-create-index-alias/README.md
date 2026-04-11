# How to Use FT.ALIASADD in Redis to Create Index Aliases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Search

Description: Learn how to use FT.ALIASADD in Redis to create an alias for a search index, enabling zero-downtime index swaps and stable query targets.

---

`FT.ALIASADD` is a RediSearch command that creates an alias pointing to an existing search index. Aliases let you give an index a stable, logical name that can be reassigned without changing application queries - useful for zero-downtime index rebuilds and blue-green deployments.

## Prerequisites

Ensure the RediSearch module is loaded:

```bash
redis-server --loadmodule /usr/lib/redis/modules/redisearch.so
```

## Syntax

```text
FT.ALIASADD <alias> <index>
```

- `alias`: the alias name to create
- `index`: the target index the alias will point to

## Creating an Index and Adding an Alias

First, create a search index:

```bash
FT.CREATE products_v1
  ON HASH
  PREFIX 1 product:
  SCHEMA name TEXT WEIGHT 5.0 price NUMERIC
```

Now create an alias so your application queries `products` instead of `products_v1`:

```bash
FT.ALIASADD products products_v1
```

Your application can now search using the alias:

```bash
FT.SEARCH products "@name:laptop @price:[500 2000]"
```

## Zero-Downtime Index Rebuild Pattern

When you need to rebuild an index (change schema, reindex data), use aliases to switch without downtime:

```bash
# Step 1: Build the new index version in the background
FT.CREATE products_v2
  ON HASH
  PREFIX 1 product:
  SCHEMA name TEXT WEIGHT 5.0 price NUMERIC brand TAG

# Step 2: Wait for indexing to complete
FT.INFO products_v2

# Step 3: Update the alias to point to the new index
FT.ALIASUPDATE products products_v2

# Step 4: Drop the old index when safe
FT.DROPINDEX products_v1
```

## Python Example

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)

# Create index
r.execute_command(
    "FT.CREATE", "products_v1",
    "ON", "HASH",
    "PREFIX", "1", "product:",
    "SCHEMA", "name", "TEXT", "price", "NUMERIC"
)

# Add alias
r.execute_command("FT.ALIASADD", "products", "products_v1")

# Search via alias
results = r.execute_command("FT.SEARCH", "products", "*")
print(f"Total results: {results[0]}")
```

## Error Cases

If the alias already exists, Redis returns an error:

```text
(error) ERR Alias already exists
```

Use `FT.ALIASUPDATE` instead to reassign an existing alias to a different index.

If the target index does not exist:

```text
(error) ERR Unknown index name
```

## Listing Aliases

Aliases are not listed by `FT._LIST`, which only returns index names. To see the aliases associated with a specific index, use:

```bash
FT.INFO products_v1
```

The output includes an `aliases` field showing all aliases that point to that index.

## Summary

`FT.ALIASADD` lets you attach a human-readable, stable alias to any RediSearch index. This is a foundational building block for zero-downtime index migrations and blue-green deployments, allowing you to swap the underlying index without changing any application query code.
