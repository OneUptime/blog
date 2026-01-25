# How to Declare and Use Variables in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SQL, PL/pgSQL, Variables, Stored Procedures, Functions

Description: Learn how to declare and use variables in PostgreSQL using PL/pgSQL, DO blocks, and CTEs. This guide covers variable types, scope, assignment, and practical patterns for dynamic queries.

---

Unlike some databases, PostgreSQL does not support variables in plain SQL statements. However, you have several options: PL/pgSQL blocks, configuration parameters, and CTEs. Each approach has its use cases, and understanding them helps you write more flexible and maintainable queries.

## Variables in PL/pgSQL Functions

The most powerful way to use variables in PostgreSQL is within PL/pgSQL functions.

```sql
-- Create a function with variables
CREATE OR REPLACE FUNCTION calculate_order_total(order_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    -- Variable declarations
    subtotal DECIMAL(10,2);
    tax_rate DECIMAL(4,4) := 0.0825;  -- Default value
    discount DECIMAL(10,2) := 0;
    final_total DECIMAL(10,2);
BEGIN
    -- Calculate subtotal from order items
    SELECT SUM(quantity * unit_price)
    INTO subtotal
    FROM order_items
    WHERE order_items.order_id = calculate_order_total.order_id;

    -- Apply discount for large orders
    IF subtotal > 1000 THEN
        discount := subtotal * 0.10;  -- 10% discount
    END IF;

    -- Calculate final total
    final_total := subtotal - discount + (subtotal * tax_rate);

    RETURN final_total;
END;
$$ LANGUAGE plpgsql;

-- Use the function
SELECT calculate_order_total(123);
```

## DO Blocks for Ad-Hoc Scripts

When you need variables without creating a permanent function, use anonymous DO blocks.

```sql
-- Anonymous block with variables
DO $$
DECLARE
    user_count INTEGER;
    active_count INTEGER;
    inactive_ratio DECIMAL(5,2);
BEGIN
    -- Count total users
    SELECT COUNT(*) INTO user_count FROM users;

    -- Count active users
    SELECT COUNT(*) INTO active_count
    FROM users
    WHERE last_login > CURRENT_DATE - INTERVAL '30 days';

    -- Calculate ratio
    IF user_count > 0 THEN
        inactive_ratio := 100.0 * (user_count - active_count) / user_count;
    ELSE
        inactive_ratio := 0;
    END IF;

    -- Output results (use RAISE NOTICE since DO blocks cannot return values)
    RAISE NOTICE 'Total users: %, Active: %, Inactive ratio: %%',
        user_count, active_count, inactive_ratio;
END;
$$;
```

## Variable Data Types

PL/pgSQL supports all PostgreSQL data types plus some special types.

```sql
CREATE OR REPLACE FUNCTION demonstrate_variable_types()
RETURNS void AS $$
DECLARE
    -- Basic types
    my_integer INTEGER := 42;
    my_text TEXT := 'Hello, World';
    my_decimal DECIMAL(10,2) := 123.45;
    my_boolean BOOLEAN := true;
    my_date DATE := CURRENT_DATE;
    my_timestamp TIMESTAMP := CURRENT_TIMESTAMP;

    -- Array type
    my_array INTEGER[] := ARRAY[1, 2, 3, 4, 5];

    -- JSON type
    my_json JSONB := '{"name": "test", "value": 100}'::JSONB;

    -- Record type (for storing row data)
    my_record RECORD;

    -- Type copied from table column
    user_email users.email%TYPE;

    -- Type copied from entire row
    user_row users%ROWTYPE;

    -- Constant (cannot be changed)
    PI CONSTANT DECIMAL := 3.14159;
BEGIN
    -- Use variables
    RAISE NOTICE 'Integer: %, Array length: %',
        my_integer, array_length(my_array, 1);

    -- Fetch a row into record
    SELECT * INTO my_record FROM users LIMIT 1;
    RAISE NOTICE 'First user: %', my_record.username;
END;
$$ LANGUAGE plpgsql;
```

## Using CTEs as Variable Substitutes

For pure SQL without PL/pgSQL, CTEs can serve as pseudo-variables.

```sql
-- Use CTE as a variable container
WITH params AS (
    SELECT
        DATE '2026-01-01' AS start_date,
        DATE '2026-01-31' AS end_date,
        0.0825 AS tax_rate,
        100 AS minimum_order
)
SELECT
    o.id,
    o.order_date,
    o.subtotal,
    o.subtotal * p.tax_rate AS tax_amount,
    o.subtotal * (1 + p.tax_rate) AS total
FROM orders o
CROSS JOIN params p
WHERE o.order_date BETWEEN p.start_date AND p.end_date
    AND o.subtotal >= p.minimum_order;

-- Multiple CTEs for complex calculations
WITH
    tax_config AS (SELECT 0.0825 AS rate),
    discount_config AS (SELECT 0.10 AS rate, 1000 AS threshold)
SELECT
    o.id,
    o.subtotal,
    CASE
        WHEN o.subtotal > d.threshold THEN o.subtotal * d.rate
        ELSE 0
    END AS discount,
    o.subtotal * t.rate AS tax
FROM orders o
CROSS JOIN tax_config t
CROSS JOIN discount_config d;
```

## Session Variables with set_config

PostgreSQL allows setting custom session variables using configuration parameters.

```sql
-- Set a custom variable for the session
SELECT set_config('myapp.user_id', '42', false);

-- Retrieve the variable value
SELECT current_setting('myapp.user_id');

-- Use in queries
SELECT *
FROM audit_log
WHERE user_id = current_setting('myapp.user_id')::INTEGER;

-- Set variable for current transaction only
SELECT set_config('myapp.batch_size', '1000', true);  -- true = local to transaction

-- In a transaction
BEGIN;
    SELECT set_config('myapp.processing_date', '2026-01-25', true);

    -- Use the variable
    INSERT INTO processed_items (item_id, process_date)
    SELECT id, current_setting('myapp.processing_date')::DATE
    FROM pending_items
    LIMIT current_setting('myapp.batch_size')::INTEGER;
COMMIT;
-- Variable is gone after commit
```

## Variable Scope in PL/pgSQL

Variables have block-level scope in PL/pgSQL.

```sql
CREATE OR REPLACE FUNCTION scope_example()
RETURNS void AS $$
DECLARE
    outer_var INTEGER := 10;
BEGIN
    RAISE NOTICE 'Outer block: outer_var = %', outer_var;

    -- Nested block with its own scope
    DECLARE
        inner_var INTEGER := 20;
        outer_var INTEGER := 30;  -- Shadows the outer variable
    BEGIN
        RAISE NOTICE 'Inner block: inner_var = %, outer_var = %',
            inner_var, outer_var;
    END;

    -- inner_var is not accessible here
    -- outer_var is back to 10
    RAISE NOTICE 'Back to outer: outer_var = %', outer_var;
END;
$$ LANGUAGE plpgsql;
```

## Assigning Values to Variables

PostgreSQL offers several ways to assign values to variables.

```sql
CREATE OR REPLACE FUNCTION assignment_examples()
RETURNS void AS $$
DECLARE
    var1 INTEGER;
    var2 INTEGER;
    var3 TEXT;
    rec RECORD;
BEGIN
    -- Direct assignment
    var1 := 100;

    -- Assignment from SELECT
    SELECT COUNT(*) INTO var2 FROM users;

    -- Multiple assignments from one SELECT
    SELECT
        username,
        email
    INTO
        var3,
        rec  -- This would need rec to be proper type
    FROM users
    LIMIT 1;

    -- Assignment using SELECT INTO with STRICT
    -- Raises error if not exactly one row
    SELECT username INTO STRICT var3
    FROM users
    WHERE id = 1;

    -- Assignment from expression
    var1 := var2 * 2 + 10;

    RAISE NOTICE 'var1=%, var2=%, var3=%', var1, var2, var3;
END;
$$ LANGUAGE plpgsql;
```

## Looping with Variables

Variables are essential for loop control.

```sql
CREATE OR REPLACE FUNCTION loop_with_variables()
RETURNS TABLE(iteration INTEGER, value TEXT) AS $$
DECLARE
    i INTEGER;
    current_user RECORD;
BEGIN
    -- FOR loop with integer variable
    FOR i IN 1..5 LOOP
        iteration := i;
        value := 'Iteration ' || i;
        RETURN NEXT;
    END LOOP;

    -- FOR loop over query results
    FOR current_user IN SELECT id, username FROM users LIMIT 3 LOOP
        iteration := current_user.id;
        value := current_user.username;
        RETURN NEXT;
    END LOOP;

    -- WHILE loop
    i := 1;
    WHILE i <= 3 LOOP
        iteration := i * 10;
        value := 'While ' || i;
        RETURN NEXT;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM loop_with_variables();
```

## Variables in Dynamic SQL

When building dynamic queries, variables help construct the SQL safely.

```sql
CREATE OR REPLACE FUNCTION search_users(
    search_column TEXT,
    search_value TEXT
) RETURNS TABLE(id INTEGER, username VARCHAR, email VARCHAR) AS $$
DECLARE
    query_text TEXT;
BEGIN
    -- Build query dynamically
    query_text := format(
        'SELECT id, username, email FROM users WHERE %I = $1',
        search_column
    );

    -- Execute with parameter binding (prevents SQL injection)
    RETURN QUERY EXECUTE query_text USING search_value;
END;
$$ LANGUAGE plpgsql;

-- Safe to call with user input
SELECT * FROM search_users('email', 'user@example.com');
```

## Exception Handling with Variables

Capture error details into variables for logging.

```sql
CREATE OR REPLACE FUNCTION safe_division(a DECIMAL, b DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    result DECIMAL;
    error_message TEXT;
    error_detail TEXT;
BEGIN
    result := a / b;
    RETURN result;
EXCEPTION
    WHEN division_by_zero THEN
        GET STACKED DIAGNOSTICS
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL;

        RAISE WARNING 'Division by zero: % - %', error_message, error_detail;
        RETURN NULL;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE WARNING 'Unexpected error: %', error_message;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

Follow these guidelines for working with variables in PostgreSQL.

```sql
-- Use meaningful variable names
DECLARE
    total_revenue DECIMAL(12,2);  -- Good
    tr DECIMAL(12,2);              -- Too cryptic

-- Initialize variables with defaults when appropriate
DECLARE
    retry_count INTEGER := 0;
    max_retries CONSTANT INTEGER := 3;
    error_message TEXT := '';

-- Use %TYPE for type safety
DECLARE
    user_id users.id%TYPE;        -- Always matches column type
    order_total orders.total%TYPE;

-- Prefer STRICT for single-row queries to catch errors
SELECT value INTO STRICT my_var FROM config WHERE key = 'setting';
```

While PostgreSQL does not have native SQL variables like some databases, PL/pgSQL provides a rich variable system for functions and procedures. For ad-hoc queries, CTEs and session configuration parameters offer practical alternatives. Choose the approach that best fits your use case and performance requirements.
