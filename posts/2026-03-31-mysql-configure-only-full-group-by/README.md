# How to Configure ONLY_FULL_GROUP_BY SQL Mode in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Mode, GROUP BY, Configuration, Query

Description: Learn how ONLY_FULL_GROUP_BY SQL mode works in MySQL and how to configure it to enforce standard GROUP BY behavior in your queries.

---

`ONLY_FULL_GROUP_BY` is a SQL mode that makes MySQL enforce standard SQL behavior for `GROUP BY` queries. Without it, MySQL allows non-aggregated columns in the SELECT list that are not part of the GROUP BY clause - behavior that can return unpredictable results. This mode is enabled by default in MySQL 5.7.5 and later.

## What ONLY_FULL_GROUP_BY Enforces

Under standard SQL rules, every column in the SELECT list that is not an aggregate function must appear in the GROUP BY clause. MySQL's `ONLY_FULL_GROUP_BY` enforces this rule.

Without this mode, the following query works but returns an arbitrary `name` value per group:

```sql
SELECT id, name, department, COUNT(*) AS cnt
FROM employees
GROUP BY department;
-- Returns one arbitrary name per department
```

With `ONLY_FULL_GROUP_BY` enabled, the same query raises an error:

```text
ERROR 1055 (42000): Expression #1 of SELECT list is not in GROUP BY clause
```

## Correct Query Form

To satisfy `ONLY_FULL_GROUP_BY`, include all non-aggregate columns in the GROUP BY:

```sql
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department;
```

Or use an aggregate function:

```sql
SELECT department, ANY_VALUE(name) AS sample_name, COUNT(*) AS cnt
FROM employees
GROUP BY department;
```

The `ANY_VALUE()` function explicitly tells MySQL you accept any value from the group, making the intent clear.

## Checking Whether the Mode Is Active

```sql
SELECT @@sql_mode LIKE '%ONLY_FULL_GROUP_BY%';
```

## Enabling ONLY_FULL_GROUP_BY

Enable it at runtime:

```sql
SET GLOBAL sql_mode = CONCAT(@@GLOBAL.sql_mode, ',ONLY_FULL_GROUP_BY');
```

Persist it in `my.cnf`:

```ini
[mysqld]
sql_mode = ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
```

## Functional Dependency Exception

MySQL 5.7.6 and later supports functional dependency detection. If a column is functionally dependent on the GROUP BY columns - for example if you group by a primary key - MySQL allows selecting other columns from the same table without including them in GROUP BY:

```sql
SELECT id, name, department, COUNT(*) AS cnt
FROM employees
GROUP BY id;
-- Allowed because id is the primary key; name and department are functionally dependent on it
```

## Impact on ORM-Generated Queries

ORM frameworks like Hibernate, SQLAlchemy, or Laravel Eloquent sometimes generate queries that violate `ONLY_FULL_GROUP_BY`. When enabling this mode, run your full application test suite to identify generated queries that need adjustment. Common fixes include:

- Adding missing columns to the GROUP BY clause
- Wrapping ambiguous columns in `ANY_VALUE()`
- Rewriting queries to use subqueries or CTEs

## Summary

`ONLY_FULL_GROUP_BY` enforces standard SQL semantics for GROUP BY queries, eliminating a class of non-deterministic results. It is enabled by default in MySQL 5.7.5 and later and should remain active in new applications. For legacy codebases, use `ANY_VALUE()` to explicitly mark columns where you accept arbitrary group values rather than disabling the mode entirely.
