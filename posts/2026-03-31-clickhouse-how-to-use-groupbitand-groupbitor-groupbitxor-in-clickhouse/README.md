# How to Use groupBitAnd(), groupBitOr(), groupBitXor() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Bitwise Aggregation, SQL, Analytics

Description: Learn how to use groupBitAnd, groupBitOr, and groupBitXor aggregate functions in ClickHouse to perform bitwise operations across rows.

---

## Overview

ClickHouse provides three aggregate functions for bitwise operations across rows of integer data: `groupBitAnd()`, `groupBitOr()`, and `groupBitXor()`. These are useful for flag aggregation, permission checks, and statistical bit-level analysis.

## groupBitOr() - Collecting Flags

`groupBitOr()` returns the bitwise OR of all values in a group. If rows represent individual feature flags, the OR tells you which flags are set by at least one row.

```sql
SELECT
    user_id,
    groupBitOr(permissions) AS combined_permissions
FROM user_permissions
GROUP BY user_id;
```

Each bit in the result is `1` if any row in the group has that bit set.

## groupBitAnd() - Finding Common Flags

`groupBitAnd()` returns the bitwise AND across all values. It tells you which bits are set in every row of the group.

```sql
SELECT
    team_id,
    groupBitAnd(feature_flags) AS common_features
FROM team_members
GROUP BY team_id;
```

This is useful when you need to find capabilities or flags that all members of a group share.

## groupBitXor() - Detecting Changes

`groupBitXor()` returns the bitwise XOR of all values. It is useful for detecting whether a bit has been toggled an odd number of times.

```sql
SELECT
    session_id,
    groupBitXor(event_flags) AS toggle_state
FROM session_events
GROUP BY session_id;
```

If a flag appears in an even number of rows, it cancels out to 0. If odd, it remains 1.

## Practical Example: Permission Aggregation

Consider a scenario where users can have multiple roles, each with a bitmask of permissions:

```sql
CREATE TABLE role_permissions (
    user_id UInt32,
    role    String,
    perms   UInt8
) ENGINE = MergeTree()
ORDER BY user_id;

INSERT INTO role_permissions VALUES
    (1, 'admin',  0b1111),
    (1, 'viewer', 0b0001),
    (2, 'editor', 0b0110),
    (2, 'viewer', 0b0001);

SELECT
    user_id,
    bin(groupBitOr(perms))  AS all_permissions,
    bin(groupBitAnd(perms)) AS shared_permissions
FROM role_permissions
GROUP BY user_id;
```

```text
user_id | all_permissions | shared_permissions
1       | 00001111        | 00000001
2       | 00000111        | 00000000
```

## Combining with bitTest()

You can use `bitTest()` to decode individual bits from the aggregated result:

```sql
SELECT
    user_id,
    bitTest(groupBitOr(perms), 0) AS can_read,
    bitTest(groupBitOr(perms), 1) AS can_write,
    bitTest(groupBitOr(perms), 2) AS can_delete
FROM role_permissions
GROUP BY user_id;
```

## Performance Notes

- All three functions work on integer types: `UInt8`, `UInt16`, `UInt32`, `UInt64`, `Int8` through `Int64`.
- They are streaming aggregates and do not require sorting.
- They can be used with `-If`, `-Array`, and other combinators.

```sql
-- Only aggregate rows where active = 1
SELECT groupBitOrIf(perms, active = 1) FROM role_permissions;
```

## Summary

`groupBitAnd()`, `groupBitOr()`, and `groupBitXor()` enable efficient bitwise aggregation directly in SQL queries. `groupBitOr` collects any set flag, `groupBitAnd` finds universally set flags, and `groupBitXor` detects odd-count toggles. Combined with `bitTest()` and combinators, they cover a broad range of flag and permission analysis use cases in ClickHouse.
