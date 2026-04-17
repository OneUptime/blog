# How to Use bitmaskToList() and bitmaskToArray() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitmask, bitmaskToList, bitmaskToArray, Bitwise, Integer Encoding

Description: Learn how to use bitmaskToList() and bitmaskToArray() in ClickHouse to decode integer bitmasks into human-readable lists and arrays of set bit positions.

---

Integer bitmasks are a compact way to store multiple boolean flags in a single integer. ClickHouse provides `bitmaskToList()` and `bitmaskToArray()` to decode these bitmasks into readable forms for analysis and reporting.

## bitmaskToList()

`bitmaskToList(n)` returns a comma-separated string listing each power of 2 that contributes to the integer `n`:

```sql
SELECT bitmaskToList(11) AS flags_list;
```

```text
flags_list
----------
1,2,8
```

Because 11 = 1 + 2 + 8, the string shows those three values. This is useful for display and logging.

## bitmaskToArray()

`bitmaskToArray(n)` returns the same information as an Array(UInt64) of bit values:

```sql
SELECT bitmaskToArray(11) AS flags_array;
```

```text
flags_array
-----------
[1, 2, 8]
```

The array form is easier to use in subsequent SQL operations like `has()`, `length()`, or `arrayJoin()`.

## Decoding Permission Flags

Suppose you store user permission bitmasks where each bit represents a permission:

```sql
SELECT
    user_id,
    permissions,
    bitmaskToList(permissions) AS permission_names,
    has(bitmaskToArray(permissions), 4) AS can_write,
    has(bitmaskToArray(permissions), 8) AS can_delete
FROM users
LIMIT 10;
```

## Counting Set Flags

Count how many permissions each user has:

```sql
SELECT
    user_id,
    permissions,
    length(bitmaskToArray(permissions)) AS permission_count
FROM users
ORDER BY permission_count DESC
LIMIT 20;
```

## Filtering Users with Specific Permissions

Find all users who have the "admin" flag (bit position 6, value 64):

```sql
SELECT user_id, permissions
FROM users
WHERE has(bitmaskToArray(permissions), 64);
```

This is equivalent to bitwise AND:

```sql
SELECT user_id, permissions
FROM users
WHERE bitAnd(permissions, 64) > 0;
```

## Expanding Bitmask Flags into Rows

Use `arrayJoin` with `bitmaskToArray` to pivot bitmask flags into individual rows:

```sql
SELECT
    user_id,
    arrayJoin(bitmaskToArray(permissions)) AS individual_permission
FROM users
ORDER BY user_id, individual_permission;
```

## Summary of Differences

| Function | Return Type | Best For |
|----------|------------|---------|
| `bitmaskToList(n)` | String | Display, logging, human-readable output |
| `bitmaskToArray(n)` | Array(UInt64) | SQL operations, filtering, counting |

## Summary

`bitmaskToList()` and `bitmaskToArray()` decode integer bitmasks into their component powers of 2. Use `bitmaskToList()` for human-readable output in reports and `bitmaskToArray()` when you need to apply SQL array functions to the decoded flags. Together they make bitmask-encoded permissions and feature flags easy to analyze in ClickHouse.
