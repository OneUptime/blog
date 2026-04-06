# How to Use FIRST_VALUE and LAST_VALUE in MySQL Window Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Window Function, FIRST_VALUE, LAST_VALUE, MySQL 8.0, Database

Description: Learn how to use FIRST_VALUE and LAST_VALUE window functions in MySQL 8.0 to retrieve the first or last value in an ordered window frame.

---

## How FIRST_VALUE and LAST_VALUE Work

`FIRST_VALUE` returns the value from the first row in the current window frame. `LAST_VALUE` returns the value from the last row in the current window frame.

The key nuance with `LAST_VALUE` is the default window frame: when `ORDER BY` is present, MySQL's default frame ends at the current row, so `LAST_VALUE` returns the current row's value instead of the last row in the partition. To get the true last value of the partition, use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

```mermaid
graph LR
    A[Row 1 - FIRST_VALUE] --> B[Row 2]
    B --> C[Row 3]
    C --> D[Row N - LAST_VALUE with UNBOUNDED FOLLOWING]
```

## Syntax

```sql
FIRST_VALUE(expression) OVER (
    [PARTITION BY column]
    ORDER BY column
    [frame_clause]
)

LAST_VALUE(expression) OVER (
    [PARTITION BY column]
    ORDER BY column
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

Always specify `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` for `LAST_VALUE` to reference the actual last row in the partition.

## Examples

### Setup: Create Sample Data

```sql
CREATE TABLE exam_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_name VARCHAR(100) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    exam_date DATE,
    score INT
);

INSERT INTO exam_scores (student_name, subject, exam_date, score) VALUES
    ('Alice', 'Math',    '2026-01-10', 78),
    ('Alice', 'Math',    '2026-02-10', 85),
    ('Alice', 'Math',    '2026-03-10', 92),
    ('Alice', 'Science', '2026-01-12', 88),
    ('Alice', 'Science', '2026-02-12', 80),
    ('Alice', 'Science', '2026-03-12', 95),
    ('Bob',   'Math',    '2026-01-10', 70),
    ('Bob',   'Math',    '2026-02-10', 74),
    ('Bob',   'Math',    '2026-03-10', 69),
    ('Bob',   'Science', '2026-01-12', 82),
    ('Bob',   'Science', '2026-02-12', 87),
    ('Bob',   'Science', '2026-03-12', 84);
```

### FIRST_VALUE: First Score Per Student Per Subject

Retrieve the first (baseline) exam score alongside each row.

```sql
SELECT
    student_name,
    subject,
    exam_date,
    score,
    FIRST_VALUE(score) OVER (
        PARTITION BY student_name, subject
        ORDER BY exam_date
    ) AS first_score
FROM exam_scores
ORDER BY student_name, subject, exam_date;
```

```text
+--------------+---------+------------+-------+-------------+
| student_name | subject | exam_date  | score | first_score |
+--------------+---------+------------+-------+-------------+
| Alice        | Math    | 2026-01-10 | 78    | 78          |
| Alice        | Math    | 2026-02-10 | 85    | 78          |
| Alice        | Math    | 2026-03-10 | 92    | 78          |
| Alice        | Science | 2026-01-12 | 88    | 88          |
| Alice        | Science | 2026-02-12 | 80    | 88          |
| Alice        | Science | 2026-03-12 | 95    | 88          |
| Bob          | Math    | 2026-01-10 | 70    | 70          |
| ...          |         |            |       |             |
+--------------+---------+------------+-------+-------------+
```

### LAST_VALUE: Most Recent Score with Correct Frame

Retrieve the most recent exam score alongside each row. Note the required `UNBOUNDED FOLLOWING` frame.

```sql
SELECT
    student_name,
    subject,
    exam_date,
    score,
    LAST_VALUE(score) OVER (
        PARTITION BY student_name, subject
        ORDER BY exam_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS latest_score
FROM exam_scores
ORDER BY student_name, subject, exam_date;
```

```text
+--------------+---------+------------+-------+--------------+
| student_name | subject | exam_date  | score | latest_score |
+--------------+---------+------------+-------+--------------+
| Alice        | Math    | 2026-01-10 | 78    | 92           |
| Alice        | Math    | 2026-02-10 | 85    | 92           |
| Alice        | Math    | 2026-03-10 | 92    | 92           |
| Alice        | Science | 2026-01-12 | 88    | 95           |
| Alice        | Science | 2026-02-12 | 80    | 95           |
| Alice        | Science | 2026-03-12 | 95    | 95           |
| Bob          | Math    | 2026-01-10 | 70    | 69           |
| ...          |         |            |       |              |
+--------------+---------+------------+-------+--------------+
```

### Compute Score Improvement

Use FIRST_VALUE and LAST_VALUE together to compute the score change from first to last exam.

```sql
SELECT DISTINCT
    student_name,
    subject,
    FIRST_VALUE(score) OVER (
        PARTITION BY student_name, subject ORDER BY exam_date
    ) AS first_score,
    LAST_VALUE(score) OVER (
        PARTITION BY student_name, subject ORDER BY exam_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_score,
    LAST_VALUE(score) OVER (
        PARTITION BY student_name, subject ORDER BY exam_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) -
    FIRST_VALUE(score) OVER (
        PARTITION BY student_name, subject ORDER BY exam_date
    ) AS improvement
FROM exam_scores
ORDER BY student_name, subject;
```

```text
+--------------+---------+-------------+------------+-------------+
| student_name | subject | first_score | last_score | improvement |
+--------------+---------+-------------+------------+-------------+
| Alice        | Math    | 78          | 92         | 14          |
| Alice        | Science | 88          | 95         | 7           |
| Bob          | Math    | 70          | 69         | -1          |
| Bob          | Science | 82          | 84         | 2           |
+--------------+---------+-------------+------------+-------------+
```

### Using NTH_VALUE as a Generalization

`NTH_VALUE(expression, N)` is a related function that returns the value from the Nth row in the frame.

```sql
SELECT
    student_name,
    subject,
    exam_date,
    score,
    NTH_VALUE(score, 2) OVER (
        PARTITION BY student_name, subject
        ORDER BY exam_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_exam_score
FROM exam_scores
ORDER BY student_name, subject, exam_date;
```

## Best Practices

- Always use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` with LAST_VALUE to get the true last row of the partition.
- For FIRST_VALUE, the default frame is sufficient (it starts at the first row of the partition).
- Use `SELECT DISTINCT` combined with these functions when you only want one summary row per partition.
- Wrap FIRST_VALUE/LAST_VALUE in a CTE and SELECT DISTINCT to produce a concise per-group summary.
- Use NTH_VALUE when you need a value at an arbitrary position within the partition.

## Summary

FIRST_VALUE and LAST_VALUE are MySQL 8.0 window functions that retrieve the first and last values within an ordered window frame. FIRST_VALUE works correctly with the default frame, but LAST_VALUE requires explicitly setting `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to reference the actual last row in the partition. These functions are useful for comparing current values to baselines, calculating improvements over time, and generating summary columns alongside detail rows.
