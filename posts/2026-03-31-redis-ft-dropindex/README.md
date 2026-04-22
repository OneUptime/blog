# How to Use FT.DROPINDEX in Redis to Delete Search Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RediSearch, Index, Search, Operation

Description: Learn how to use FT.DROPINDEX in Redis to delete a RediSearch index, with options to preserve or delete the underlying documents.

---

## Introduction

`FT.DROPINDEX` deletes a RediSearch index and its associated metadata. By default it preserves the underlying data keys (hashes or JSON documents). You can optionally also delete those documents with the `DD` (Delete Documents) flag.

## Basic Syntax

```redis
FT.DROPINDEX index [DD]
```

- `index` - the name of the index to drop
- `DD` - (Delete Documents) also delete all keys that were indexed

## Drop an Index While Keeping Data

```redis
127.0.0.1:6379> FT.DROPINDEX idx:users
OK
```

The index is removed. The `user:*` keys remain intact.

## Verify the Index is Gone

```redis
FT.INFO idx:users
# (error) Unknown Index name
```

## Verify Data Still Exists

```redis
HGET user:1 name
# "Alice Smith"
```

## Drop an Index AND Delete All Indexed Documents

```redis
FT.DROPINDEX idx:users DD
OK
```

All documents that were successfully indexed under this index are now also deleted.

## Verify Documents Are Deleted

```redis
EXISTS user:1
# (integer) 0
```

## Typical Workflow: Drop and Recreate

This pattern is used when you need to change field types or remove fields from the schema:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Redis
    Dev->>Redis: FT.INFO idx:users
    Redis-->>Dev: Current schema (field list)
    Dev->>Redis: FT.DROPINDEX idx:users
    Redis-->>Dev: OK (data preserved)
    Dev->>Redis: FT.CREATE idx:users ON HASH PREFIX 1 user: SCHEMA name TEXT age NUMERIC city TAG email TAG
    Redis-->>Redis: Background re-indexing starts
    Dev->>Redis: FT.INFO idx:users
    Redis-->>Dev: percent_indexed: 0.73 (in progress)
```

## Safe Drop Pattern in Scripts

```bash
#!/bin/bash
INDEX="idx:products"

# Check if index exists before dropping
EXISTS=$(redis-cli FT.INFO "$INDEX" 2>&1 | grep -c "index_name" || true)
if [ "$EXISTS" -gt 0 ]; then
  redis-cli FT.DROPINDEX "$INDEX"
  echo "Index $INDEX dropped"
else
  echo "Index $INDEX does not exist"
fi
```

## Python: Drop and Recreate

```python
import redis
from redis.commands.search.field import TextField, NumericField, TagField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType

r = redis.Redis()

def recreate_index(index_name, fields, prefix):
    try:
        r.ft(index_name).dropindex(delete_documents=False)
        print(f"Dropped existing index: {index_name}")
    except Exception:
        print(f"Index {index_name} did not exist")

    definition = IndexDefinition(prefix=[prefix], index_type=IndexType.HASH)
    r.ft(index_name).create_index(fields, definition=definition)
    print(f"Created index: {index_name}")

recreate_index(
    "idx:users",
    [TextField("name"), NumericField("age", sortable=True), TagField("city"), TagField("email")],
    "user:"
)
```

## DD Flag Warning

```mermaid
flowchart TD
    A["FT.DROPINDEX idx:users DD"] --> B["Delete index metadata\n+ inverted index structures"]
    B --> C["Look up all documents tracked\nas successfully indexed"]
    C --> D["Delete each tracked document\nfrom Redis"]
    D --> E["All indexed user:* data is GONE"]
    style E fill:#ff4444,color:#fff
```

The `DD` flag is destructive. It deletes only documents that were successfully indexed - keys that failed indexation or were not yet indexed (if async indexing was still in progress) are not deleted. Use it only when you intend to remove both the index and the source data.

## Summary

`FT.DROPINDEX index [DD]` removes a RediSearch index and all its internal structures. Without `DD`, the underlying data keys are preserved. With `DD`, all documents that were indexed are also deleted. Use it before recreating an index with a changed schema, or when decommissioning a search feature entirely.
