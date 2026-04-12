# How to Create or Replace a View in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, View, CREATE OR REPLACE, DDL, Schema Management

Description: Learn how to use CREATE OR REPLACE VIEW in MySQL to update a view definition atomically without dropping and recreating it manually.

---

When you need to modify an existing view, MySQL provides `CREATE OR REPLACE VIEW` as a single atomic statement. It either creates the view if it does not exist or replaces the definition if it does, without requiring a separate `DROP VIEW` step.

## Syntax

```sql
CREATE OR REPLACE VIEW view_name AS
SELECT ...;
```

This is similar in effect to:

```sql
DROP VIEW IF EXISTS view_name;
CREATE VIEW view_name AS SELECT ...;
```

But `CREATE OR REPLACE VIEW` is atomic - concurrent queries will block rather than encounter a "view does not exist" error. It also preserves any existing privileges granted on the view, which a drop-then-create sequence does not.

## Example 1 - Creating a New View

```sql
CREATE OR REPLACE VIEW active_users AS
SELECT user_id, username, email, last_login
FROM users
WHERE status = 'active';
```

If `active_users` does not exist, this creates it. If it already exists, the definition is replaced.

## Example 2 - Adding a Column to an Existing View

```sql
-- Original view
CREATE VIEW product_summary AS
SELECT product_id, name, price
FROM products;

-- Updated view - add category_name column
CREATE OR REPLACE VIEW product_summary AS
SELECT p.product_id, p.name, p.price, c.category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id;
```

The replacement takes effect immediately for all subsequent queries.

## Limitations of CREATE OR REPLACE VIEW

There is one important consideration: MySQL does not prevent you from changing column names or reducing the number of columns. However, if other views or application queries depend on specific column names or positions, those dependent objects will fail at query time. In practice you can freely add columns, but removing or renaming columns risks breaking dependent objects.

To check for dependent views:

```sql
SELECT TABLE_NAME, VIEW_DEFINITION
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'mydb'
  AND VIEW_DEFINITION LIKE '%product_summary%';
```

## Updating View Options

`CREATE OR REPLACE VIEW` also lets you change view options like `ALGORITHM`, `DEFINER`, and `SQL SECURITY`:

```sql
CREATE OR REPLACE
    ALGORITHM = TEMPTABLE
    DEFINER = 'dba'@'localhost'
    SQL SECURITY INVOKER
VIEW product_summary AS
SELECT p.product_id, p.name, p.price, c.category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id;
```

`ALGORITHM = TEMPTABLE` forces MySQL to materialize the view into a temporary table before returning results, which is useful for views with `GROUP BY` or `DISTINCT` that cannot be merged inline.

## Verify the Updated View

After replacing, confirm the new definition:

```sql
SHOW CREATE VIEW product_summary\G
```

Test the updated view:

```sql
SELECT * FROM product_summary LIMIT 5;
```

## Summary

Use `CREATE OR REPLACE VIEW` to update a view definition in a single atomic operation. It is safer than a drop-then-create sequence because concurrent queries will block briefly rather than fail with a "view does not exist" error, and existing privileges on the view are preserved. It also lets you change the `ALGORITHM`, `DEFINER`, and `SQL SECURITY` options at the same time as the query definition.
