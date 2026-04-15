# How to Use NTH_VALUE() Window Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Analytics, Ranking

Description: Learn how NTH_VALUE() retrieves the value from the nth row of a window frame in ClickHouse, with practical examples for podium rankings and multi-position comparisons.

---

`NTH_VALUE(expr, n)` is a window function that returns the value of `expr` from the `n`th row of the current window frame. It generalizes `FIRST_VALUE()` (which is equivalent to `NTH_VALUE(expr, 1)`) to any arbitrary position. This is useful when you need second place, third place, or any specific rank position in a ranking without a self-join or subquery per position. ClickHouse supports `NTH_VALUE()` natively.

## Syntax

```text
NTH_VALUE(expr, n) OVER (
    [PARTITION BY partition_expr [, ...]]
    ORDER BY sort_expr [ASC | DESC] [, ...]
    [ROWS BETWEEN frame_start AND frame_end]
)
```

- `expr` - the column or expression to retrieve.
- `n` - a positive integer specifying which row's value to return (1-based index).

If the frame has fewer than `n` rows, `NTH_VALUE()` returns `NULL`.

## Frame Specification is Required for Correct Results

Like `LAST_VALUE()`, `NTH_VALUE()` is affected by the window frame. With the default frame (`UNBOUNDED PRECEDING AND CURRENT ROW`), the function can only see rows up to the current position. For rows before the nth position, the result is `NULL`.

To see the nth value of the entire partition from every row, use `UNBOUNDED FOLLOWING`:

```sql
-- Without UNBOUNDED FOLLOWING, rows before position n return NULL
SELECT
    player_name,
    score,
    NTH_VALUE(player_name, 2) OVER (
        ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_place_player
FROM player_scores
ORDER BY score DESC;
```

## Podium Rankings: First, Second, and Third Place

The classic use case for `NTH_VALUE()` is displaying the top-3 alongside every row. This avoids separate subqueries for each position:

```sql
SELECT
    competition_id,
    player_name,
    score,
    NTH_VALUE(player_name, 1) OVER (
        PARTITION BY competition_id
        ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS gold,
    NTH_VALUE(player_name, 2) OVER (
        PARTITION BY competition_id
        ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS silver,
    NTH_VALUE(player_name, 3) OVER (
        PARTITION BY competition_id
        ORDER BY score DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS bronze
FROM competition_results
ORDER BY competition_id, score DESC;
```

Every row in the result carries the names of the gold, silver, and bronze holders for its competition, making it easy to compare any player's score against the top three.

## Comparing Each Row Against the Nth Best

Retrieve a reference value from a specific rank to normalize or compare all rows against it. This computes each product's revenue as a percentage of the second-best seller in its category:

```sql
SELECT
    category,
    product_name,
    revenue,
    NTH_VALUE(revenue, 2) OVER (
        PARTITION BY category
        ORDER BY revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_best_revenue,
    ROUND(
        revenue / NTH_VALUE(revenue, 2) OVER (
            PARTITION BY category
            ORDER BY revenue DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) * 100,
        1
    ) AS pct_of_second_best
FROM product_sales
WHERE report_month = '2025-12-01'
ORDER BY category, revenue DESC;
```

## Using NTH_VALUE() to Build a Pivot-Like Structure

When you need to spread ranked values into named columns without a full PIVOT, `NTH_VALUE()` provides a compact alternative. This flattens the top-3 stores and their revenues into columns per region:

```sql
SELECT DISTINCT
    region,
    NTH_VALUE(store_name, 1) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS rank_1_store,
    NTH_VALUE(store_name, 2) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS rank_2_store,
    NTH_VALUE(store_name, 3) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS rank_3_store,
    NTH_VALUE(monthly_revenue, 1) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS rank_1_revenue,
    NTH_VALUE(monthly_revenue, 2) OVER (
        PARTITION BY region
        ORDER BY monthly_revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS rank_2_revenue
FROM store_monthly_summary
WHERE report_month = '2025-12-01'
ORDER BY region;
```

The `SELECT DISTINCT` collapses the per-row results into one row per region, since every row in a region sees the same nth values.

## Null Handling When the Partition is Too Small

If a partition has fewer rows than the requested position `n`, the result is `NULL`. Guard against this with `COALESCE()` when a fallback value is needed:

```sql
SELECT
    department,
    employee_name,
    salary,
    COALESCE(
        NTH_VALUE(salary, 3) OVER (
            PARTITION BY department
            ORDER BY salary DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ),
        0
    ) AS third_highest_salary
FROM employees
ORDER BY department, salary DESC;
```

Departments with fewer than 3 employees will show `0` instead of `NULL`.

## NTH_VALUE() vs. ROW_NUMBER() for Position-Based Retrieval

An alternative approach to extracting the nth value uses `ROW_NUMBER()` in a subquery:

```sql
-- Using NTH_VALUE (single pass, all positions in one query)
SELECT DISTINCT
    category,
    NTH_VALUE(product_name, 2) OVER (
        PARTITION BY category
        ORDER BY revenue DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_place
FROM product_sales;
```

```sql
-- Using ROW_NUMBER (subquery required, but works for filtering)
SELECT category, product_name AS second_place
FROM (
    SELECT
        category,
        product_name,
        ROW_NUMBER() OVER (
            PARTITION BY category
            ORDER BY revenue DESC
        ) AS rn
    FROM product_sales
)
WHERE rn = 2;
```

`NTH_VALUE()` is more concise when you need multiple positions in a single query. `ROW_NUMBER()` with filtering is more efficient when you only need the nth row itself and not all rows in context.

## Summary

`NTH_VALUE(expr, n)` retrieves the value at an arbitrary position within a window frame, making it ideal for podium displays, reference-value comparisons, and pivot-like column spreading. The critical implementation detail is the frame specification: use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to see the nth value of the entire partition from every row. When a partition has fewer than `n` rows, the function returns `NULL`, so wrap with `COALESCE()` when a default is needed. For queries requiring only a single specific position, `ROW_NUMBER()` with a subquery filter can be more efficient, while `NTH_VALUE()` shines when multiple positions are needed simultaneously.
