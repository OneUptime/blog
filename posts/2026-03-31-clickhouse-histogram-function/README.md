# How to Use histogram() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Histogram, Distribution

Description: Build adaptive histograms over numeric columns in ClickHouse using the histogram() aggregate function and interpret its (lower, upper, height) bucket output.

---

Understanding the distribution of a numeric column - latency, order size, sensor readings - usually requires binning. ClickHouse's `histogram()` function does this in a single aggregation pass using an adaptive algorithm that places bucket boundaries where the data density changes most, producing a more informative picture than fixed-width bins.

## Syntax

```sql
histogram(N)(column)
```

- `N` - the target number of buckets (actual count may be slightly different due to the adaptive algorithm).
- `column` - a numeric expression.

The return type is `Array(Tuple(Float64, Float64, Float64))`. Each tuple is `(lower, upper, height)` where `height` is the approximate number of values that fell in that bucket.

## Basic Example

```sql
SELECT histogram(5)(number) AS h
FROM numbers(100);
```

```text
h
[(0,19.8,20),(19.8,39.6,20),(39.6,59.4,20),(59.4,79.2,20),(79.2,99,20)]
```

## Practical Table Example

```sql
CREATE TABLE orders
(
    order_id   UInt32,
    amount     Float64,
    created_at DateTime
)
ENGINE = MergeTree()
ORDER BY order_id;

INSERT INTO orders
SELECT
    number,
    10 + (rand() % 490),
    now() - (rand() % 86400)
FROM numbers(10000);
```

```sql
SELECT histogram(10)(amount) AS buckets
FROM orders;
```

## Unpacking Buckets with ARRAY JOIN

`ARRAY JOIN` turns each tuple in the array into a separate row, making the histogram easy to read and filter. Alias the element and access the tuple fields by position with `.1`, `.2`, `.3`:

```sql
SELECT
    round(bucket.1, 2) AS bucket_start,
    round(bucket.2, 2) AS bucket_end,
    round(bucket.3)    AS count
FROM (
    SELECT histogram(10)(amount) AS h
    FROM orders
)
ARRAY JOIN h AS bucket
ORDER BY bucket_start;
```

```text
bucket_start | bucket_end | count
-------------|------------|------
10.00        | 58.70      | 974
58.70        | 107.40     | 981
107.40       | 156.10     | 992
...
```

## Rendering an ASCII Bar with sparkBar

Combine `histogram` with `sparkBar` for a fully in-SQL visual distribution. `sparkBar(buckets)(x, y)` expects one row per x-bucket with `y` as the frequency, so we pair a row from `numbers(20)` with the corresponding bucket height:

```sql
WITH (SELECT histogram(20)(amount) FROM orders) AS h
SELECT sparkBar(20)(number + 1, toUInt64(round(h[number + 1].3))) AS distribution
FROM numbers(20);
```

## Filtering and Comparing Groups

```sql
SELECT
    toDate(created_at)                        AS day,
    arrayMap(t -> round(t.3), histogram(8)(amount)) AS bucket_counts
FROM orders
GROUP BY day
ORDER BY day;
```

This returns one histogram array per day, useful for detecting shifts in order-value distribution over time.

## Interpreting the Output

- `lower` and `upper` define the bucket interval `[lower, upper)`.
- `height` is an approximation; for small datasets the values are exact, but for large datasets they reflect the streaming histogram algorithm's estimate.
- The adaptive algorithm concentrates buckets where the data is densest, so bucket widths vary - unlike manual fixed-width bucketing (e.g. `floor((x - min_x) / bucket_width)` with `GROUP BY`).

## Summary

`histogram(N)(column)` computes an adaptive, variable-width histogram in a single pass and returns an array of `(lower, upper, height)` tuples. Use `ARRAY JOIN` to pivot the buckets into rows for readability, and combine with `sparkBar` for inline ASCII visualizations. The adaptive nature of the algorithm makes it especially useful for skewed distributions where fixed-width bins would leave most buckets empty.
