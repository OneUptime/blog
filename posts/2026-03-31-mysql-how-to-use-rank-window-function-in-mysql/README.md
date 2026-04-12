# How to Use RANK() Window Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Rank, Window Function, SQL, Analytics

Description: Learn how to use MySQL's RANK() window function to assign rankings to rows, handling ties by assigning the same rank and leaving gaps in the sequence.

---

## Overview

`RANK()` is a MySQL 8.0 window function that assigns a rank to each row within its partition, ordered by the specified expression. When two or more rows have the same value, they receive the same rank, and the next rank is skipped (creating a gap). This mirrors competition ranking: two gold medals means no silver.

## Basic Syntax

```sql
RANK() OVER (
  [PARTITION BY partition_expression]
  ORDER BY sort_expression [ASC|DESC]
)
```

## Basic Examples

```sql
-- Rank all employees by salary
SELECT name, salary,
  RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees;

-- Rank employees within each department
SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

## Understanding Tie Handling and Gaps

```sql
-- Example showing tie behavior
SELECT name, score,
  RANK()       OVER (ORDER BY score DESC) AS rank_val,
  DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank,
  ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num
FROM (
  SELECT 'Alice' AS name, 95 AS score UNION ALL
  SELECT 'Bob',   90 UNION ALL
  SELECT 'Carol', 90 UNION ALL  -- tied with Bob
  SELECT 'Dave',  85
) scores;
-- rank_val:   1, 2, 2, 4  (gap after tie: rank 3 is skipped)
-- dense_rank: 1, 2, 2, 3  (no gap)
-- row_num:    1, 2, 3, 4  (no ties at all)
```

## Leaderboard Queries

```sql
CREATE TABLE game_scores (
  player_id INT,
  player_name VARCHAR(100),
  game_id INT,
  score INT
);

INSERT INTO game_scores VALUES
(1, 'Alice', 1, 1500),
(2, 'Bob',   1, 1200),
(3, 'Carol', 1, 1500),  -- tied with Alice
(4, 'Dave',  1, 900),
(1, 'Alice', 2, 2000),
(2, 'Bob',   2, 1800);

-- Overall leaderboard for game 1
SELECT player_name, score,
  RANK() OVER (ORDER BY score DESC) AS rank_pos
FROM game_scores
WHERE game_id = 1
ORDER BY rank_pos;
-- Alice: 1, Carol: 1, Bob: 3, Dave: 4
```

## Top-N with RANK() Including Ties

```sql
-- INCORRECT: window functions cannot be used in WHERE
SELECT department, name, sales,
  RANK() OVER (PARTITION BY department ORDER BY sales DESC) AS rnk
FROM sales_reps
WHERE RANK() OVER (PARTITION BY department ORDER BY sales DESC) <= 3;
```

Note: Window functions cannot appear directly in `WHERE`. Use a subquery or CTE:

```sql
-- Correct approach using CTE
WITH ranked AS (
  SELECT department, name, sales,
    RANK() OVER (PARTITION BY department ORDER BY sales DESC) AS rnk
  FROM sales_reps
)
SELECT * FROM ranked WHERE rnk <= 3;
```

## Finding Exact Rank Positions

```sql
-- Find products ranked #1 by revenue in each category
WITH product_ranks AS (
  SELECT
    category,
    product_name,
    revenue,
    RANK() OVER (PARTITION BY category ORDER BY revenue DESC) AS rnk
  FROM products
)
SELECT * FROM product_ranks WHERE rnk = 1;
```

## Comparing RANK() with the Previous Rank

```sql
-- See how many positions each player improved compared to last month
WITH current_ranks AS (
  SELECT player_id,
    RANK() OVER (ORDER BY score DESC) AS cur_rank
  FROM scores WHERE month = '2024-06'
),
prev_ranks AS (
  SELECT player_id,
    RANK() OVER (ORDER BY score DESC) AS prev_rank
  FROM scores WHERE month = '2024-05'
)
SELECT c.player_id,
  c.cur_rank,
  p.prev_rank,
  p.prev_rank - c.cur_rank AS improvement
FROM current_ranks c
JOIN prev_ranks p USING (player_id)
ORDER BY improvement DESC;
```

## RANK() for Percentile Banding

```sql
-- Assign a letter grade based on rank within class
WITH ranked_students AS (
  SELECT student_id, score,
    RANK() OVER (ORDER BY score DESC) AS rnk,
    COUNT(*) OVER () AS total
  FROM exam_results
)
SELECT student_id, score, rnk,
  CASE
    WHEN rnk <= total * 0.10 THEN 'A'
    WHEN rnk <= total * 0.25 THEN 'B'
    WHEN rnk <= total * 0.50 THEN 'C'
    ELSE 'D'
  END AS grade
FROM ranked_students;
```

## Summary

`RANK()` assigns ranks with ties getting the same value and gaps left in the sequence after a tie. Use it for competition-style leaderboards and top-N queries where ties should be preserved. Use `DENSE_RANK()` when you need no gaps, and `ROW_NUMBER()` when you need unique sequential numbers regardless of ties. Always filter on `RANK()` results using a CTE or subquery, not directly in `WHERE`.
