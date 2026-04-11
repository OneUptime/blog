# How to Store Currency Values in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Currency, Decimal

Description: Learn how to store currency and monetary values in MySQL using DECIMAL to avoid floating-point rounding errors and ensure precise financial calculations.

---

Storing money incorrectly is a common source of subtle bugs in financial applications. Using floating-point types like `FLOAT` or `DOUBLE` introduces rounding errors that compound over time. MySQL's `DECIMAL` type is the correct choice for currency values.

## Why Not FLOAT or DOUBLE

```sql
-- Demonstration of floating-point imprecision
-- Use scientific notation (e0) to force DOUBLE type; bare decimals are exact in MySQL
SELECT 0.1e0 + 0.2e0;
-- Returns: 0.30000000000000004 (not 0.3)

SELECT CAST(0.1 AS DOUBLE) + CAST(0.2 AS DOUBLE);
-- Returns: 0.30000000000000004
```

`FLOAT` and `DOUBLE` are binary floating-point types that cannot exactly represent most decimal fractions. Even small errors accumulate across thousands of transactions.

## Using DECIMAL for Currency

`DECIMAL(precision, scale)` stores exact fixed-point numbers. For most currencies, `DECIMAL(10, 2)` supports values up to 99,999,999.99 with two decimal places:

```sql
CREATE TABLE invoices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

INSERT INTO invoices (customer_id, subtotal, tax_amount, total, currency_code)
VALUES (1, 149.99, 12.00, 161.99, 'USD');
```

## Choosing Precision and Scale

Different use cases require different precision:

```sql
-- Standard retail prices: up to 99,999,999.99
amount DECIMAL(10, 2)

-- High-value transactions (real estate, stock trades): up to 999,999,999,999.99
amount DECIMAL(14, 2)

-- Cryptocurrency with sub-cent precision (e.g. Bitcoin satoshis)
amount DECIMAL(20, 8)

-- Multi-currency where fractional cents matter
amount DECIMAL(12, 4)
```

## Arithmetic with DECIMAL

MySQL performs exact arithmetic on `DECIMAL` values:

```sql
-- Calculate order total with tax
SELECT
  subtotal,
  tax_amount,
  subtotal + tax_amount AS calculated_total,
  total AS stored_total
FROM invoices
WHERE id = 1;

-- Aggregate over many rows - still exact
SELECT
  currency_code,
  SUM(total) AS revenue,
  AVG(total) AS avg_order_value,
  COUNT(*) AS order_count
FROM invoices
GROUP BY currency_code;
```

## Storing Multi-Currency Data

When your application handles multiple currencies, store the currency code alongside the amount:

```sql
CREATE TABLE transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id INT UNSIGNED NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  exchange_rate DECIMAL(10, 6) NOT NULL DEFAULT 1.000000,
  amount_usd DECIMAL(14, 2) GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  transaction_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_account (account_id),
  INDEX idx_currency (currency_code)
);
```

The generated column `amount_usd` lets you query in a common currency without converting at query time.

## Storing Prices as Integer Cents

An alternative approach used by many payment systems is to store amounts as integer cents, avoiding decimal entirely:

```sql
CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  amount_cents BIGINT NOT NULL,   -- 1999 = $19.99
  currency_code CHAR(3) NOT NULL,
  PRIMARY KEY (id)
);

-- Insert $19.99
INSERT INTO payments (amount_cents, currency_code) VALUES (1999, 'USD');

-- Display formatted
SELECT amount_cents / 100.0 AS amount, currency_code FROM payments;
```

## Summary

Always use `DECIMAL(p, s)` for currency values in MySQL - never `FLOAT` or `DOUBLE`. For standard monetary amounts, `DECIMAL(10, 2)` covers most needs. For multi-currency systems, store the currency code in a `CHAR(3)` column alongside the amount. Alternatively, store amounts as integer cents in a `BIGINT` column for maximum simplicity and performance, converting to decimal only when displaying to users.
