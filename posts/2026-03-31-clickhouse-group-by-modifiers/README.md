# How to Use GROUP BY in ClickHouse with Modifiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, GROUP BY, Aggregation

Description: Learn GROUP BY in ClickHouse including WITH ROLLUP, WITH CUBE, WITH TOTALS, GROUP BY ALL, and GROUPING SETS for multi-level aggregation.

---

ClickHouse extends the standard SQL `GROUP BY` clause with powerful modifiers that let you compute subtotals, cross-tabulations, and grand totals in a single query pass. Whether you need simple aggregations or complex reporting hierarchies, understanding these modifiers will save you from writing multiple queries and unioning results. This post covers all GROUP BY variants with examples.

## Basic GROUP BY

The standard GROUP BY groups rows sharing the same values and applies aggregate functions to each group.

```sql
SELECT
    event_type,
    count()        AS event_count,
    sum(value)     AS total_value,
    avg(value)     AS avg_value
FROM events
GROUP BY event_type;
```

You can group by multiple columns.

```sql
SELECT
    toDate(created_at) AS event_date,
    event_type,
    count()            AS cnt
FROM events
GROUP BY event_date, event_type
ORDER BY event_date, event_type;
```

## GROUP BY ALL

`GROUP BY ALL` automatically groups by every non-aggregate column in the SELECT list. This is a convenience shorthand.

```sql
-- Equivalent to GROUP BY event_date, event_type
SELECT
    toDate(created_at) AS event_date,
    event_type,
    count() AS cnt
FROM events
GROUP BY ALL
ORDER BY event_date;
```

## WITH TOTALS

`WITH TOTALS` appends an extra row to the result containing the grand aggregate values computed across all rows. In that row, the GROUP BY key columns are filled with default values (0 for numbers, empty string for strings), while the aggregate columns contain the totals.

```sql
SELECT
    event_type,
    count()    AS cnt,
    sum(value) AS total_value
FROM events
GROUP BY event_type
WITH TOTALS
ORDER BY cnt DESC;
```

The last row in the result will have `event_type = ''` (empty string) and the grand totals for `cnt` and `total_value`.

## WITH ROLLUP

`WITH ROLLUP` generates subtotals for each prefix of the GROUP BY key list, plus the grand total. It is useful for hierarchical reporting.

```sql
SELECT
    toYear(created_at)  AS yr,
    toMonth(created_at) AS mo,
    event_type,
    sum(value)          AS revenue
FROM events
GROUP BY yr, mo, event_type
WITH ROLLUP
ORDER BY yr, mo, event_type;
```

This produces rows for:
- Each (yr, mo, event_type) combination
- Each (yr, mo) subtotal - event_type filled with its default value (empty string)
- Each (yr) subtotal - mo and event_type filled with default values
- Grand total - all three filled with default values

By default, rolled-up key columns contain default values (0 for numbers, empty string for strings). Set `group_by_use_nulls = 1` if you want ClickHouse to use NULL in those positions instead.

### Using grouping() to Detect Subtotal Rows

```sql
SELECT
    if(grouping(yr) = 1, 'ALL', toString(yr))           AS year_label,
    if(grouping(mo) = 1, 'ALL', toString(mo))           AS month_label,
    if(grouping(event_type) = 1, 'ALL', event_type)     AS type_label,
    sum(value) AS revenue
FROM events
GROUP BY
    toYear(created_at)  AS yr,
    toMonth(created_at) AS mo,
    event_type
WITH ROLLUP
ORDER BY yr, mo, event_type;
```

## WITH CUBE

`WITH CUBE` generates subtotals for every possible combination (power set) of the GROUP BY columns. It is more exhaustive than ROLLUP.

```sql
SELECT
    event_type,
    toDate(created_at) AS event_date,
    count()            AS cnt,
    sum(value)         AS total_value
FROM events
GROUP BY event_type, event_date
WITH CUBE
ORDER BY event_type, event_date;
```

This produces rows for:
- Each (event_type, event_date) combination
- Each event_type with event_date filled with its default value
- Each event_date with event_type filled with its default value
- Grand total with both filled with default values

## GROUPING SETS

`GROUPING SETS` lets you specify exactly which grouping combinations you want, without computing the full cube or rollup.

```sql
SELECT
    event_type,
    toDate(created_at) AS event_date,
    user_id,
    sum(value)         AS total_value
FROM events
GROUP BY GROUPING SETS (
    (event_type, event_date),
    (event_type),
    ()
)
ORDER BY event_type, event_date;
```

This is more efficient than CUBE when you only need a subset of combinations.

## Combining Modifiers with HAVING

All GROUP BY modifiers work with HAVING to filter groups after aggregation.

```sql
SELECT
    event_type,
    toDate(created_at) AS event_date,
    sum(value)         AS revenue
FROM events
GROUP BY event_type, event_date
WITH ROLLUP
HAVING revenue > 1000
ORDER BY event_type, event_date;
```

## Summary

ClickHouse's GROUP BY modifiers - WITH ROLLUP, WITH CUBE, WITH TOTALS, and GROUPING SETS - let you compute multi-level aggregations in a single query rather than issuing multiple queries and combining results. Use ROLLUP for hierarchical reports, CUBE for cross-tabulations, TOTALS for grand totals, and GROUPING SETS when you need precise control over which combinations are computed.
