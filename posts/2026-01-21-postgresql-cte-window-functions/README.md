# How to Use PostgreSQL CTEs and Window Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, CTE, Window Functions, SQL, Analytics, Advanced Queries

Description: A comprehensive guide to PostgreSQL Common Table Expressions (CTEs) and window functions, covering recursive queries, running totals, rankings, and advanced analytical patterns.

---

CTEs and window functions are powerful SQL features for complex queries and analytics. This guide covers practical usage patterns for data analysis, reporting, and complex business logic.

## Prerequisites

- PostgreSQL 12+ installed
- Basic SQL knowledge
- Sample data for practice

## Common Table Expressions (CTEs)

### Basic CTE Syntax

```sql
-- Simple CTE
WITH active_users AS (
    SELECT id, name, email
    FROM users
    WHERE is_active = true
)
SELECT * FROM active_users WHERE email LIKE '%@company.com';
```

### Multiple CTEs

```sql
-- Chain multiple CTEs
WITH
active_customers AS (
    SELECT id, name FROM customers WHERE status = 'active'
),
recent_orders AS (
    SELECT customer_id, SUM(total) AS total_spent
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY customer_id
),
customer_stats AS (
    SELECT
        c.id,
        c.name,
        COALESCE(o.total_spent, 0) AS monthly_spent
    FROM active_customers c
    LEFT JOIN recent_orders o ON o.customer_id = c.id
)
SELECT * FROM customer_stats ORDER BY monthly_spent DESC;
```

### Recursive CTEs

```sql
-- Employee hierarchy
WITH RECURSIVE employee_tree AS (
    -- Base case: top-level managers
    SELECT id, name, manager_id, 1 AS level, ARRAY[name] AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case: employees under managers
    SELECT e.id, e.name, e.manager_id, t.level + 1, t.path || e.name
    FROM employees e
    JOIN employee_tree t ON e.manager_id = t.id
)
SELECT
    id,
    name,
    level,
    array_to_string(path, ' > ') AS hierarchy
FROM employee_tree
ORDER BY path;
```

### Recursive Number Series

```sql
-- Generate number series
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 100
)
SELECT * FROM numbers;

-- Generate date series
WITH RECURSIVE dates AS (
    SELECT DATE '2025-01-01' AS date
    UNION ALL
    SELECT date + 1 FROM dates WHERE date < DATE '2025-12-31'
)
SELECT * FROM dates;
```

### Tree/Graph Traversal

```sql
-- Find all descendants of a category
WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, 0 AS depth
    FROM categories
    WHERE id = 1  -- Start from root

    UNION ALL

    SELECT c.id, c.name, c.parent_id, ct.depth + 1
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE ct.depth < 10  -- Prevent infinite loops
)
SELECT * FROM category_tree ORDER BY depth, name;
```

### CTE Materialization

```sql
-- PostgreSQL 12+: Control materialization
WITH expensive_calculation AS MATERIALIZED (
    -- Force materialization (computed once)
    SELECT id, complex_function(data) AS result
    FROM big_table
)
SELECT * FROM expensive_calculation WHERE result > 100;

WITH simple_filter AS NOT MATERIALIZED (
    -- Inline into main query (may be optimized better)
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM simple_filter WHERE created_at > '2025-01-01';
```

## Window Functions

### Basic Window Function

```sql
-- Row number for each row
SELECT
    id,
    name,
    department,
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees;
```

### Partition By

```sql
-- Rank within each department
SELECT
    id,
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

### Ranking Functions

```sql
SELECT
    name,
    department,
    salary,
    -- Different ranking methods
    ROW_NUMBER() OVER w AS row_num,      -- Unique numbers
    RANK() OVER w AS rank,               -- Gaps after ties
    DENSE_RANK() OVER w AS dense_rank,   -- No gaps
    NTILE(4) OVER w AS quartile          -- Divide into groups
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY salary DESC);

-- Results for tied salaries:
-- row_num: 1, 2, 3, 4...
-- rank:    1, 1, 3, 4... (skips 2)
-- dense_rank: 1, 1, 2, 3... (no skip)
```

### Aggregate Window Functions

```sql
SELECT
    date,
    amount,
    -- Running totals
    SUM(amount) OVER (ORDER BY date) AS running_total,

    -- Running average
    AVG(amount) OVER (ORDER BY date) AS running_avg,

    -- Total in partition
    SUM(amount) OVER (PARTITION BY EXTRACT(MONTH FROM date)) AS monthly_total,

    -- Count in window
    COUNT(*) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_count
FROM sales
ORDER BY date;
```

### Frame Specification

```sql
SELECT
    date,
    amount,
    -- Last 7 days
    SUM(amount) OVER (
        ORDER BY date
        RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
    ) AS weekly_total,

    -- Previous 3 rows
    AVG(amount) OVER (
        ORDER BY date
        ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS moving_avg_4,

    -- Current row and next 2
    SUM(amount) OVER (
        ORDER BY date
        ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING
    ) AS forward_sum
FROM sales;
```

### LAG and LEAD

```sql
SELECT
    date,
    amount,
    -- Previous row value
    LAG(amount) OVER (ORDER BY date) AS prev_amount,

    -- Next row value
    LEAD(amount) OVER (ORDER BY date) AS next_amount,

    -- 3 rows back with default
    LAG(amount, 3, 0) OVER (ORDER BY date) AS amount_3_ago,

    -- Change from previous
    amount - LAG(amount) OVER (ORDER BY date) AS change,

    -- Percent change
    ROUND(100.0 * (amount - LAG(amount) OVER (ORDER BY date)) /
          NULLIF(LAG(amount) OVER (ORDER BY date), 0), 2) AS pct_change
FROM sales;
```

### FIRST_VALUE and LAST_VALUE

```sql
SELECT
    department,
    name,
    salary,
    -- Highest salary in department
    FIRST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS top_earner,

    -- Lowest salary in department
    LAST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY salary DESC
        RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS lowest_earner,

    -- Difference from top
    salary - FIRST_VALUE(salary) OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS diff_from_top
FROM employees;
```

### NTH_VALUE

```sql
SELECT
    department,
    name,
    salary,
    -- Second highest salary
    NTH_VALUE(salary, 2) OVER (
        PARTITION BY department
        ORDER BY salary DESC
        RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_highest
FROM employees;
```

## Combined Patterns

### CTE with Window Functions

```sql
WITH monthly_sales AS (
    SELECT
        DATE_TRUNC('month', order_date) AS month,
        SUM(total) AS revenue
    FROM orders
    WHERE order_date >= '2024-01-01'
    GROUP BY DATE_TRUNC('month', order_date)
),
sales_with_growth AS (
    SELECT
        month,
        revenue,
        LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
        revenue - LAG(revenue) OVER (ORDER BY month) AS growth,
        ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) /
              NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS growth_pct
    FROM monthly_sales
)
SELECT * FROM sales_with_growth ORDER BY month;
```

### Running Totals with Reset

```sql
-- Running total that resets each month
SELECT
    order_date,
    total,
    SUM(total) OVER (
        PARTITION BY DATE_TRUNC('month', order_date)
        ORDER BY order_date
    ) AS monthly_running_total
FROM orders;
```

### Gaps and Islands

```sql
-- Find consecutive date ranges
WITH numbered AS (
    SELECT
        date,
        ROW_NUMBER() OVER (ORDER BY date) AS rn,
        date - (ROW_NUMBER() OVER (ORDER BY date))::INTEGER AS grp
    FROM attendance
    WHERE present = true
)
SELECT
    MIN(date) AS start_date,
    MAX(date) AS end_date,
    COUNT(*) AS consecutive_days
FROM numbered
GROUP BY grp
ORDER BY start_date;
```

### Top N Per Group

```sql
-- Top 3 products per category
WITH ranked_products AS (
    SELECT
        category_id,
        product_name,
        revenue,
        ROW_NUMBER() OVER (
            PARTITION BY category_id
            ORDER BY revenue DESC
        ) AS rank
    FROM products
)
SELECT * FROM ranked_products WHERE rank <= 3;
```

### Cumulative Distribution

```sql
SELECT
    name,
    salary,
    CUME_DIST() OVER (ORDER BY salary) AS cumulative_dist,
    PERCENT_RANK() OVER (ORDER BY salary) AS percentile
FROM employees;
```

### Session Analysis

```sql
-- Identify user sessions (30 min gap = new session)
WITH events_with_prev AS (
    SELECT
        user_id,
        event_time,
        LAG(event_time) OVER (
            PARTITION BY user_id
            ORDER BY event_time
        ) AS prev_event_time
    FROM user_events
),
session_starts AS (
    SELECT
        user_id,
        event_time,
        CASE
            WHEN prev_event_time IS NULL
                 OR event_time - prev_event_time > INTERVAL '30 minutes'
            THEN 1
            ELSE 0
        END AS is_session_start
    FROM events_with_prev
),
sessions AS (
    SELECT
        user_id,
        event_time,
        SUM(is_session_start) OVER (
            PARTITION BY user_id
            ORDER BY event_time
        ) AS session_id
    FROM session_starts
)
SELECT
    user_id,
    session_id,
    MIN(event_time) AS session_start,
    MAX(event_time) AS session_end,
    COUNT(*) AS event_count
FROM sessions
GROUP BY user_id, session_id;
```

## Performance Tips

### Named Windows

```sql
-- Define window once, use multiple times
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER w AS row_num,
    RANK() OVER w AS rank,
    SUM(salary) OVER w AS running_total
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY salary DESC);
```

### Index Support

```sql
-- Index for window function
CREATE INDEX idx_employees_dept_salary
ON employees(department, salary DESC);

-- Query can use index for ordering
SELECT
    name,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC)
FROM employees;
```

## Best Practices

1. **Use named windows** - Reuse window definitions
2. **Consider materialization** - Control CTE behavior
3. **Limit recursion depth** - Prevent infinite loops
4. **Index window columns** - Improve performance
5. **Combine CTEs and windows** - Build complex analyses
6. **Use appropriate ranking** - ROW_NUMBER vs RANK vs DENSE_RANK

## Conclusion

CTEs and window functions enable powerful SQL analytics:

1. **CTEs** - Organize complex queries, enable recursion
2. **Window functions** - Running totals, rankings, comparisons
3. **Combined** - Complex analytical queries
4. **Performance** - Proper indexing and optimization

Master these features to write efficient, readable analytical queries.
