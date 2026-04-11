# How to Use STRCMP() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how MySQL's STRCMP() function compares two strings and returns -1, 0, or 1, with practical examples for sorting and conditional logic.

---

## What is STRCMP()?

The `STRCMP()` function in MySQL compares two strings lexicographically and returns an integer result:

- `-1` if the first string is less than the second
- `0` if both strings are equal
- `1` if the first string is greater than the second

The syntax is:

```sql
STRCMP(str1, str2)
```

The comparison is case-insensitive by default when using a case-insensitive collation (such as `utf8mb4_unicode_ci`), but case-sensitive when using a binary or case-sensitive collation.

## Basic Examples

```sql
SELECT STRCMP('apple', 'banana');
-- Result: -1 (apple < banana)

SELECT STRCMP('hello', 'hello');
-- Result: 0 (equal)

SELECT STRCMP('zebra', 'apple');
-- Result: 1 (zebra > apple)
```

## Case Sensitivity Behavior

With the default case-insensitive collation:

```sql
SELECT STRCMP('Hello', 'hello');
-- Result: 0 (treated as equal)
```

To force case-sensitive comparison, use `BINARY`:

```sql
SELECT STRCMP(BINARY 'Hello', BINARY 'hello');
-- Result: -1 (H < h in binary, since uppercase letters have lower code points)
```

## Using STRCMP() in SELECT Queries

You can use `STRCMP()` to build comparison output alongside your data:

```sql
SELECT
  product_name,
  category,
  STRCMP(category, 'Electronics') AS vs_electronics
FROM products;
```

This returns -1, 0, or 1 for each row, indicating whether the category is before, equal to, or after "Electronics" alphabetically.

## Using STRCMP() in WHERE Clause

Filter rows where a string column equals a target value:

```sql
SELECT *
FROM users
WHERE STRCMP(status, 'active') = 0;
```

This is equivalent to `WHERE status = 'active'`, but can be useful in dynamic SQL or when you need the numeric result for further computation.

## Comparing User Input

```sql
SELECT
  username,
  STRCMP(username, 'admin') AS compared_to_admin
FROM accounts
ORDER BY compared_to_admin;
```

## Combining STRCMP() with CASE

```sql
SELECT
  product_name,
  CASE STRCMP(stock_status, 'in_stock')
    WHEN 0  THEN 'Available'
    WHEN -1 THEN 'Status is before in_stock'
    WHEN 1  THEN 'Status is after in_stock'
  END AS stock_label
FROM products;
```

## NULL Handling

If either argument is `NULL`, `STRCMP()` returns `NULL`:

```sql
SELECT STRCMP('hello', NULL);
-- Result: NULL
```

Always guard against NULL inputs using `COALESCE()` when the column is nullable:

```sql
SELECT STRCMP(COALESCE(nickname, ''), 'guest') AS cmp
FROM users;
```

## Practical Example - Alphabetical Boundary Check

Check which product codes fall before a given sentinel value alphabetically:

```sql
SELECT product_code, product_name
FROM products
WHERE STRCMP(product_code, 'M000') < 0
ORDER BY product_code;
```

This returns all codes that sort before `M000`.

## Summary

`STRCMP()` compares two strings and returns -1, 0, or 1 indicating their lexicographic order. By default the comparison is case-insensitive under the active collation - use `BINARY` for case-sensitive comparisons. It returns `NULL` when either argument is `NULL`. Most equality checks are simpler with `=`, but `STRCMP()` is useful when you need the directional result (-1/0/1) for `CASE` expressions, ordering logic, or computed columns.
