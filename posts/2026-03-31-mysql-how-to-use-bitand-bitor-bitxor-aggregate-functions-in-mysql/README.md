# How to Use BIT_AND(), BIT_OR(), BIT_XOR() Aggregate Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Bit And, Bit Or, Bit Xor, Aggregate Function, Bitwise

Description: Learn how to use MySQL's BIT_AND(), BIT_OR(), and BIT_XOR() aggregate functions to perform bitwise operations across groups of rows.

---

## Overview

MySQL provides three bitwise aggregate functions that operate on integer values across a group of rows:

- `BIT_AND()` - returns the bitwise AND of all values in the group
- `BIT_OR()` - returns the bitwise OR of all values in the group
- `BIT_XOR()` - returns the bitwise XOR of all values in the group

These are used for combining permission flags, checking if all rows share a flag, and detecting changes in bit patterns across records.

## Basic Syntax

```sql
BIT_AND(expr)   -- bitwise AND of all expr values in the group
BIT_OR(expr)    -- bitwise OR of all expr values in the group
BIT_XOR(expr)   -- bitwise XOR of all expr values in the group
```

All three return a `BIGINT UNSIGNED`. `BIT_AND()` returns `~0` (all bits set) when the group is empty; `BIT_OR()` and `BIT_XOR()` return 0 for empty groups.

## Understanding Bitwise Operations

```sql
-- BIT_AND: result bit is 1 only if ALL rows have that bit set
-- BIT_OR:  result bit is 1 if ANY row has that bit set
-- BIT_XOR: result bit is 1 if an ODD number of rows have that bit set

-- Example with binary values
-- Row 1: 0b1101 = 13
-- Row 2: 0b1011 = 11
-- Row 3: 0b1110 = 14

SELECT BIT_AND(flags), BIT_OR(flags), BIT_XOR(flags)
FROM (
  SELECT 13 AS flags UNION ALL
  SELECT 11 UNION ALL
  SELECT 14
) t;
-- BIT_AND: 1000 = 8  (only bit 3 set in ALL rows)
-- BIT_OR:  1111 = 15 (every bit set in at least one row)
-- BIT_XOR: 1000 = 8  (bit 3 set an odd number of times)
```

## Permission Flags with BIT_OR()

```sql
-- Permission bitmask definitions
-- READ    = 1  (bit 0)
-- WRITE   = 2  (bit 1)
-- EXECUTE = 4  (bit 2)
-- ADMIN   = 8  (bit 3)

CREATE TABLE user_permissions (
  user_id INT,
  resource_id INT,
  permission_mask TINYINT UNSIGNED
);

INSERT INTO user_permissions VALUES
(1, 10, 3),   -- READ + WRITE
(1, 10, 4),   -- EXECUTE
(2, 10, 1),   -- READ
(2, 10, 8);   -- ADMIN

-- Effective permissions per user per resource (union of all grants)
SELECT user_id, resource_id,
  BIT_OR(permission_mask) AS effective_permissions,
  BIN(BIT_OR(permission_mask)) AS binary_rep
FROM user_permissions
GROUP BY user_id, resource_id;
```

## Checking Universal Flags with BIT_AND()

```sql
CREATE TABLE task_status (
  batch_id INT,
  task_id INT,
  flags TINYINT UNSIGNED  -- bit 0 = completed, bit 1 = verified
);

INSERT INTO task_status VALUES
(1, 1, 3),  -- completed AND verified
(1, 2, 3),  -- completed AND verified
(1, 3, 1),  -- completed only (not verified)
(2, 4, 3),  -- completed AND verified
(2, 5, 3);  -- completed AND verified

-- Check if ALL tasks in a batch are completed (bit 0 = 1)
SELECT batch_id,
  BIT_AND(flags) & 1 AS all_completed,
  BIT_AND(flags) & 2 AS all_verified
FROM task_status
GROUP BY batch_id;
-- Batch 1: all_completed=1, all_verified=0 (task 3 not verified)
-- Batch 2: all_completed=1, all_verified=2
```

## Detecting Changes with BIT_XOR()

```sql
-- BIT_XOR is often used as a hash to detect if values changed
-- If XOR of a set of values equals the XOR of the same set
-- in a later snapshot, the set is likely unchanged

CREATE TABLE snapshots (
  snapshot_time DATETIME,
  row_id INT,
  checksum BIGINT
);

INSERT INTO snapshots VALUES
('2024-06-01', 1, 12345),
('2024-06-01', 2, 67890),
('2024-06-02', 1, 12345),
('2024-06-02', 2, 11111);  -- row 2 changed

-- Compare XOR across two snapshots
SELECT snapshot_time, BIT_XOR(checksum) AS xor_hash
FROM snapshots
GROUP BY snapshot_time;
-- Different xor_hash values indicate changes between snapshots
```

## Practical Example: Feature Flag Aggregation

```sql
CREATE TABLE feature_activations (
  experiment_id INT,
  user_id INT,
  active_features INT UNSIGNED  -- bitmask of active features
);

INSERT INTO feature_activations VALUES
(1, 101, 7),   -- features 1, 2, 3
(1, 102, 5),   -- features 1, 3
(1, 103, 6);   -- features 2, 3

-- Features active for ALL users in experiment
SELECT experiment_id,
  BIT_AND(active_features) AS universal_features,
  BIT_OR(active_features)  AS any_feature_seen
FROM feature_activations
GROUP BY experiment_id;
```

## Summary

`BIT_AND()`, `BIT_OR()`, and `BIT_XOR()` are aggregate functions that apply bitwise operations across all rows in a group. Use `BIT_OR()` to accumulate permission flags, `BIT_AND()` to verify that all rows share a flag, and `BIT_XOR()` for change detection and checksums. All three return `BIGINT UNSIGNED` and work seamlessly with `GROUP BY`.
