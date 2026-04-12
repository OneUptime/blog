# How to Use LAST_VALUE() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Last Value, Window Function, SQL, Analytics

Description: Learn how to use MySQL's LAST_VALUE() window function to retrieve the last value in an ordered window frame, including the critical frame clause for correct results.

---

## Overview

`LAST_VALUE()` is a MySQL 8.0 window function that returns the value of an expression from the last row of the window frame. It is commonly used to compare each row to the most recent or maximum value in its partition. However, `LAST_VALUE()` has a critical gotcha: the default window frame ends at the current row, not the end of the partition, so you almost always need to explicitly specify the frame.

## Basic Syntax

```sql
LAST_VALUE(expr) OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
  frame_clause
)
```

Always specify the frame explicitly. Without it, the result is often not what you expect.

## The Frame Clause Problem

```sql
-- Without explicit frame: the default frame ends at the current row
-- LAST_VALUE returns the CURRENT ROW's value (the last in the frame so far)
SELECT day, sales,
  LAST_VALUE(sales) OVER (ORDER BY day) AS last_val_wrong
FROM daily_sales;
-- last_val_wrong: always equals the current row's sales (not useful)

-- With explicit full frame: returns the last value of the entire partition
SELECT day, sales,
  LAST_VALUE(sales) OVER (
    ORDER BY day
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS last_val_correct
FROM daily_sales;
-- last_val_correct: the last day's sales value for every row
```

## Basic Examples

```sql
-- Last salary in the ordered list for each department
SELECT name, department, salary,
  LAST_VALUE(salary) OVER (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_salary_in_dept
FROM employees;

-- Most recent sale amount per customer
SELECT customer_id, sale_date, amount,
  LAST_VALUE(amount) OVER (
    PARTITION BY customer_id
    ORDER BY sale_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS most_recent_purchase
FROM sales;
```

## Comparing Each Row to the Last Row

```sql
CREATE TABLE monthly_revenue (
  month DATE,
  department VARCHAR(50),
  revenue DECIMAL(12,2)
);

INSERT INTO monthly_revenue VALUES
('2024-01-01', 'Sales', 100000),
('2024-02-01', 'Sales', 120000),
('2024-03-01', 'Sales', 95000),
('2024-04-01', 'Sales', 130000);

-- Compare each month to the final month's revenue
SELECT
  month,
  revenue,
  LAST_VALUE(revenue) OVER (
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS final_month_revenue,
  revenue - LAST_VALUE(revenue) OVER (
    ORDER BY month
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS diff_from_final
FROM monthly_revenue
ORDER BY month;
```

## Tracking the Most Recent Status

```sql
CREATE TABLE ticket_updates (
  ticket_id INT,
  updated_at DATETIME,
  status VARCHAR(50)
);

INSERT INTO ticket_updates VALUES
(1, '2024-06-01 09:00:00', 'open'),
(1, '2024-06-02 14:00:00', 'in_progress'),
(1, '2024-06-03 10:00:00', 'resolved'),
(2, '2024-06-01 11:00:00', 'open'),
(2, '2024-06-04 16:00:00', 'closed');

-- Show each update alongside the current (last) status of the ticket
SELECT ticket_id, updated_at, status,
  LAST_VALUE(status) OVER (
    PARTITION BY ticket_id
    ORDER BY updated_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS current_status
FROM ticket_updates
ORDER BY ticket_id, updated_at;
```

## LAST_VALUE() vs NTH_VALUE()

```sql
-- LAST_VALUE is equivalent to NTH_VALUE at the last position
-- With 3 rows, NTH_VALUE(val, 3) returns the same as LAST_VALUE(val)
SELECT val,
  LAST_VALUE(val) OVER (
    ORDER BY val
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS last_val,
  NTH_VALUE(val, 3) OVER (
    ORDER BY val
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS nth_val_last
FROM (SELECT 1 AS val UNION ALL SELECT 2 UNION ALL SELECT 3) t;
```

## LAST_VALUE() vs FIRST_VALUE()

```sql
-- FIRST_VALUE: value from the first row of the frame
-- LAST_VALUE: value from the last row of the frame
SELECT name, score,
  FIRST_VALUE(name) OVER (ORDER BY score DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS top_player,
  LAST_VALUE(name)  OVER (ORDER BY score DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS bottom_player
FROM leaderboard;
```

## Practical Example: Finding the End-of-Period Balance

```sql
-- Get the closing balance for each account in each month
SELECT
  account_id,
  txn_date,
  balance,
  LAST_VALUE(balance) OVER (
    PARTITION BY account_id, DATE_FORMAT(txn_date, '%Y-%m')
    ORDER BY txn_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS month_end_balance
FROM account_transactions
ORDER BY account_id, txn_date;
```

## Summary

`LAST_VALUE()` retrieves the value from the last row in the window frame. Always specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to get the last value of the entire partition - without this, the default frame ends at the current row, making `LAST_VALUE()` return the current row's value. Use it to compare rows to the period-end value, track the most recent status, or find closing balances.
