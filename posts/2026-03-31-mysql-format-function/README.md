# How to Use FORMAT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Number Formatting, Database

Description: Learn how to use MySQL FORMAT() to format numbers with comma separators and decimal places for readable output in reports and applications.

---

## What Is the FORMAT() Function?

`FORMAT()` in MySQL formats a number to a specified number of decimal places and returns it as a string with comma (`,`) grouping separators for thousands. It is primarily used for display purposes in reports and user-facing output.

**Syntax:**

```sql
FORMAT(number, decimal_places)
FORMAT(number, decimal_places, locale)
```

- `number` - the numeric value to format.
- `decimal_places` - the number of digits after the decimal point. If `0`, no decimal point is shown.
- `locale` - optional locale string (e.g., `'de_DE'`) to control separator characters (added in MySQL 5.6).

The return type is always a `VARCHAR` string, not a number.

---

## Basic Examples

```sql
SELECT FORMAT(1234567.891, 2);
-- Returns: '1,234,567.89'

SELECT FORMAT(9999.5, 0);
-- Returns: '10,000'

SELECT FORMAT(0.1234, 4);
-- Returns: '0.1234'

SELECT FORMAT(1000000, 2);
-- Returns: '1,000,000.00'
```

---

## Using a Locale

The optional third argument accepts a locale name to change grouping and decimal separators:

```sql
-- German locale: uses . for thousands, , for decimal
SELECT FORMAT(1234567.89, 2, 'de_DE');
-- Returns: '1.234.567,89'

-- US locale (default)
SELECT FORMAT(1234567.89, 2, 'en_US');
-- Returns: '1,234,567.89'
```

---

## NULL and Edge Cases

```sql
SELECT FORMAT(NULL, 2);
-- Returns: NULL

SELECT FORMAT(123.456, -1);
-- Returns: '123'  (negative decimal places are treated as 0)

SELECT FORMAT(-9876.54, 2);
-- Returns: '-9,876.54'
```

---

## How FORMAT() Processes Numbers

```mermaid
flowchart LR
    A[Input number] --> B[Round to N decimal places]
    B --> C[Apply thousands grouping separator]
    C --> D{Locale specified?}
    D -- Yes --> E[Apply locale-specific separators]
    D -- No --> F[Use default: comma for groups, period for decimal]
    E --> G[Return VARCHAR string]
    F --> G
```

---

## Practical Use: Financial Reports

```sql
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product VARCHAR(100),
    revenue DECIMAL(15, 2)
);

INSERT INTO sales (product, revenue) VALUES
('Widget Pro', 1234567.89),
('Gadget Plus', 98765.43),
('Super Tool', 7500000.00);

SELECT
    product,
    FORMAT(revenue, 2) AS formatted_revenue
FROM sales;
```

Result:

| product     | formatted_revenue |
|-------------|-------------------|
| Widget Pro  | 1,234,567.89      |
| Gadget Plus | 98,765.43         |
| Super Tool  | 7,500,000.00      |

---

## Combining FORMAT() with CONCAT()

Since `FORMAT()` returns a string, you can prefix it with a currency symbol:

```sql
SELECT
    product,
    CONCAT('$', FORMAT(revenue, 2)) AS price
FROM sales;
```

Result:

| product     | price           |
|-------------|-----------------|
| Widget Pro  | $1,234,567.89   |
| Gadget Plus | $98,765.43      |
| Super Tool  | $7,500,000.00   |

---

## FORMAT() in Aggregate Queries

```sql
SELECT
    FORMAT(SUM(revenue), 2) AS total_revenue,
    FORMAT(AVG(revenue), 2) AS avg_revenue,
    FORMAT(MAX(revenue), 0) AS peak_revenue
FROM sales;
```

---

## Important: FORMAT() Returns a String

A critical point is that `FORMAT()` always returns a `VARCHAR`. This means you cannot perform arithmetic on the result directly.

```sql
-- Incorrect: comparing string to number may give unexpected results
SELECT FORMAT(100, 2) + 50;
-- MySQL coerces the string, but this is not reliable

-- Correct: format only at the final output stage
SELECT FORMAT(100 + 50, 2);
-- Returns: '150.00'
```

**Best practice:** Apply `FORMAT()` only in the final `SELECT` list after all calculations are complete.

---

## FORMAT() vs ROUND() vs TRUNCATE()

| Function        | Returns    | Groups with commas | Locale support |
|-----------------|------------|--------------------|----------------|
| `FORMAT(n, d)`  | VARCHAR    | Yes                | Yes            |
| `ROUND(n, d)`   | Numeric    | No                 | No             |
| `TRUNCATE(n, d)`| Numeric    | No                 | No             |

```sql
SELECT ROUND(1234567.891, 2);     -- 1234567.89  (number)
SELECT TRUNCATE(1234567.891, 2);  -- 1234567.89  (number)
SELECT FORMAT(1234567.891, 2);    -- '1,234,567.89' (string)
```

---

## Using FORMAT() with Zero Decimals for Whole Numbers

```sql
SELECT FORMAT(COUNT(*), 0) AS total_orders FROM orders;
-- Returns something like: '1,500'
```

---

## Summary

`FORMAT()` is MySQL's built-in number-to-string formatter that adds thousands separators and controls decimal precision. It is ideal for display layers in reports and dashboards. Remember that its output is always a `VARCHAR` string, so keep arithmetic operations on the raw numeric values and apply `FORMAT()` only at the final output step. Use the locale parameter when building applications for international audiences.
