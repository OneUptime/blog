# How to Use the -Distinct Aggregate Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Combinator, Distinct, SELECT, Performance

Description: Learn how the -Distinct combinator deduplicates inputs before aggregation, enabling sumDistinct, avgDistinct, and more - with a comparison to COUNT(DISTINCT).

---

Sometimes you want an aggregate function to operate only on unique values, discarding duplicates before computing the result. The standard SQL way to do this is `COUNT(DISTINCT col)`, but ClickHouse's combinator system generalizes this pattern to any aggregate function. By appending `-Distinct` to a function name you get `sumDistinct`, `avgDistinct`, `minDistinct`, and so on. This is particularly useful when the same value appears multiple times due to denormalized storage or fan-out joins, and you want each distinct value counted only once in the aggregation.

## Syntax

```text
aggFuncDistinct(column)
```

Before applying the aggregate logic, ClickHouse deduplicates the values of `column` within each group. Only unique values participate in the aggregation.

## Basic Setup

Create a table that simulates a common denormalization pattern: an event log where user attribute data is repeated on every row.

```sql
CREATE TABLE user_events
(
    event_id    UInt64,
    user_id     UInt32,
    department  String,
    salary      UInt32,   -- repeated on every event row for the same user
    event_type  String,
    event_time  DateTime
)
ENGINE = MergeTree()
ORDER BY (event_time, user_id);

INSERT INTO user_events VALUES
    (1, 101, 'engineering', 95000, 'login',    '2026-03-31 09:00:00'),
    (2, 101, 'engineering', 95000, 'pageview', '2026-03-31 09:05:00'),
    (3, 101, 'engineering', 95000, 'logout',   '2026-03-31 09:30:00'),
    (4, 102, 'engineering', 88000, 'login',    '2026-03-31 10:00:00'),
    (5, 102, 'engineering', 88000, 'pageview', '2026-03-31 10:10:00'),
    (6, 103, 'marketing',   72000, 'login',    '2026-03-31 10:15:00'),
    (7, 103, 'marketing',   72000, 'pageview', '2026-03-31 10:20:00'),
    (8, 104, 'marketing',   78000, 'login',    '2026-03-31 11:00:00');
```

User 101 has three event rows but a single salary of 95000. If you naively `sum(salary)` per department, you will triple-count the salary of users with many events.

## The Problem Without -Distinct

A naive sum of salaries over denormalized data overcounts:

```sql
SELECT
    department,
    sum(salary)         AS naive_salary_sum,
    count()             AS event_count
FROM user_events
GROUP BY department
ORDER BY department;
```

```text
department   naive_salary_sum  event_count
engineering  461000            5
marketing    222000            3
```

Engineering: 95000*3 + 88000*2 = 285000 + 176000 = 461000 (5 events). The sum is inflated because each event row contributes the salary again.

## Using sumDistinct()

`sumDistinct()` deduplicates salary values before summing. For engineering, the distinct salaries are {95000, 88000}, so the sum is 183000.

```sql
SELECT
    department,
    sumDistinct(salary)     AS correct_salary_sum,
    countDistinct(user_id)  AS unique_users
FROM user_events
GROUP BY department
ORDER BY department;
```

```text
department   correct_salary_sum  unique_users
engineering  183000              2
marketing    150000              2
```

Now each distinct salary value is counted exactly once per department group.

## avgDistinct() vs avg()

`avgDistinct()` averages only the distinct values, which changes the result when some values repeat.

```sql
SELECT
    department,
    avg(salary)         AS avg_with_duplicates,
    avgDistinct(salary) AS avg_distinct_salaries
FROM user_events
GROUP BY department
ORDER BY department;
```

```text
department   avg_with_duplicates  avg_distinct_salaries
engineering  92200                91500
marketing    74000                75000
```

`avg_with_duplicates` for engineering: (95000*3 + 88000*2) / 5 = 92200. `avgDistinct` for engineering: (95000 + 88000) / 2 = 91500. Only distinct salary values participate.

## Comparing countDistinct() with COUNT(DISTINCT)

Both forms count distinct values, but `-Distinct` composability lets you use it alongside other aggregations in one pass.

```sql
-- Standard SQL form
SELECT
    department,
    COUNT(DISTINCT user_id) AS uniq_users_sql
FROM user_events
GROUP BY department;

-- ClickHouse -Distinct combinator form
SELECT
    department,
    countDistinct(user_id)  AS uniq_users_combinator
FROM user_events
GROUP BY department;
```

Both return the same result. The combinator form is more convenient when combined with other aggregations:

```sql
SELECT
    department,
    countDistinct(user_id)   AS unique_users,
    sumDistinct(salary)      AS total_payroll,
    avgDistinct(salary)      AS avg_salary,
    count()                  AS total_events
FROM user_events
GROUP BY department
ORDER BY department;
```

```text
department   unique_users  total_payroll  avg_salary  total_events
engineering  2             183000         91500       5
marketing    2             150000         75000       3
```

## -Distinct with groupArray

`groupArrayDistinct()` collects only distinct values into an array, which is useful for building deduplicated lists per group.

```sql
SELECT
    department,
    groupArrayDistinct(event_type) AS distinct_event_types
FROM user_events
GROUP BY department
ORDER BY department;
```

```text
department   distinct_event_types
engineering  ['login','pageview','logout']
marketing    ['login','pageview']
```

Compare this to `groupArray(event_type)`, which would include duplicates for every event row.

## Performance Considerations

`-Distinct` deduplication happens in memory within each aggregation group. For high-cardinality columns, this can use significant RAM. If you only need approximate distinct counts, prefer `uniq()` or `uniqHLL12()` instead of `countDistinct()`. For exact distinct sums or averages on denormalized data, `-Distinct` is the correct tool.

```sql
-- Approximate distinct count (much lower memory usage)
SELECT
    department,
    uniq(user_id) AS approx_unique_users
FROM user_events
GROUP BY department;

-- Exact distinct count (uses a hash set internally)
SELECT
    department,
    countDistinct(user_id) AS exact_unique_users
FROM user_events
GROUP BY department;
```

## Summary

The `-Distinct` combinator is a generalization of `COUNT(DISTINCT ...)` that works with any aggregate function in ClickHouse. Use `sumDistinct()` to sum unique values only, `avgDistinct()` to average unique values, and `groupArrayDistinct()` to collect deduplicated lists. It is most valuable when working with denormalized tables where dimension attributes are repeated across many fact rows. For high-cardinality approximate distinct counts, prefer `uniq()` variants for better performance.
