# How to Use totals_mode Setting in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, totals_mode, WITH TOTALS, GROUP BY, Aggregation, Setting

Description: Learn how totals_mode controls how ClickHouse computes the WITH TOTALS row in GROUP BY queries when filters or row limits are applied.

---

ClickHouse supports `WITH TOTALS` in GROUP BY queries to compute an extra summary row that aggregates across all groups. The `totals_mode` setting controls how that totals row is calculated when `HAVING` filters or row limits narrow the result set.

## What is totals_mode?

`totals_mode` applies when you use `GROUP BY ... WITH TOTALS`. It determines how the totals row is derived from the data. It has four values:

- `before_having` - totals are computed from all rows before HAVING is applied (default)
- `after_having_inclusive` - totals are computed from rows that passed HAVING, plus any rows that overflowed `max_rows_to_group_by`
- `after_having_exclusive` - totals include only rows that passed HAVING
- `after_having_auto` - ClickHouse chooses between inclusive and exclusive based on `totals_auto_threshold`

## Basic WITH TOTALS Query

```sql
SELECT
    country,
    count()        AS orders,
    sum(revenue)   AS total_revenue
FROM orders
GROUP BY country WITH TOTALS
ORDER BY total_revenue DESC;
```

The extra row at the bottom shows aggregate totals across all countries.

## Effect of totals_mode on HAVING

The difference becomes visible when you add a HAVING clause:

```sql
SELECT
    country,
    count()        AS orders,
    sum(revenue)   AS total_revenue
FROM orders
GROUP BY country WITH TOTALS
HAVING total_revenue > 10000
SETTINGS totals_mode = 'before_having';
```

With `before_having`, the totals row reflects ALL countries including those filtered out by HAVING. With `after_having_exclusive`, it only totals the countries that appeared in the result.

## Choosing the Right Mode

| Mode | Totals Row Represents |
|------|----------------------|
| `before_having` | All data, ignore HAVING |
| `after_having_inclusive` | Groups passing HAVING, plus `max_rows_to_group_by` overflow rows |
| `after_having_exclusive` | Only groups shown in result |
| `after_having_auto` | Automatic based on threshold |

For most dashboard use cases where you want "total of what I'm showing," use `after_having_exclusive`:

```sql
SELECT
    product_category,
    sum(quantity)   AS units_sold,
    sum(revenue)    AS revenue
FROM sales
WHERE sale_date >= today() - 30
GROUP BY product_category WITH TOTALS
HAVING revenue > 5000
SETTINGS totals_mode = 'after_having_exclusive';
```

## Using totals_auto_threshold

When `totals_mode = 'after_having_auto'`, ClickHouse compares the number of rows that passed HAVING to the total number of rows. If the fraction of rows passing HAVING exceeds `totals_auto_threshold` (default 0.5), it behaves like `after_having_inclusive`; otherwise it behaves like `after_having_exclusive`.

```sql
SET totals_mode             = 'after_having_auto';
SET totals_auto_threshold   = 0.4;
```

## Reading the Totals Row in Applications

When using the HTTP interface or native protocol, the totals row is returned as a separate section. In the HTTP interface with `FORMAT JSON`, it appears under the `"totals"` key:

```text
{
  "data": [...],
  "totals": {"country": "", "orders": 15240, "total_revenue": 982340.50},
  ...
}
```

## Summary

`totals_mode` gives you precise control over how the WITH TOTALS row is computed relative to HAVING filters in ClickHouse GROUP BY queries. Use `after_having_exclusive` to total only visible groups, `before_having` to show grand totals regardless of filters, and `after_having_auto` for automatic selection based on filter selectivity.
