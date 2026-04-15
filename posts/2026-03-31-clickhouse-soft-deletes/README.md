# How to Implement Soft Deletes in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Soft Delete, ReplacingMergeTree, Data Management, Analytics

Description: Learn how to implement soft deletes in ClickHouse using a deletion flag column and ReplacingMergeTree to mark records as deleted without physically removing them.

---

## What Are Soft Deletes?

Soft deletes mark records as logically deleted using a flag column rather than physically removing them from storage. This preserves the audit trail, supports un-delete operations, and avoids the cost of heavy DELETE mutations in ClickHouse.

## Basic Soft Delete with ReplacingMergeTree

Add an is_deleted flag and use ReplacingMergeTree with a version column:

```sql
CREATE TABLE users (
    user_id     UInt64,
    name        String,
    email       String,
    is_deleted  UInt8    DEFAULT 0,
    version     UInt64   DEFAULT 1,
    updated_at  DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;
```

## Marking a Record as Deleted

Insert a new version with is_deleted = 1:

```sql
INSERT INTO users (user_id, name, email, is_deleted, version, updated_at)
VALUES (42, 'Bob', 'bob@example.com', 1, 2, now());
```

## Querying Only Active Records

Filter out soft-deleted rows in all queries:

```sql
SELECT user_id, name, email
FROM users FINAL
WHERE is_deleted = 0;
```

## Using a View to Encapsulate the Filter

Create a view so application queries do not need to remember the filter:

```sql
CREATE VIEW active_users AS
SELECT user_id, name, email, updated_at
FROM users FINAL
WHERE is_deleted = 0;
```

Application queries simply use:

```sql
SELECT * FROM active_users WHERE user_id = 42;
```

## Implementing an Undelete

To restore a soft-deleted record, insert a new version with is_deleted = 0 and a higher version:

```sql
INSERT INTO users (user_id, name, email, is_deleted, version, updated_at)
VALUES (42, 'Bob', 'bob@example.com', 0, 3, now());
```

## Querying Deletion History

Since all versions are kept until merges, you can view the full change history:

```sql
SELECT user_id, is_deleted, version, updated_at
FROM users
WHERE user_id = 42
ORDER BY version;
```

## Combining with TTL for Eventual Physical Removal

Even with soft deletes, you may want to physically remove very old deleted records after a retention period:

```sql
ALTER TABLE users
    MODIFY TTL updated_at + INTERVAL 1 YEAR DELETE
    WHERE is_deleted = 1;
```

This physically removes rows where is_deleted = 1 and updated_at is older than 1 year, reducing storage over time.

## Performance Consideration

FINAL forces synchronous deduplication and can be slow on large tables. For high-throughput reads, consider a materialized view that receives all row versions and lets ReplacingMergeTree handle deduplication in the background:

```sql
CREATE MATERIALIZED VIEW active_users_mv
ENGINE = ReplacingMergeTree(version)
ORDER BY user_id
AS
SELECT *
FROM users;
```

Queries against this materialized view still filter on is_deleted, but background merges reduce the need for FINAL:

```sql
SELECT user_id, name, email
FROM active_users_mv
WHERE is_deleted = 0;
```

## Summary

Soft deletes in ClickHouse are best implemented using a ReplacingMergeTree table with an is_deleted flag and version column. Use views to encapsulate the filter, TTL to schedule eventual physical removal of old deleted records, and materialized views for read-heavy workloads where FINAL's scan cost is unacceptable.
