# How to Use JSON_STORAGE_SIZE() and JSON_STORAGE_FREE() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Storage

Description: Learn how MySQL's JSON_STORAGE_SIZE() and JSON_STORAGE_FREE() functions help you measure JSON document size and track wasted space after partial updates.

---

## Overview

MySQL stores JSON documents in an optimized binary format. Two functions help you understand storage characteristics:

- `JSON_STORAGE_SIZE(json_val)` - returns the number of bytes used to store a JSON document
- `JSON_STORAGE_FREE(json_val)` - returns the number of bytes freed (wasted) in a JSON column after an in-place partial update

Both functions accept a JSON value or a JSON column reference and return an integer byte count.

## JSON_STORAGE_SIZE()

This function reports how many bytes the binary representation of a JSON document occupies:

```sql
SELECT JSON_STORAGE_SIZE('{"name": "Alice", "age": 30}');
-- Result: 40

SELECT JSON_STORAGE_SIZE('[]');
-- Result: 2

SELECT JSON_STORAGE_SIZE(NULL);
-- Result: NULL
```

Comparing sizes of different documents:

```sql
SELECT
  JSON_STORAGE_SIZE('{"a": 1}') AS small_doc,
  JSON_STORAGE_SIZE('{"name": "Alice", "email": "alice@example.com", "roles": ["admin", "user"]}') AS large_doc;
```

## Measuring Column Storage

Apply `JSON_STORAGE_SIZE()` directly to a column:

```sql
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON
);

INSERT INTO documents (data) VALUES
  ('{"title": "Article One", "tags": ["mysql", "json"]}'),
  ('{"title": "Article Two", "body": "A much longer body text here..."}');

SELECT
  id,
  JSON_STORAGE_SIZE(data) AS bytes_used
FROM documents;
```

This is useful for auditing column sizes or enforcing document size limits.

## JSON_STORAGE_FREE()

When MySQL performs an in-place partial update of a JSON column (via `JSON_SET()`, `JSON_REPLACE()`, or `JSON_REMOVE()`), it may leave gaps in the binary representation if the new value is smaller. `JSON_STORAGE_FREE()` reports how many bytes are wasted:

```sql
-- Simulate an in-place update by replacing a value with a shorter one
UPDATE documents SET data = JSON_SET(data, '$.title', 'A1') WHERE id = 1;

SELECT JSON_STORAGE_FREE(data) AS wasted_bytes FROM documents WHERE id = 1;
```

## When Storage Free Is Non-Zero

Storage becomes fragmented when you replace a value with a shorter one in-place:

```sql
CREATE TABLE test_json (id INT PRIMARY KEY, doc JSON);
INSERT INTO test_json VALUES (1, '{"value": "this is a long string"}');

-- Replace with a shorter string - may create free space
UPDATE test_json
SET doc = JSON_SET(doc, '$.value', 'short')
WHERE id = 1;

SELECT
  JSON_STORAGE_SIZE(doc) AS total_size,
  JSON_STORAGE_FREE(doc) AS free_bytes
FROM test_json WHERE id = 1;
```

Note: `JSON_STORAGE_FREE()` is only meaningful for columns stored in InnoDB and only reflects in-place update gaps. For full rewrites, free space is 0.

## Reclaiming Wasted Space

To reclaim fragmented space, re-insert the document or use `OPTIMIZE TABLE`:

```sql
-- Force a full rewrite by re-assigning the column value
UPDATE test_json
SET doc = CAST(doc AS JSON)
WHERE id = 1;
```

Or periodically run:

```sql
OPTIMIZE TABLE test_json;
```

## Practical Size Audit Query

```sql
SELECT
  id,
  JSON_STORAGE_SIZE(data) AS stored_bytes,
  JSON_STORAGE_FREE(data) AS wasted_bytes,
  ROUND(JSON_STORAGE_FREE(data) / JSON_STORAGE_SIZE(data) * 100, 1) AS waste_pct
FROM documents
WHERE JSON_STORAGE_FREE(data) > 0
ORDER BY wasted_bytes DESC;
```

## Summary

`JSON_STORAGE_SIZE()` lets you measure how much binary space a JSON document occupies, while `JSON_STORAGE_FREE()` exposes wasted space from in-place partial updates. Together they help you monitor JSON storage efficiency and decide when to defragment documents for optimal performance.
