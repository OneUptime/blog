# How to Use Multiple Window Functions in One Query in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics, WINDOW Clause

Description: Combine ranking, running totals, and moving averages in a single SELECT using multiple window functions and the WINDOW clause for reusable window definitions.

---

Real-world analytics queries rarely need just one window function. You might need a rank, a running total, and a moving average all in the same output row. ClickHouse allows you to include as many window functions as needed in a single SELECT statement. When several window functions share the same definition, the WINDOW clause lets you name that definition once and reference it multiple times, keeping the SQL clean and reducing the chance of inconsistency.

## Using Multiple Window Functions Without WINDOW

You can write each OVER() clause inline. This works well when the window definitions differ from one another.

```sql
CREATE TABLE product_sales
(
    sale_date  Date,
    product    String,
    revenue    Float64
)
ENGINE = MergeTree()
ORDER BY (product, sale_date);

INSERT INTO product_sales VALUES
    ('2024-01-01', 'Widget', 500),
    ('2024-01-02', 'Widget', 700),
    ('2024-01-03', 'Widget', 600),
    ('2024-01-04', 'Widget', 900),
    ('2024-01-05', 'Widget', 800),
    ('2024-01-01', 'Gadget', 300),
    ('2024-01-02', 'Gadget', 450),
    ('2024-01-03', 'Gadget', 400),
    ('2024-01-04', 'Gadget', 550),
    ('2024-01-05', 'Gadget', 500);
```

Now compute rank, running total, and 3-day moving average together.

```sql
SELECT
    product,
    sale_date,
    revenue,
    rank() OVER (
        PARTITION BY product
        ORDER BY revenue DESC
    ) AS revenue_rank,
    sum(revenue) OVER (
        PARTITION BY product
        ORDER BY sale_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total,
    round(avg(revenue) OVER (
        PARTITION BY product
        ORDER BY sale_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS moving_avg_3day
FROM product_sales
ORDER BY product, sale_date;
```

Each OVER() clause is independent. The rank uses revenue descending; the running total and moving average use date ascending with different frame sizes.

## Reusing Window Definitions with the WINDOW Clause

When two or more window functions share the same PARTITION BY and ORDER BY, duplicating the definition creates noise and maintenance risk. The WINDOW clause assigns a name to a definition that can be referenced in the SELECT list.

```text
SELECT
    <window_func>() OVER <window_name>,
    ...
FROM <table>
WINDOW <window_name> AS (
    PARTITION BY ...
    ORDER BY ...
)
```

Here is the same query rewritten with a named window.

```sql
SELECT
    product,
    sale_date,
    revenue,
    rank() OVER (
        PARTITION BY product ORDER BY revenue DESC
    )                                               AS revenue_rank,
    sum(revenue) OVER (
        w ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                               AS running_total,
    round(avg(revenue) OVER (
        w ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2)                                           AS moving_avg_3day
FROM product_sales
WINDOW w AS (PARTITION BY product ORDER BY sale_date)
ORDER BY product, sale_date;
```

The PARTITION BY product ORDER BY sale_date is declared once in the WINDOW clause. The running total and moving average reference `w` and extend it with a frame specification. The rank function uses a separate inline OVER clause because it needs a different ORDER BY; you cannot override the ORDER BY of a named window that already defines one.

## Mixing Partition-Level and Row-Level Calculations

Some analytics require both a partition-wide aggregate and a rolling aggregate on the same window. Both can live in the same SELECT.

```sql
SELECT
    product,
    sale_date,
    revenue,
    round(avg(revenue) OVER (
        w ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ), 2)                                AS product_avg_all_time,
    round(avg(revenue) OVER (
        w ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2)                                AS product_avg_3day,
    revenue - avg(revenue) OVER (
        w ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    )                                    AS deviation_from_avg
FROM product_sales
WINDOW w AS (PARTITION BY product ORDER BY sale_date)
ORDER BY product, sale_date;
```

`product_avg_all_time` uses an explicit frame spanning the entire partition with `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. This is necessary because when a window has an ORDER BY clause, the default frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (a cumulative frame), not the entire partition. `product_avg_3day` uses a 3-row frame. `deviation_from_avg` reuses the whole-partition frame inline.

## Ranking and Percentile Together

Combining rank() with a percentile approximation shows both position and relative standing.

```sql
SELECT
    product,
    sale_date,
    revenue,
    rank() OVER w_rev                          AS rev_rank,
    round(
        (rank() OVER w_rev - 1) * 100.0
        / (count() OVER (PARTITION BY product) - 1),
        1
    )                                          AS percentile
FROM product_sales
WINDOW w_rev AS (PARTITION BY product ORDER BY revenue)
ORDER BY product, rev_rank;
```

The percentile is derived from the rank divided by the total count in the partition, giving a 0-100 score without needing a separate percentile function.

## Lead and Lag Alongside a Running Total

lag() and lead() are window functions too. They can share a named window with aggregate window functions.

```sql
SELECT
    product,
    sale_date,
    revenue,
    lag(revenue,  1, 0) OVER w             AS prev_day_revenue,
    lead(revenue, 1, 0) OVER w             AS next_day_revenue,
    sum(revenue) OVER (
        w ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                                      AS running_total,
    revenue - lag(revenue, 1, revenue) OVER w AS day_over_day_change
FROM product_sales
WINDOW w AS (PARTITION BY product ORDER BY sale_date)
ORDER BY product, sale_date;
```

All four window expressions share the same PARTITION BY and ORDER BY through the named window `w`. The `lag()` third argument (default value) means the first row shows 0 for `prev_day_revenue` instead of NULL.

## Using Multiple Named Windows

A query can define several named windows when different window functions genuinely need different partitions or orderings.

```sql
SELECT
    product,
    sale_date,
    revenue,
    rank() OVER w_date_asc    AS chronological_rank,
    rank() OVER w_rev_desc    AS revenue_rank,
    sum(revenue) OVER (
        w_date_asc ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    )                         AS running_total
FROM product_sales
WINDOW
    w_date_asc AS (PARTITION BY product ORDER BY sale_date ASC),
    w_rev_desc AS (PARTITION BY product ORDER BY revenue  DESC)
ORDER BY product, sale_date;
```

Multiple WINDOW definitions are separated by commas after the WINDOW keyword.

## Summary

ClickHouse allows any number of window functions in a single SELECT, each with its own OVER() definition. When two or more functions share the same partition and ordering, the WINDOW clause eliminates repetition and makes the query easier to read and maintain. Named windows can also be extended inside OVER() with frame specifications, giving you flexibility to reuse the same partitioning and ordering while varying the frame. Combining rank, running totals, lag/lead, and moving averages in one pass is both idiomatic ClickHouse SQL and more efficient than running multiple subqueries.
