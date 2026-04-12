# How to Use DECIMAL Data Type in MySQL for Exact Precision

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Decimal, Data Type, Precision, Financial Data

Description: The MySQL DECIMAL type stores exact numeric values with user-defined precision and scale, making it essential for financial and monetary data.

---

## Why DECIMAL Instead of FLOAT or DOUBLE

`FLOAT` and `DOUBLE` use binary floating-point arithmetic, which cannot represent all decimal fractions exactly. For example, `0.1 + 0.2` in floating-point equals `0.30000000000000004`, not `0.3`. This is unacceptable for financial calculations.

`DECIMAL` stores numbers as exact decimal values with no rounding errors, making it the correct choice for:
- Monetary amounts
- Tax and discount calculations
- Interest rates
- Measurements requiring precision

## DECIMAL Syntax

```sql
DECIMAL(precision, scale)
```

- `precision` - total number of significant digits (1 to 65)
- `scale` - number of digits to the right of the decimal point (0 to 30)

Examples:
- `DECIMAL(10, 2)` - up to 10 digits total, 2 after the decimal (e.g., `99999999.99`)
- `DECIMAL(5, 0)` - whole numbers up to 5 digits
- `DECIMAL(15, 4)` - useful for exchange rates and high-precision finance

## Creating a Table with DECIMAL Columns

```sql
CREATE TABLE invoices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id INT UNSIGNED NOT NULL,
  subtotal     DECIMAL(12, 2) NOT NULL,
  tax_rate     DECIMAL(5, 4) NOT NULL,
  tax_amount   DECIMAL(12, 2) NOT NULL,
  total        DECIMAL(12, 2) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Inserting and Querying DECIMAL Values

```sql
INSERT INTO invoices (customer_id, subtotal, tax_rate, tax_amount, total)
VALUES (101, 149.99, 0.0875, 13.12, 163.11);

SELECT id, subtotal, tax_rate, total FROM invoices WHERE id = 1;
```

Output:

```text
+----+----------+----------+--------+
| id | subtotal | tax_rate | total  |
+----+----------+----------+--------+
|  1 |   149.99 |   0.0875 | 163.11 |
+----+----------+----------+--------+
```

## Performing Exact Arithmetic

```sql
-- Calculate tax with exact precision
SELECT
  subtotal,
  tax_rate,
  ROUND(subtotal * tax_rate, 2) AS calculated_tax,
  ROUND(subtotal * (1 + tax_rate), 2) AS calculated_total
FROM invoices;
```

Because `subtotal` and `tax_rate` are DECIMAL, `subtotal * tax_rate` returns an exact DECIMAL result with no floating-point error.

## DECIMAL Aliases

MySQL also accepts `NUMERIC` and `DEC` as aliases for `DECIMAL`:

```sql
price NUMERIC(10, 2)   -- same as DECIMAL(10, 2)
amount DEC(12, 4)      -- same as DECIMAL(12, 4)
```

## Default Precision and Scale

If you omit the parameters, MySQL defaults to `DECIMAL(10, 0)`:

```sql
-- Equivalent to DECIMAL(10, 0) - stores integers up to 10 digits
amount DECIMAL
```

Always specify precision and scale explicitly to avoid surprises.

## Storage Size

DECIMAL stores digits in packs of 9 digits per 4 bytes. The storage required is calculated based on the precision:

- Up to 9 digits: 4 bytes per group
- Remaining digits: proportional bytes

For typical financial columns like `DECIMAL(10,2)`, storage is 5 bytes.

## Overflow and Rounding Behavior

In strict SQL mode, inserting a value that exceeds the defined range raises an error:

```sql
INSERT INTO invoices (customer_id, subtotal, tax_rate, tax_amount, total)
VALUES (102, 9999999999999.99, 0.1, 999999999999.99, 10999999999999.98);
```

```text
ERROR 1264 (22003): Out of range value for column 'subtotal' at row 1
```

If a value has more decimal places than the scale, MySQL rounds it:

```sql
-- DECIMAL(12, 2) column - value with 4 decimal places gets rounded
INSERT INTO invoices (customer_id, subtotal, tax_rate, tax_amount, total)
VALUES (103, 99.9999, 0.0875, 8.75, 108.75);
-- subtotal stored as 100.00
```

## Comparing DECIMAL to FLOAT

```sql
-- This demonstrates the difference between DECIMAL and FLOAT
CREATE TABLE precision_test (
  dec_val DECIMAL(10, 2),
  flt_val FLOAT
);

INSERT INTO precision_test VALUES (0.1 + 0.2, 0.1 + 0.2);

-- CAST the FLOAT to a high-precision DECIMAL to reveal the stored imprecision
SELECT dec_val, CAST(flt_val AS DECIMAL(20, 17)) AS flt_val FROM precision_test;
```

```text
+---------+----------------------+
| dec_val | flt_val              |
+---------+----------------------+
|    0.30 | 0.30000001192092896  |
+---------+----------------------+
```

DECIMAL returns the exact value `0.30`. FLOAT introduces a small rounding error that is revealed when cast to a higher-precision type.

## Summary

Use `DECIMAL(precision, scale)` in MySQL whenever exact numeric storage is required, especially for financial and monetary values. Unlike `FLOAT` or `DOUBLE`, DECIMAL stores values exactly without floating-point rounding errors. Always define both precision and scale explicitly, and use `ROUND()` when performing arithmetic to control the number of decimal places in the result.
