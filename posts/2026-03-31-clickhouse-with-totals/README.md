# How to Use WITH TOTALS in ClickHouse GROUP BY

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, GROUP BY, WITH TOTALS, Aggregation

Description: Add a grand-total row to ClickHouse GROUP BY results using WITH TOTALS, with control over how the totals row is computed via the totals_mode setting.

---

`WITH TOTALS` is a ClickHouse extension to `GROUP BY` that appends an extra row containing aggregate values computed across all rows that passed the `WHERE` filter (or, depending on the `totals_mode` setting, across the rows that survived `HAVING`). It is the built-in alternative to running a second `SELECT` just to get a grand total.

## Basic Syntax

Add `WITH TOTALS` immediately after `GROUP BY`:

```sql
SELECT
    country,
    count()       AS orders,
    sum(revenue)  AS total_revenue
FROM sales
GROUP BY country WITH TOTALS
ORDER BY total_revenue DESC;
```

The result set includes all normal grouped rows followed by one extra row where `country` is the default value for its type (empty string for `String`) and the aggregate columns hold the grand totals.

## Simple Example

```sql
CREATE TABLE sales
(
    sale_id  UInt32,
    country  String,
    product  String,
    revenue  Float64
)
ENGINE = MergeTree()
ORDER BY sale_id;

INSERT INTO sales VALUES
    (1, 'US', 'Widget', 100),
    (2, 'US', 'Gadget', 200),
    (3, 'DE', 'Widget', 150),
    (4, 'DE', 'Gadget',  50),
    (5, 'FR', 'Widget', 300);

SELECT
    country,
    sum(revenue) AS revenue
FROM sales
GROUP BY country WITH TOTALS
ORDER BY revenue DESC;
```

```text
country | revenue
--------|--------
FR      | 300
US      | 300
DE      | 200
        | 800     <- totals row
```

## WITH TOTALS and HAVING

When you add a `HAVING` clause, the totals row can be computed in different ways controlled by `totals_mode`:

```sql
SELECT
    country,
    sum(revenue) AS revenue
FROM sales
GROUP BY country WITH TOTALS
HAVING revenue > 200
SETTINGS totals_mode = 'after_having_inclusive';
```

The four `totals_mode` values are:

| Value | Totals computed from |
|---|---|
| `before_having` (default) | All rows that passed WHERE (HAVING is ignored for totals) |
| `after_having_inclusive` | Only rows from groups that passed HAVING, plus any `max_rows_to_group_by` overflow rows |
| `after_having_exclusive` | Only rows from groups that passed HAVING |
| `after_having_auto` | Switches between inclusive and exclusive based on `totals_auto_threshold` |

```sql
-- Totals include only countries that passed HAVING
SELECT
    country,
    sum(revenue) AS revenue
FROM sales
GROUP BY country WITH TOTALS
HAVING revenue >= 250
SETTINGS totals_mode = 'after_having_exclusive';
```

## Reading the Totals Row in JSON Output

The totals row is particularly useful when consuming results programmatically. In JSON output formats, ClickHouse places it in a dedicated `totals` key:

```sql
SELECT
    product,
    count()       AS cnt,
    sum(revenue)  AS revenue
FROM sales
GROUP BY product WITH TOTALS
FORMAT JSON;
```

```json
{
  "data": [
    {"product": "Gadget", "cnt": 2, "revenue": 250},
    {"product": "Widget", "cnt": 3, "revenue": 550}
  ],
  "totals": {"product": "", "cnt": 5, "revenue": 800},
  "rows": 2,
  "rows_before_limit_at_least": 2
}
```

This makes it trivial for front-end dashboards to display both per-group values and a grand total in a single round trip.

## WITH TOTALS Combined with LIMIT

`LIMIT` applies before the totals row is appended, so the totals always reflect the full aggregate - not just the visible page:

```sql
SELECT
    country,
    sum(revenue) AS revenue
FROM sales
GROUP BY country WITH TOTALS
ORDER BY revenue DESC
LIMIT 2;
```

```text
country | revenue
--------|--------
FR      | 300
US      | 300
        | 800     <- grand total of ALL countries, not just the top 2
```

## Multi-Column GROUP BY with Totals

```sql
SELECT
    country,
    product,
    count()      AS orders,
    sum(revenue) AS revenue
FROM sales
GROUP BY country, product WITH TOTALS
ORDER BY country, product;
```

The totals row will show empty strings for both `country` and `product`, with aggregates over all rows.

## Summary

`WITH TOTALS` appends a single grand-total row to `GROUP BY` results without a second query. The `totals_mode` setting determines whether the total reflects rows before or after `HAVING` filtering. JSON output formats expose the totals row under a separate `totals` key, making it straightforward to build dashboards that need both per-group metrics and an overall summary.
