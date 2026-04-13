# How to Manage Indexes with MongoDB Compass

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, Index, Performance, Database Management

Description: Learn how to create, review, analyze usage statistics, and drop indexes in MongoDB Compass to optimize collection performance.

---

## The Indexes Tab in MongoDB Compass

MongoDB Compass provides a dedicated Indexes tab for each collection that shows all existing indexes, their size, usage statistics, and provides controls to create or drop indexes without writing shell commands.

## Opening the Indexes View

1. Connect to your MongoDB instance in Compass
2. Select your database in the left panel
3. Click your collection name
4. Click the **Indexes** tab

## Reading the Index List

Each index entry in Compass shows:

```text
Name        - index name (e.g., "status_createdAt_1")
Type        - Single Field, Compound, Text, 2dsphere, etc.
Size        - storage size of the index on disk
Usage       - number of times the index has been used by queries (since last restart)
Properties  - Unique, Sparse, Partial, TTL, etc.
```

## Creating an Index

### Simple Single-Field Index

1. Click **Create Index**
2. In the dialog:
   - Enter an Index Name (optional - will be auto-generated)
   - Under "Add a field", choose the field and sort order (1 = Ascending, -1 = Descending)
3. Click **Create Index**

### Compound Index

1. Click **Create Index**
2. Add first field (e.g., `status: 1`)
3. Click **Add another field**
4. Add second field (e.g., `createdAt: -1`)
5. Optionally add more fields
6. Click **Create Index**

Equivalent shell command:
```javascript
db.orders.createIndex({ status: 1, createdAt: -1 }, { name: "status_createdAt_idx" });
```

### Index Options in Compass

```text
Unique      - prevents duplicate values
Sparse      - only indexes documents where the field exists
Partial     - index only documents matching a filter expression
TTL         - auto-delete documents after expiry (for date fields)
Collation   - locale-specific string comparison rules
Wildcard    - index all fields or a sub-tree
Hidden      - index exists but is not used by query planner
```

### Creating a TTL Index

For auto-expiring data like sessions or logs:

1. Select your date field (e.g., `createdAt`)
2. Under **Index Options**, enable **TTL**
3. Set **Expire After Seconds** (e.g., `86400` for 24 hours)
4. Click **Create Index**

```javascript
// Equivalent shell command
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
```

### Creating a Partial Index

Index only documents matching a condition to reduce index size:

```javascript
// In Compass "Partial Filter Expression" field:
{ "status": { "$eq": "active" }, "priority": { "$gte": 5 } }
```

## Analyzing Index Usage Statistics

The **Usage** column shows how many times each index has been used since the mongod process started:

```text
_id_                    - 15,342 uses (always high - used for lookups by _id)
status_createdAt_idx    - 8,921 uses (heavily used - keep it)
email_unique_idx        - 1 use (rarely used - investigate)
old_search_idx          - 0 uses (unused - candidate for removal)
```

### Zero-Use Indexes

Indexes with 0 uses since the last restart are candidates for removal because they:
- Waste disk space
- Slow down write operations (all indexes must be updated on insert/update/delete)
- May cause confusion about query routing

Before dropping, consider:
- Usage is reset on each mongod restart - low usage may just mean a recent restart
- The index might be used in rare but critical queries
- Check the slow query log and application code before removing

## Dropping an Index

1. Hover over the index in the list
2. Click the **trash icon** that appears
3. Confirm the deletion in the dialog

```javascript
// Equivalent shell command
db.orders.dropIndex("status_createdAt_idx");
```

**Warning**: You cannot drop the `_id_` index. Dropping an index with active queries will cause those queries to fall back to COLLSCAN until a replacement is created.

## Hiding an Index (Safe Testing)

Before dropping, hide the index to verify queries don't regress:

1. Hover over the index
2. Click the **eye icon** (or the options menu)
3. Select **Hide Index**

```javascript
// Equivalent shell command
db.orders.hideIndex("old_search_idx");
```

A hidden index is maintained on writes but excluded from query planning. If performance degrades after hiding, unhide it immediately.

## Index Size and Disk Usage

```text
Large indexes consume RAM (indexes are cached in WiredTiger's memory pool)
Rule of thumb: total working set (data + indexes) should fit in RAM

Check index sizes:
db.orders.stats().indexSizes

Typical index sizes:
Single field (string) - 50-200 bytes per document
Compound index        - 100-400 bytes per document
Text index            - much larger, avoid unless needed
```

## Best Practices for Index Management

```text
1. Create indexes to match your most frequent and slowest queries
2. Use compound indexes following the ESR rule (Equality, Sort, Range)
3. Remove unused indexes - they tax every write operation
4. Use the hidden index feature before dropping to test impact
5. Limit total indexes to ~10 per collection - more is rarely better
6. Monitor index sizes to ensure they fit in available RAM
7. Use partial indexes for large collections where only a subset is queried
```

## Summary

MongoDB Compass's Indexes tab provides a complete interface for creating, monitoring, and removing indexes without writing shell commands. Review the Usage column to identify heavily-used and zero-use indexes, use the TTL and Partial options to reduce index overhead, and always hide an index before dropping it in production to safely test the impact on query performance. Keep total indexes per collection small to minimize write amplification and RAM pressure.
