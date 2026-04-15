# How to Use mapKeys() and mapValues() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Array, Data Transformation

Description: Learn how mapKeys() and mapValues() extract arrays of keys and values from Map columns in ClickHouse, enabling array-based processing of map data.

---

When working with Map columns in ClickHouse, you often need to iterate over all entries rather than access a single key by name. The `mapKeys()` and `mapValues()` functions solve this by converting the keys or values of a Map into plain Arrays, which you can then process using ClickHouse's rich array function library. This pattern is central to many aggregation and transformation workflows involving semi-structured data.

## Function Signatures

Both functions accept a single Map argument and return an Array.

```text
mapKeys(map)    -- returns Array of keys
mapValues(map)  -- returns Array of values
```

The returned array types match the key type and value type of the input map respectively.

## Basic Usage

Start with a simple inline map to see what these functions return. This is the fastest way to verify behavior before applying them to table data.

```sql
SELECT
    mapKeys(map('a', 1, 'b', 2, 'c', 3))   AS keys,
    mapValues(map('a', 1, 'b', 2, 'c', 3)) AS values;
```

The result is two arrays: `['a', 'b', 'c']` and `[1, 2, 3]`.

## Setting Up a Sample Table

Create a table that records per-user feature flag states as a Map, which is a common pattern in product analytics systems.

```sql
CREATE TABLE user_feature_flags
(
    user_id  UInt64,
    flags    Map(String, UInt8)
)
ENGINE = MergeTree
ORDER BY user_id;

INSERT INTO user_feature_flags VALUES
(1001, map('dark_mode', 1, 'beta_dashboard', 0, 'new_checkout', 1)),
(1002, map('dark_mode', 0, 'beta_dashboard', 1, 'new_checkout', 1, 'early_access', 1)),
(1003, map('dark_mode', 1, 'new_checkout', 0)),
(1004, map('dark_mode', 0, 'beta_dashboard', 0));
```

## Extracting Keys and Values as Arrays

Retrieve both keys and values for each user to inspect the full structure of each row's map.

```sql
SELECT
    user_id,
    mapKeys(flags)   AS flag_names,
    mapValues(flags) AS flag_states
FROM user_feature_flags;
```

## Counting Active Flags per User

Because `mapValues()` returns an Array, you can pass it directly to array aggregate functions. Use `arraySum()` to count how many flags are enabled (value = 1) per user.

```sql
SELECT
    user_id,
    arraySum(mapValues(flags))              AS active_flag_count,
    length(mapKeys(flags))                  AS total_flag_count
FROM user_feature_flags
ORDER BY active_flag_count DESC;
```

## Checking Which Flags a User Has Defined

Use `has()` on the array returned by `mapKeys()` to check whether a specific key is defined for a user. This is equivalent to `mapContains()` but shows the array-based pattern.

```sql
SELECT
    user_id,
    has(mapKeys(flags), 'dark_mode')      AS has_dark_mode,
    has(mapKeys(flags), 'early_access')   AS has_early_access
FROM user_feature_flags;
```

## Finding All Distinct Keys Across All Rows

To discover every key ever used across all map rows, use `arrayJoin()` on `mapKeys()` combined with `DISTINCT`. This is useful for schema discovery on semi-structured data.

```sql
SELECT DISTINCT arrayJoin(mapKeys(flags)) AS known_flag_name
FROM user_feature_flags
ORDER BY known_flag_name;
```

## Aggregating Value Totals per Key

To compute per-key statistics across all users, you need to expand each map into rows while keeping keys and values aligned. A common mistake is using two separate `arrayJoin()` calls in the same SELECT, which produces a Cartesian product instead of paired rows:

```sql
-- INCORRECT: produces a Cartesian product of keys × values
SELECT
    flag_name,
    sum(flag_value)    AS enabled_count,
    count()            AS total_users
FROM (
    SELECT
        user_id,
        arrayJoin(mapKeys(flags))   AS flag_name,
        arrayJoin(mapValues(flags)) AS flag_value
    FROM user_feature_flags
)
GROUP BY flag_name
ORDER BY enabled_count DESC;
```

The correct approach is to use `ARRAY JOIN` with `arrayZip()` to keep keys and values paired:

```sql
SELECT
    flag_name,
    sum(flag_value)  AS enabled_count,
    count()          AS total_users
FROM (
    SELECT
        user_id,
        arr.1 AS flag_name,
        arr.2 AS flag_value
    FROM user_feature_flags
    ARRAY JOIN arrayZip(mapKeys(flags), mapValues(flags)) AS arr
)
GROUP BY flag_name
ORDER BY enabled_count DESC;
```

## Sorting Map Values

Since `mapValues()` returns an Array, you can apply `arraySort()` to get a sorted list of values for each row.

```sql
SELECT
    user_id,
    arraySort(mapValues(flags)) AS sorted_flag_values
FROM user_feature_flags;
```

## Converting Map Values to a Comma-Separated String

Use `arrayStringConcat()` on the result of `mapKeys()` to produce a readable summary of all keys present in a map row.

```sql
SELECT
    user_id,
    arrayStringConcat(mapKeys(flags), ', ') AS enabled_flags_summary
FROM user_feature_flags
WHERE flags['dark_mode'] = 1;
```

## Summary

`mapKeys()` and `mapValues()` are the primary tools for converting Map data into Arrays, unlocking the full power of ClickHouse's array function ecosystem. Use `mapKeys()` to inspect or iterate over key names, `mapValues()` to aggregate or transform values, and combine both with `arrayZip()` when you need to process key-value pairs together. These functions are essential for schema discovery, per-key aggregation, and any workflow that needs to treat a Map as a collection rather than a lookup table.
