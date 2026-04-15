# How to Use WITH ROLLUP in ClickHouse for Subtotals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, GROUP BY, WITH ROLLUP, Subtotal

Description: Generate hierarchical subtotals and grand totals in ClickHouse using GROUP BY WITH ROLLUP, with NULL marking each rollup level and GROUPING() identifying them.

---

`WITH ROLLUP` is a ClickHouse extension to `GROUP BY` that automatically produces a hierarchy of subtotals. For a `GROUP BY a, b, c WITH ROLLUP` query, ClickHouse runs groupings at every level - `(a, b, c)`, `(a, b)`, `(a)`, and `()` (grand total) - and returns all results in a single pass. By default, ClickHouse fills the collapsed columns with default values (`0` for numeric types, empty string for `String`). To get standard SQL behavior where subtotal rows use `NULL` instead, enable the `group_by_use_nulls` setting. The examples below use this setting so that `NULL` clearly marks which level of the hierarchy each row belongs to.

## Basic Syntax

```sql
SELECT
    col1,
    col2,
    aggregate_function(col3) AS metric
FROM table_name
GROUP BY col1, col2 WITH ROLLUP;
```

## Simple Two-Level Rollup

```sql
SET group_by_use_nulls = 1;

CREATE TABLE regional_sales
(
    region   String,
    country  String,
    revenue  Float64
)
ENGINE = MergeTree()
ORDER BY (region, country);

INSERT INTO regional_sales VALUES
    ('EMEA', 'DE', 200),
    ('EMEA', 'FR', 300),
    ('APAC', 'JP', 400),
    ('APAC', 'AU', 150);

SELECT
    region,
    country,
    sum(revenue) AS revenue
FROM regional_sales
GROUP BY region, country WITH ROLLUP
ORDER BY region NULLS LAST, country NULLS LAST;
```

```text
region | country | revenue
-------|---------|--------
APAC   | AU      | 150      <- leaf row
APAC   | JP      | 400      <- leaf row
APAC   | NULL    | 550      <- region subtotal
EMEA   | DE      | 200      <- leaf row
EMEA   | FR      | 300      <- leaf row
EMEA   | NULL    | 500      <- region subtotal
NULL   | NULL    | 1050     <- grand total
```

## Three-Level Rollup

```sql
SELECT
    year,
    quarter,
    product,
    sum(sales) AS total_sales
FROM quarterly_sales
GROUP BY year, quarter, product WITH ROLLUP
ORDER BY
    year     NULLS LAST,
    quarter  NULLS LAST,
    product  NULLS LAST;
```

This produces groupings at four levels: `(year, quarter, product)`, `(year, quarter)`, `(year)`, and `()`.

## Using GROUPING() to Identify Subtotal Rows

`NULL` in a rollup row is ambiguous if your data itself can contain `NULL` values. The `GROUPING()` function returns `1` for columns that were collapsed by rollup and `0` for columns that hold real grouped values:

```sql
SELECT
    if(GROUPING(region)  = 1, 'ALL REGIONS', region)   AS region_label,
    if(GROUPING(country) = 1, 'ALL COUNTRIES', country) AS country_label,
    sum(revenue)                                          AS revenue,
    GROUPING(region)                                      AS is_region_total,
    GROUPING(country)                                     AS is_country_total
FROM regional_sales
GROUP BY region, country WITH ROLLUP
ORDER BY region NULLS LAST, country NULLS LAST;
```

```text
region_label | country_label | revenue | is_region_total | is_country_total
-------------|---------------|---------|-----------------|------------------
APAC         | AU            | 150     | 0               | 0
APAC         | JP            | 400     | 0               | 0
APAC         | ALL COUNTRIES | 550     | 0               | 1
EMEA         | DE            | 200     | 0               | 0
EMEA         | FR            | 300     | 0               | 0
EMEA         | ALL COUNTRIES | 500     | 0               | 1
ALL REGIONS  | ALL COUNTRIES | 1050    | 1               | 1
```

## Filtering to a Specific Rollup Level

Use `HAVING` with `GROUPING()` to return only subtotal rows or only grand-total rows:

```sql
-- Return only region-level subtotals (not leaf rows, not grand total)
SELECT
    region,
    sum(revenue) AS revenue
FROM regional_sales
GROUP BY region, country WITH ROLLUP
HAVING GROUPING(country) = 1 AND GROUPING(region) = 0;
```

## Rollup with Multiple Aggregates

```sql
SELECT
    department,
    job_title,
    count()        AS headcount,
    avg(salary)    AS avg_salary,
    sum(salary)    AS payroll
FROM employees
GROUP BY department, job_title WITH ROLLUP
ORDER BY department NULLS LAST, job_title NULLS LAST;
```

## Summary

`WITH ROLLUP` generates a complete hierarchy of subtotals in a single query by progressively collapsing `GROUP BY` columns from right to left. By default, collapsed columns receive default values (`0`, empty string); enable `group_by_use_nulls = 1` to get `NULL` instead, which is the standard SQL behavior. The `GROUPING()` function lets you distinguish real data values from rollup-generated ones regardless of which mode you use. Use `WITH ROLLUP` for financial reports, sales hierarchies, and any analysis that needs subtotals at multiple levels of granularity without multiple queries.
