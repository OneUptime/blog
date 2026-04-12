# How to Write a Script to Clean Up Unused Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Index, Performance, Cleanup

Description: Learn how to write a script that identifies and safely drops unused MongoDB indexes using $indexStats, with a dry-run mode and confirmation step before deletion.

---

## Overview

Unused indexes consume RAM in the WiredTiger cache and slow down write operations without providing any read benefit. This script identifies indexes with zero usage since the last `mongod` restart and drops them with a dry-run mode for safe review before deletion.

## How the Script Works

```text
1. Iterate all collections in the database
2. Run $indexStats on each collection
3. Collect indexes with accesses.ops == 0 (excluding _id indexes)
4. In dry-run mode: print candidates without dropping
5. In execute mode: drop each candidate and report results
```

## Python Cleanup Script

```python
#!/usr/bin/env python3
import os
import sys
from pymongo import MongoClient
from datetime import datetime, timezone

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
TARGET_DB = os.environ.get("MONGO_DB", "myapp")
DRY_RUN = "--execute" not in sys.argv  # Dry-run by default

client = MongoClient(MONGO_URI)
db = client[TARGET_DB]

PROTECTED_INDEXES = {"_id_"}  # Never drop these

def find_unused_indexes():
    unused = []
    collections = db.list_collection_names()

    for coll_name in sorted(collections):
        collection = db[coll_name]
        try:
            stats = list(collection.aggregate([{"$indexStats": {}}]))
        except Exception as e:
            print(f"  Skipping {coll_name}: {e}")
            continue

        for stat in stats:
            name = stat["name"]
            ops = stat["accesses"]["ops"]
            since = stat["accesses"]["since"]

            if name in PROTECTED_INDEXES:
                continue

            if ops == 0:
                unused.append({
                    "collection": coll_name,
                    "index_name": name,
                    "key": stat["key"],
                    "ops": ops,
                    "since": since
                })

    return unused

def drop_index(coll_name, index_name):
    collection = db[coll_name]
    try:
        collection.drop_index(index_name)
        return True
    except Exception as e:
        print(f"  ERROR dropping {coll_name}.{index_name}: {e}")
        return False

if __name__ == "__main__":
    mode = "DRY RUN (use --execute to apply)" if DRY_RUN else "EXECUTE MODE"
    print(f"=== MongoDB Index Cleanup ({mode}) ===")
    print(f"Database: {TARGET_DB} | {datetime.now(timezone.utc).isoformat()}\n")

    unused = find_unused_indexes()

    if not unused:
        print("No unused indexes found.")
        sys.exit(0)

    print(f"Found {len(unused)} unused index(es):\n")
    for item in unused:
        print(f"  {item['collection']}.{item['index_name']}")
        print(f"    Key: {item['key']}")
        print(f"    Ops since {item['since']}: {item['ops']}")
        print()

    if DRY_RUN:
        print("Dry run complete. No indexes were dropped.")
        print("Review the list above, then run with --execute to drop them.")
    else:
        print("Dropping unused indexes...")
        dropped = 0
        failed = 0
        for item in unused:
            success = drop_index(item["collection"], item["index_name"])
            if success:
                print(f"  DROPPED: {item['collection']}.{item['index_name']}")
                dropped += 1
            else:
                failed += 1

        print(f"\nDone: {dropped} dropped, {failed} failed")
```

## Running in Dry-Run Mode

```bash
python3 clean_indexes.py
```

Sample output:

```text
=== MongoDB Index Cleanup (DRY RUN) ===
Database: myapp | 2026-03-31T10:00:00

Found 2 unused index(es):

  orders.status_1
    Key: {'status': 1}
    Ops since 2026-03-01T00:00:00: 0

  users.legacy_username_1
    Key: {'username': 1}
    Ops since 2026-03-01T00:00:00: 0

Dry run complete. No indexes were dropped.
```

## Executing the Cleanup

```bash
python3 clean_indexes.py --execute
```

## Dropping an Index with mongosh

```javascript
// Drop a specific index by name
db.orders.dropIndex("status_1")

// Drop by key pattern
db.orders.dropIndex({ status: 1 })

// List all indexes to confirm
db.orders.getIndexes()
```

## Verifying the Impact After Dropping

Check WiredTiger cache usage before and after dropping indexes:

```javascript
const stats = db.serverStatus().wiredTiger.cache;
print("Cache used: " + (stats["bytes currently in the cache"] / 1024 / 1024).toFixed(1) + " MB");
print("Cache size: " + (stats["maximum bytes configured"] / 1024 / 1024).toFixed(1) + " MB");
```

## Best Practices

- Always run in dry-run mode first and review the candidate list with your team before executing.
- Wait at least 7-14 days after a `mongod` restart before running cleanup - `$indexStats` resets on restart and short-lived traffic patterns may not reflect all real usage.
- Drop indexes during off-peak hours - even unused index removal causes a brief write lock.
- After dropping, monitor write throughput and query performance for 24 hours to confirm no regressions.

## Summary

The index cleanup script uses `$indexStats` to find indexes with zero operations, presents them in a dry-run report for review, and drops confirmed candidates with `--execute`. Always review candidates manually before executing and verify performance improvements after deletion.
