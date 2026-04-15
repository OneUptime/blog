# How to Use arrayJoin for Row Explosion in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, arrayJoin, Array, Row Explosion, SQL, Analytics

Description: Learn how to use the arrayJoin function in ClickHouse to explode array columns into individual rows for flattened analytical queries.

---

`arrayJoin` is one of ClickHouse's most useful functions for working with array data. It converts a single row with an array column into multiple rows - one per array element - enabling standard aggregations on nested data.

## Basic arrayJoin Usage

Given a table where each user has multiple tags:

```sql
CREATE TABLE user_events (
    user_id UInt64,
    tags Array(String),
    timestamp DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, timestamp);

INSERT INTO user_events VALUES
    (1, ['sports', 'music', 'tech'], now()),
    (2, ['food', 'travel'], now()),
    (3, ['tech', 'gaming'], now());
```

Explode tags into individual rows:

```sql
SELECT user_id, arrayJoin(tags) AS tag
FROM user_events;
```

Output:

```text
user_id | tag
--------|-------
1       | sports
1       | music
1       | tech
2       | food
2       | travel
3       | tech
3       | gaming
```

## Counting Tag Frequency

After explosion, you can aggregate normally:

```sql
SELECT
    arrayJoin(tags) AS tag,
    count() AS user_count
FROM user_events
GROUP BY tag
ORDER BY user_count DESC;
```

## Exploding Arrays with Indexes

Use `arrayEnumerate` to get position alongside value:

```sql
SELECT
    user_id,
    arrayJoin(arrayEnumerate(tags)) AS position,
    tags[position] AS tag
FROM user_events;
```

Or use the `ARRAY JOIN` clause which is the SQL-style equivalent:

```sql
SELECT user_id, tag
FROM user_events
ARRAY JOIN tags AS tag;
```

## Multiple Array Columns

Explode multiple arrays simultaneously with ARRAY JOIN:

```sql
CREATE TABLE product_orders (
    order_id String,
    products Array(String),
    quantities Array(UInt32)
) ENGINE = MergeTree()
ORDER BY order_id;

SELECT
    order_id,
    product,
    quantity
FROM product_orders
ARRAY JOIN
    products AS product,
    quantities AS quantity;
```

This zips the arrays - the first elements go together, second elements go together, etc.

## LEFT ARRAY JOIN for Null-Safe Expansion

`LEFT ARRAY JOIN` keeps rows with empty arrays (using NULL for the exploded value):

```sql
SELECT user_id, tag
FROM user_events
LEFT ARRAY JOIN tags AS tag;
```

Rows with `tags = []` still appear with `tag` set to the default value for the element type (e.g., `''` for `String`, `0` for integers, `NULL` for `Nullable` types).

## Using arrayJoin in Subqueries

Combine arrayJoin with window functions for advanced analytics:

```sql
SELECT
    tag,
    count() AS occurrences,
    uniq(user_id) AS unique_users,
    round(count() / sum(count()) OVER (), 4) AS frequency
FROM (
    SELECT user_id, arrayJoin(tags) AS tag
    FROM user_events
)
GROUP BY tag
ORDER BY occurrences DESC;
```

## Performance Considerations

```text
- arrayJoin increases row count - be careful with large arrays on big tables
- Filter before explosion when possible to reduce intermediate row count
- For arrays of fixed-size tuples, consider Nested data type instead
```

## Summary

`arrayJoin` and `ARRAY JOIN` are essential ClickHouse tools for flattening array columns into rows. They enable standard SQL aggregations on nested data structures, making it easy to analyze tags, labels, events, and other multi-valued fields without complex unnesting logic.
