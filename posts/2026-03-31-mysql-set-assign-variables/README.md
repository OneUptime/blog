# How to Use SET to Assign Variables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Variable, Session, Configuration, Query

Description: Learn how to use the MySQL SET statement to assign values to user-defined variables, system variables, and local procedure variables.

---

## What is the SET Statement?

`SET` is the primary way to assign values to variables in MySQL. It can assign values to three distinct types of variables:

1. **User-defined variables** (`@var`) - session-scoped, no declaration needed
2. **System variables** (`@@var`) - server configuration parameters
3. **Local procedure variables** (declared with `DECLARE`) - scoped to stored procedure blocks

## Assigning User-Defined Variables

```sql
-- Single assignment
SET @name = 'Alice';

-- Multiple assignments in one statement
SET @first = 'Alice', @last = 'Smith', @age = 30;

-- Expression assignment
SET @total = @price * @quantity;

-- NULL assignment
SET @cache = NULL;
```

## Assigning System Variables

System variables use the `GLOBAL` or `SESSION` qualifier. Without a qualifier, `SESSION` is assumed by default:

```sql
-- Session-level: affects only this connection
SET SESSION sort_buffer_size = 4194304;
SET @@SESSION.sort_buffer_size = 4194304;

-- Global-level: affects all new connections
SET GLOBAL max_connections = 500;
SET @@GLOBAL.max_connections = 500;

-- Persist to survive server restarts (MySQL 8.0+)
SET PERSIST max_connections = 500;
```

## Assigning Local Variables in Stored Procedures

Inside stored procedures, local variables are declared with `DECLARE` and assigned with `SET`:

```sql
DELIMITER //
CREATE PROCEDURE calculate_tax(IN amount DECIMAL(10,2))
BEGIN
  DECLARE tax_rate DECIMAL(5,4) DEFAULT 0.0875;
  DECLARE tax_amount DECIMAL(10,2);

  SET tax_amount = amount * tax_rate;

  SELECT amount AS subtotal, tax_amount AS tax, amount + tax_amount AS total;
END//
DELIMITER ;
```

## SET vs SELECT := for User Variables

Both `SET` and `SELECT :=` can assign user variables, but `SELECT :=` is deprecated as of MySQL 8.0.13 and will be removed in a future release. They have slightly different behaviors:

```sql
-- SET: straightforward assignment
SET @count = 0;

-- SELECT :=: assign and optionally display
SELECT @count := COUNT(*) FROM orders;

-- SELECT := evaluates for each row in multi-row queries
-- (useful for running totals, but use window functions in MySQL 8.0+)
SET @running = 0;
SELECT @running := @running + amount AS running_total
FROM transactions
ORDER BY created_at;
```

Always use `:=` inside `SELECT`, never `=` (which is treated as a comparison).

## Resetting Variables

```sql
-- Reset a user variable to NULL
SET @temp = NULL;

-- Reset a system variable to its default
SET SESSION sort_buffer_size = DEFAULT;
SET GLOBAL max_connections = DEFAULT;
```

## Chained Variable Assignment

```sql
-- Compute and store intermediate values
SET @subtotal = 100.00;
SET @discount = @subtotal * 0.10;
SET @tax = (@subtotal - @discount) * 0.08;
SET @total = @subtotal - @discount + @tax;

SELECT @subtotal, @discount, @tax, @total;
```

## Batch Assignment for Configuration

```sql
-- Set multiple session parameters at once for query optimization
SET SESSION
  sort_buffer_size = 8388608,
  join_buffer_size = 4194304,
  tmp_table_size = 33554432,
  max_heap_table_size = 33554432;
```

## Summary

The `SET` statement assigns values to user-defined variables (`@var`), system variables (`@@var`), and local procedure variables. Use `SET @var = value` for user variables within a session, `SET SESSION` or `SET GLOBAL` for system variables, and `SET PERSIST` to survive server restarts. Inside stored procedures, combine `DECLARE` with `SET` to manage locally scoped variables.
