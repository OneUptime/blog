# How to Create PostgreSQL Stored Procedures Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Database, SQL, Performance

Description: Write maintainable stored procedures in PostgreSQL with proper error handling, transaction control, and performance optimization patterns.

---

PostgreSQL stored procedures have been a core feature since version 11, offering transaction control capabilities that functions cannot provide. This guide covers practical patterns for writing production-ready stored procedures with proper error handling, debugging techniques, and performance considerations.

## CREATE PROCEDURE vs CREATE FUNCTION

Before diving into procedures, you need to understand when to use each. PostgreSQL supports both functions and procedures, but they serve different purposes.

### Key Differences

| Feature | FUNCTION | PROCEDURE |
|---------|----------|-----------|
| Returns a value | Yes (required) | No (optional via OUT parameters) |
| Transaction control | No (runs in caller's transaction) | Yes (COMMIT/ROLLBACK allowed) |
| Called with | SELECT or in expressions | CALL statement only |
| Can be used in triggers | Yes | No |
| Introduced in PostgreSQL | Always available | Version 11+ |

### When to Use Functions

Use functions when you need to:
- Return computed values in SELECT statements
- Create reusable logic for triggers
- Build custom operators or aggregates
- Encapsulate calculations used in WHERE clauses

Here is a simple function that calculates order totals:

```sql
CREATE OR REPLACE FUNCTION calculate_order_total(order_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC := 0;
BEGIN
    SELECT SUM(quantity * unit_price)
    INTO total
    FROM order_items
    WHERE order_items.order_id = calculate_order_total.order_id;

    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;

-- Usage in a query
SELECT order_id, calculate_order_total(order_id) as total
FROM orders
WHERE status = 'pending';
```

### When to Use Procedures

Use procedures when you need to:
- Perform multi-step operations with intermediate commits
- Process large batches of data without holding locks
- Implement complex workflows with explicit transaction boundaries
- Handle operations that should not be rolled back together

Here is a procedure that processes orders in batches:

```sql
CREATE OR REPLACE PROCEDURE process_pending_orders(batch_size INTEGER DEFAULT 100)
LANGUAGE plpgsql AS $$
DECLARE
    processed_count INTEGER := 0;
    order_record RECORD;
BEGIN
    FOR order_record IN
        SELECT order_id FROM orders
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT batch_size
    LOOP
        -- Process each order
        UPDATE orders
        SET status = 'processing',
            updated_at = NOW()
        WHERE order_id = order_record.order_id;

        processed_count := processed_count + 1;

        -- Commit every 10 orders to release locks
        IF processed_count % 10 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    -- Final commit for remaining orders
    COMMIT;

    RAISE NOTICE 'Processed % orders', processed_count;
END;
$$;

-- Call the procedure
CALL process_pending_orders(500);
```

## PL/pgSQL Basics

PL/pgSQL is PostgreSQL's native procedural language. Understanding its structure helps you write cleaner code.

### Block Structure

Every PL/pgSQL block follows this pattern:

```sql
DECLARE
    -- Variable declarations (optional)
BEGIN
    -- Executable statements
EXCEPTION
    -- Error handlers (optional)
END;
```

### Variable Declaration and Assignment

Declare variables with explicit types and default values when appropriate:

```sql
CREATE OR REPLACE PROCEDURE demonstrate_variables()
LANGUAGE plpgsql AS $$
DECLARE
    -- Basic types with defaults
    counter INTEGER := 0;
    user_name VARCHAR(100) := 'unknown';
    is_active BOOLEAN := TRUE;
    created_at TIMESTAMP := NOW();

    -- Using %TYPE to match column types
    customer_email customers.email%TYPE;

    -- Using %ROWTYPE for entire rows
    customer_row customers%ROWTYPE;

    -- Record type for dynamic queries
    result_record RECORD;

    -- Arrays
    tag_list TEXT[] := ARRAY['urgent', 'reviewed'];

    -- Constants
    MAX_RETRIES CONSTANT INTEGER := 3;
BEGIN
    -- Assignment using :=
    counter := counter + 1;

    -- Assignment using SELECT INTO
    SELECT email INTO customer_email
    FROM customers
    WHERE customer_id = 1;

    -- Assignment using SELECT INTO for row types
    SELECT * INTO customer_row
    FROM customers
    WHERE customer_id = 1;

    -- Access row fields
    RAISE NOTICE 'Customer: % %', customer_row.first_name, customer_row.last_name;
END;
$$;
```

### Control Flow Statements

PL/pgSQL provides standard control flow constructs:

```sql
CREATE OR REPLACE PROCEDURE demonstrate_control_flow(input_value INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    i INTEGER;
    status TEXT;
BEGIN
    -- IF-THEN-ELSIF-ELSE
    IF input_value < 0 THEN
        status := 'negative';
    ELSIF input_value = 0 THEN
        status := 'zero';
    ELSE
        status := 'positive';
    END IF;

    -- CASE expression
    status := CASE input_value
        WHEN 1 THEN 'one'
        WHEN 2 THEN 'two'
        WHEN 3 THEN 'three'
        ELSE 'other'
    END;

    -- Simple FOR loop
    FOR i IN 1..10 LOOP
        RAISE NOTICE 'Iteration: %', i;
    END LOOP;

    -- Reverse FOR loop
    FOR i IN REVERSE 10..1 LOOP
        RAISE NOTICE 'Countdown: %', i;
    END LOOP;

    -- FOR loop with step
    FOR i IN 1..20 BY 2 LOOP
        RAISE NOTICE 'Odd number: %', i;
    END LOOP;

    -- WHILE loop
    i := 0;
    WHILE i < 5 LOOP
        i := i + 1;

        -- CONTINUE to skip iteration
        IF i = 3 THEN
            CONTINUE;
        END IF;

        -- EXIT to break loop
        IF i = 4 THEN
            EXIT;
        END IF;

        RAISE NOTICE 'While iteration: %', i;
    END LOOP;

    -- Loop over query results
    FOR status IN SELECT DISTINCT status FROM orders LOOP
        RAISE NOTICE 'Found status: %', status;
    END LOOP;
END;
$$;
```

## Parameter Modes

PostgreSQL procedures support three parameter modes: IN, OUT, and INOUT.

### IN Parameters (Default)

IN parameters pass values into the procedure. They are read-only within the procedure body:

```sql
CREATE OR REPLACE PROCEDURE update_customer_status(
    IN p_customer_id INTEGER,
    IN p_new_status VARCHAR(50)
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE customers
    SET status = p_new_status,
        updated_at = NOW()
    WHERE customer_id = p_customer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer % not found', p_customer_id;
    END IF;
END;
$$;

CALL update_customer_status(42, 'premium');
```

### OUT Parameters

OUT parameters return values from procedures. They are write-only and must be assigned before the procedure ends:

```sql
CREATE OR REPLACE PROCEDURE get_customer_stats(
    IN p_customer_id INTEGER,
    OUT p_order_count INTEGER,
    OUT p_total_spent NUMERIC,
    OUT p_last_order_date DATE
)
LANGUAGE plpgsql AS $$
BEGIN
    SELECT
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        MAX(order_date)
    INTO
        p_order_count,
        p_total_spent,
        p_last_order_date
    FROM orders
    WHERE customer_id = p_customer_id;
END;
$$;

-- Call and capture OUT parameters
DO $$
DECLARE
    v_count INTEGER;
    v_total NUMERIC;
    v_last_date DATE;
BEGIN
    CALL get_customer_stats(42, v_count, v_total, v_last_date);
    RAISE NOTICE 'Orders: %, Total: %, Last: %', v_count, v_total, v_last_date;
END;
$$;
```

### INOUT Parameters

INOUT parameters can both receive and return values:

```sql
CREATE OR REPLACE PROCEDURE apply_discount(
    INOUT p_price NUMERIC,
    IN p_discount_percent NUMERIC
)
LANGUAGE plpgsql AS $$
BEGIN
    -- Validate discount
    IF p_discount_percent < 0 OR p_discount_percent > 100 THEN
        RAISE EXCEPTION 'Invalid discount percentage: %', p_discount_percent;
    END IF;

    -- Modify the INOUT parameter
    p_price := p_price * (1 - p_discount_percent / 100);
    p_price := ROUND(p_price, 2);
END;
$$;

-- Usage
DO $$
DECLARE
    current_price NUMERIC := 99.99;
BEGIN
    CALL apply_discount(current_price, 15);
    RAISE NOTICE 'Discounted price: %', current_price;  -- Output: 84.99
END;
$$;
```

### Parameter Best Practices

Follow these naming conventions and patterns:

```sql
CREATE OR REPLACE PROCEDURE transfer_inventory(
    -- Prefix parameters with p_ to avoid column name conflicts
    IN p_source_warehouse_id INTEGER,
    IN p_target_warehouse_id INTEGER,
    IN p_product_id INTEGER,
    IN p_quantity INTEGER,
    -- Group OUT parameters at the end
    OUT p_transfer_id INTEGER,
    OUT p_success BOOLEAN
)
LANGUAGE plpgsql AS $$
DECLARE
    -- Prefix local variables with v_
    v_available_quantity INTEGER;
BEGIN
    -- Initialize OUT parameters
    p_success := FALSE;
    p_transfer_id := NULL;

    -- Check available inventory
    SELECT quantity INTO v_available_quantity
    FROM inventory
    WHERE warehouse_id = p_source_warehouse_id
      AND product_id = p_product_id
    FOR UPDATE;  -- Lock the row

    IF v_available_quantity IS NULL OR v_available_quantity < p_quantity THEN
        RAISE EXCEPTION 'Insufficient inventory. Available: %, Requested: %',
            COALESCE(v_available_quantity, 0), p_quantity;
    END IF;

    -- Perform transfer
    UPDATE inventory
    SET quantity = quantity - p_quantity
    WHERE warehouse_id = p_source_warehouse_id
      AND product_id = p_product_id;

    INSERT INTO inventory (warehouse_id, product_id, quantity)
    VALUES (p_target_warehouse_id, p_product_id, p_quantity)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;

    -- Log the transfer
    INSERT INTO inventory_transfers (
        source_warehouse_id, target_warehouse_id, product_id, quantity, transferred_at
    )
    VALUES (
        p_source_warehouse_id, p_target_warehouse_id, p_product_id, p_quantity, NOW()
    )
    RETURNING transfer_id INTO p_transfer_id;

    p_success := TRUE;
END;
$$;
```

## Transaction Control in Procedures

Transaction control is the main advantage of procedures over functions. You can commit or rollback within a procedure.

### Basic Transaction Control

```sql
CREATE OR REPLACE PROCEDURE process_large_dataset(
    IN p_batch_size INTEGER DEFAULT 1000
)
LANGUAGE plpgsql AS $$
DECLARE
    v_processed INTEGER := 0;
    v_batch_count INTEGER := 0;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT id FROM large_table WHERE processed = FALSE
    LOOP
        -- Process the record
        UPDATE large_table
        SET processed = TRUE,
            processed_at = NOW()
        WHERE id = rec.id;

        v_processed := v_processed + 1;

        -- Commit in batches to avoid long-running transactions
        IF v_processed % p_batch_size = 0 THEN
            COMMIT;
            v_batch_count := v_batch_count + 1;
            RAISE NOTICE 'Committed batch %, total processed: %', v_batch_count, v_processed;
        END IF;
    END LOOP;

    -- Commit any remaining records
    IF v_processed % p_batch_size != 0 THEN
        COMMIT;
    END IF;

    RAISE NOTICE 'Processing complete. Total: % records in % batches',
        v_processed, v_batch_count + 1;
END;
$$;
```

### Savepoints for Partial Rollbacks

Use savepoints when you need to rollback part of a transaction while keeping other changes:

```sql
CREATE OR REPLACE PROCEDURE import_data_with_validation(
    IN p_data_source TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    rec RECORD;
    v_success_count INTEGER := 0;
    v_error_count INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT * FROM staging_table WHERE source = p_data_source
    LOOP
        -- Create savepoint before each record
        BEGIN
            -- Validate and insert
            IF rec.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                RAISE EXCEPTION 'Invalid email: %', rec.email;
            END IF;

            INSERT INTO customers (name, email, phone)
            VALUES (rec.name, rec.email, rec.phone);

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Log the error but continue processing
            INSERT INTO import_errors (source, record_id, error_message, created_at)
            VALUES (p_data_source, rec.id, SQLERRM, NOW());

            v_error_count := v_error_count + 1;
        END;

        -- Commit every 100 successful records
        IF v_success_count % 100 = 0 AND v_success_count > 0 THEN
            COMMIT;
        END IF;
    END LOOP;

    COMMIT;

    RAISE NOTICE 'Import complete. Success: %, Errors: %', v_success_count, v_error_count;
END;
$$;
```

### Transaction Control Restrictions

Be aware of these limitations:

```sql
-- This will FAIL - cannot use transaction control in a subtransaction
CREATE OR REPLACE PROCEDURE bad_example()
LANGUAGE plpgsql AS $$
BEGIN
    BEGIN  -- This creates a subtransaction
        INSERT INTO test_table VALUES (1);
        COMMIT;  -- ERROR: cannot commit while a subtransaction is active
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END;
$$;

-- Correct approach - handle errors differently
CREATE OR REPLACE PROCEDURE good_example()
LANGUAGE plpgsql AS $$
DECLARE
    v_error_occurred BOOLEAN := FALSE;
BEGIN
    INSERT INTO test_table VALUES (1);

    -- Check for issues using application logic instead of EXCEPTION blocks
    IF NOT FOUND THEN
        v_error_occurred := TRUE;
    END IF;

    IF NOT v_error_occurred THEN
        COMMIT;
    ELSE
        ROLLBACK;
    END IF;
END;
$$;
```

## Error Handling with EXCEPTION

Proper error handling makes procedures robust and debuggable.

### Basic Exception Handling

```sql
CREATE OR REPLACE PROCEDURE safe_delete_customer(
    IN p_customer_id INTEGER,
    OUT p_deleted BOOLEAN,
    OUT p_message TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
    p_deleted := FALSE;

    -- Attempt deletion
    DELETE FROM customers WHERE customer_id = p_customer_id;

    IF FOUND THEN
        p_deleted := TRUE;
        p_message := 'Customer deleted successfully';
    ELSE
        p_message := 'Customer not found';
    END IF;

EXCEPTION
    WHEN foreign_key_violation THEN
        p_message := 'Cannot delete customer with existing orders';

    WHEN OTHERS THEN
        p_message := 'Unexpected error: ' || SQLERRM;
        -- Re-raise if you want the transaction to rollback
        -- RAISE;
END;
$$;
```

### Common Exception Types

Here are frequently used PostgreSQL error codes:

| Exception Name | Error Code | Common Cause |
|----------------|------------|--------------|
| unique_violation | 23505 | Duplicate key |
| foreign_key_violation | 23503 | Referenced row missing |
| not_null_violation | 23502 | NULL in NOT NULL column |
| check_violation | 23514 | CHECK constraint failed |
| deadlock_detected | 40P01 | Concurrent transaction conflict |
| serialization_failure | 40001 | Serializable isolation conflict |
| lock_not_available | 55P03 | NOWAIT lock failed |
| query_canceled | 57014 | Statement timeout |

### Comprehensive Error Handler

```sql
CREATE OR REPLACE PROCEDURE robust_order_creation(
    IN p_customer_id INTEGER,
    IN p_items JSONB,
    OUT p_order_id INTEGER,
    OUT p_status TEXT,
    OUT p_error_details TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_item JSONB;
    v_product_id INTEGER;
    v_quantity INTEGER;
    v_price NUMERIC;
    v_total NUMERIC := 0;
BEGIN
    p_status := 'pending';
    p_error_details := NULL;

    -- Validate customer exists
    PERFORM 1 FROM customers WHERE customer_id = p_customer_id;
    IF NOT FOUND THEN
        p_status := 'failed';
        p_error_details := 'Customer does not exist';
        RETURN;
    END IF;

    -- Create order header
    INSERT INTO orders (customer_id, status, created_at)
    VALUES (p_customer_id, 'pending', NOW())
    RETURNING order_id INTO p_order_id;

    -- Process each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::INTEGER;
        v_quantity := (v_item->>'quantity')::INTEGER;

        -- Get current price and check stock
        SELECT price INTO v_price
        FROM products
        WHERE product_id = v_product_id
          AND stock_quantity >= v_quantity
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % unavailable or insufficient stock', v_product_id
                USING ERRCODE = 'P0001';
        END IF;

        -- Create order item
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (p_order_id, v_product_id, v_quantity, v_price);

        -- Update stock
        UPDATE products
        SET stock_quantity = stock_quantity - v_quantity
        WHERE product_id = v_product_id;

        v_total := v_total + (v_quantity * v_price);
    END LOOP;

    -- Update order total
    UPDATE orders
    SET total_amount = v_total,
        status = 'confirmed'
    WHERE order_id = p_order_id;

    p_status := 'success';

EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        -- Custom application error
        p_status := 'failed';
        p_error_details := SQLERRM;
        -- Rollback will happen automatically

    WHEN unique_violation THEN
        p_status := 'failed';
        p_error_details := 'Duplicate order detected';

    WHEN foreign_key_violation THEN
        p_status := 'failed';
        p_error_details := 'Invalid product or customer reference';

    WHEN numeric_value_out_of_range THEN
        p_status := 'failed';
        p_error_details := 'Quantity or price exceeds allowed range';

    WHEN OTHERS THEN
        p_status := 'failed';
        p_error_details := format('Error %s: %s', SQLSTATE, SQLERRM);

        -- Log detailed error for debugging
        INSERT INTO error_log (
            procedure_name, error_code, error_message,
            context, created_at
        )
        VALUES (
            'robust_order_creation', SQLSTATE, SQLERRM,
            format('customer_id=%s, items=%s', p_customer_id, p_items),
            NOW()
        );
END;
$$;
```

### Custom Exceptions

Define and use custom error conditions:

```sql
CREATE OR REPLACE PROCEDURE process_payment(
    IN p_order_id INTEGER,
    IN p_payment_method TEXT,
    IN p_amount NUMERIC
)
LANGUAGE plpgsql AS $$
DECLARE
    v_order_total NUMERIC;
    v_order_status TEXT;
BEGIN
    -- Get order details
    SELECT total_amount, status
    INTO v_order_total, v_order_status
    FROM orders
    WHERE order_id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found'
            USING ERRCODE = 'P0001',
                  HINT = 'Verify the order_id is correct',
                  DETAIL = format('order_id: %s', p_order_id);
    END IF;

    IF v_order_status != 'confirmed' THEN
        RAISE EXCEPTION 'Invalid order status for payment'
            USING ERRCODE = 'P0002',
                  HINT = 'Order must be in confirmed status',
                  DETAIL = format('Current status: %s', v_order_status);
    END IF;

    IF p_amount < v_order_total THEN
        RAISE EXCEPTION 'Insufficient payment amount'
            USING ERRCODE = 'P0003',
                  HINT = format('Required amount: %s', v_order_total),
                  DETAIL = format('Provided: %s, Required: %s', p_amount, v_order_total);
    END IF;

    -- Process payment...
    INSERT INTO payments (order_id, method, amount, created_at)
    VALUES (p_order_id, p_payment_method, p_amount, NOW());

    UPDATE orders SET status = 'paid' WHERE order_id = p_order_id;

EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE NOTICE 'Order error: % - %', SQLERRM, SQLSTATE;
        RAISE;
    WHEN SQLSTATE 'P0002' THEN
        RAISE NOTICE 'Status error: % - %', SQLERRM, SQLSTATE;
        RAISE;
    WHEN SQLSTATE 'P0003' THEN
        RAISE NOTICE 'Payment error: % - %', SQLERRM, SQLSTATE;
        RAISE;
END;
$$;
```

## Debugging Stored Procedures

PostgreSQL provides several tools for debugging procedures.

### Using RAISE for Debug Output

```sql
CREATE OR REPLACE PROCEDURE debug_example(IN p_input INTEGER)
LANGUAGE plpgsql AS $$
DECLARE
    v_step TEXT;
    v_intermediate_result INTEGER;
BEGIN
    v_step := 'initialization';
    RAISE DEBUG 'Starting procedure with input: %', p_input;

    v_step := 'calculation';
    v_intermediate_result := p_input * 2;
    RAISE DEBUG 'After doubling: %', v_intermediate_result;

    v_step := 'validation';
    IF v_intermediate_result > 100 THEN
        RAISE INFO 'Result exceeds threshold';
    END IF;

    v_step := 'completion';
    RAISE NOTICE 'Procedure completed successfully. Final result: %', v_intermediate_result;

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error at step "%": %', v_step, SQLERRM;
    RAISE;
END;
$$;

-- Enable debug output in your session
SET client_min_messages = DEBUG;
CALL debug_example(75);
```

### RAISE Levels

| Level | Purpose | client_min_messages setting |
|-------|---------|---------------------------|
| DEBUG | Development tracing | DEBUG or lower |
| LOG | Operational logging | LOG or lower |
| INFO | Informational messages | INFO or lower |
| NOTICE | Important notifications | NOTICE or lower (default) |
| WARNING | Potential issues | WARNING or lower |
| EXCEPTION | Errors (aborts transaction) | Always shown |

### Execution Timing

Track performance within procedures:

```sql
CREATE OR REPLACE PROCEDURE timed_operation()
LANGUAGE plpgsql AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_duration INTERVAL;
BEGIN
    v_start_time := clock_timestamp();

    -- Operation 1
    PERFORM pg_sleep(0.1);
    RAISE NOTICE 'Step 1 completed in %', clock_timestamp() - v_start_time;

    -- Operation 2
    v_start_time := clock_timestamp();
    PERFORM pg_sleep(0.2);
    RAISE NOTICE 'Step 2 completed in %', clock_timestamp() - v_start_time;

    -- Total time
    RAISE NOTICE 'Total execution time logged';
END;
$$;
```

### Query Execution Plans Inside Procedures

Use GET DIAGNOSTICS to capture execution statistics:

```sql
CREATE OR REPLACE PROCEDURE analyze_query_performance()
LANGUAGE plpgsql AS $$
DECLARE
    v_row_count INTEGER;
    v_start_time TIMESTAMP;
BEGIN
    v_start_time := clock_timestamp();

    -- Execute a query
    UPDATE orders
    SET last_checked = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '7 days';

    -- Get row count
    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    RAISE NOTICE 'Updated % rows in %',
        v_row_count,
        clock_timestamp() - v_start_time;

    -- Log slow operations
    IF clock_timestamp() - v_start_time > INTERVAL '1 second' THEN
        INSERT INTO slow_operation_log (operation, row_count, duration, logged_at)
        VALUES ('update_pending_orders', v_row_count,
                clock_timestamp() - v_start_time, NOW());
    END IF;
END;
$$;
```

## Performance Tips

Optimize your stored procedures with these techniques.

### Use Prepared Statements for Repeated Queries

```sql
CREATE OR REPLACE PROCEDURE batch_insert_optimized(IN p_records JSONB)
LANGUAGE plpgsql AS $$
DECLARE
    rec JSONB;
BEGIN
    -- PREPARE is implicit in PL/pgSQL for static SQL
    -- but dynamic SQL can benefit from explicit preparation

    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        -- This query is automatically prepared and cached
        INSERT INTO products (name, price, category)
        VALUES (
            rec->>'name',
            (rec->>'price')::NUMERIC,
            rec->>'category'
        );
    END LOOP;
END;
$$;
```

### Bulk Operations Instead of Row-by-Row

```sql
-- SLOW: Row-by-row processing
CREATE OR REPLACE PROCEDURE update_prices_slow(IN p_increase_percent NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT product_id, price FROM products
    LOOP
        UPDATE products
        SET price = price * (1 + p_increase_percent / 100)
        WHERE product_id = rec.product_id;
    END LOOP;
END;
$$;

-- FAST: Bulk update
CREATE OR REPLACE PROCEDURE update_prices_fast(IN p_increase_percent NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products
    SET price = price * (1 + p_increase_percent / 100);

    GET DIAGNOSTICS;  -- Optional: get row count
END;
$$;
```

### Index-Aware Query Design

```sql
CREATE OR REPLACE PROCEDURE search_orders(
    IN p_customer_id INTEGER DEFAULT NULL,
    IN p_status TEXT DEFAULT NULL,
    IN p_date_from DATE DEFAULT NULL,
    IN p_date_to DATE DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_sql TEXT;
    v_conditions TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Build query dynamically to use indexes effectively
    v_sql := 'SELECT * FROM orders WHERE 1=1';

    -- Add conditions only when parameters are provided
    IF p_customer_id IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('customer_id = %L', p_customer_id));
    END IF;

    IF p_status IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('status = %L', p_status));
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('order_date >= %L', p_date_from));
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_conditions := array_append(v_conditions,
            format('order_date <= %L', p_date_to));
    END IF;

    IF array_length(v_conditions, 1) > 0 THEN
        v_sql := v_sql || ' AND ' || array_to_string(v_conditions, ' AND ');
    END IF;

    RAISE NOTICE 'Executing: %', v_sql;

    -- Execute and process results...
END;
$$;
```

### Avoid Common Performance Pitfalls

```sql
-- PITFALL 1: SELECT * in loops
-- Bad
FOR rec IN SELECT * FROM large_table LOOP
    -- Only using rec.id
END LOOP;

-- Good
FOR rec IN SELECT id FROM large_table LOOP
    -- Fetches only needed column
END LOOP;

-- PITFALL 2: Missing LIMIT on unbounded queries
-- Bad
CREATE OR REPLACE PROCEDURE get_recent_orders()
LANGUAGE plpgsql AS $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN SELECT * FROM orders ORDER BY created_at DESC
    LOOP
        -- Processes all orders
    END LOOP;
END;
$$;

-- Good
CREATE OR REPLACE PROCEDURE get_recent_orders(IN p_limit INTEGER DEFAULT 100)
LANGUAGE plpgsql AS $$
DECLARE rec RECORD;
BEGIN
    FOR rec IN
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT p_limit
    LOOP
        -- Processes limited set
    END LOOP;
END;
$$;

-- PITFALL 3: Concatenating strings in loops
-- Bad
DECLARE v_result TEXT := '';
BEGIN
    FOR rec IN SELECT name FROM items LOOP
        v_result := v_result || rec.name || ', ';  -- Creates new string each time
    END LOOP;
END;

-- Good
DECLARE v_names TEXT[];
BEGIN
    SELECT array_agg(name) INTO v_names FROM items;
    -- v_result := array_to_string(v_names, ', ');
END;
```

### Connection and Lock Management

```sql
CREATE OR REPLACE PROCEDURE process_with_lock_awareness(
    IN p_resource_id INTEGER
)
LANGUAGE plpgsql AS $$
DECLARE
    v_lock_acquired BOOLEAN;
BEGIN
    -- Try to acquire advisory lock with timeout
    v_lock_acquired := pg_try_advisory_lock(p_resource_id);

    IF NOT v_lock_acquired THEN
        RAISE EXCEPTION 'Resource % is locked by another process', p_resource_id
            USING HINT = 'Try again later';
    END IF;

    BEGIN
        -- Perform work
        UPDATE resources
        SET processing = TRUE
        WHERE resource_id = p_resource_id;

        -- Simulate work
        PERFORM pg_sleep(1);

        UPDATE resources
        SET processing = FALSE,
            last_processed = NOW()
        WHERE resource_id = p_resource_id;

    EXCEPTION WHEN OTHERS THEN
        -- Always release lock on error
        PERFORM pg_advisory_unlock(p_resource_id);
        RAISE;
    END;

    -- Release lock on success
    PERFORM pg_advisory_unlock(p_resource_id);
END;
$$;
```

## Complete Production Example

Here is a full example combining all best practices:

```sql
-- Procedure for processing refund requests
CREATE OR REPLACE PROCEDURE process_refund_request(
    IN p_order_id INTEGER,
    IN p_reason TEXT,
    IN p_requested_by INTEGER,
    OUT p_refund_id INTEGER,
    OUT p_status TEXT,
    OUT p_message TEXT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_order RECORD;
    v_refund_amount NUMERIC;
    v_payment_id INTEGER;
    v_step TEXT := 'init';
BEGIN
    -- Initialize outputs
    p_refund_id := NULL;
    p_status := 'pending';
    p_message := NULL;

    v_step := 'validate_order';
    RAISE DEBUG 'Processing refund for order %', p_order_id;

    -- Fetch and lock order
    SELECT o.order_id, o.customer_id, o.total_amount, o.status,
           p.payment_id, p.method as payment_method
    INTO v_order
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.order_id
    WHERE o.order_id = p_order_id
    FOR UPDATE OF o;

    IF NOT FOUND THEN
        p_status := 'rejected';
        p_message := 'Order not found';
        RETURN;
    END IF;

    -- Validate order status
    v_step := 'validate_status';
    IF v_order.status NOT IN ('paid', 'shipped', 'delivered') THEN
        p_status := 'rejected';
        p_message := format('Cannot refund order with status: %s', v_order.status);
        RETURN;
    END IF;

    -- Check for existing refund
    v_step := 'check_existing';
    PERFORM 1 FROM refunds WHERE order_id = p_order_id AND status != 'cancelled';
    IF FOUND THEN
        p_status := 'rejected';
        p_message := 'Refund already exists for this order';
        RETURN;
    END IF;

    -- Calculate refund amount
    v_step := 'calculate_amount';
    v_refund_amount := v_order.total_amount;

    -- Apply any deductions (restocking fee, etc.)
    IF v_order.status = 'delivered' THEN
        v_refund_amount := v_refund_amount * 0.85;  -- 15% restocking fee
        RAISE NOTICE 'Applied 15%% restocking fee. Refund amount: %', v_refund_amount;
    END IF;

    -- Create refund record
    v_step := 'create_refund';
    INSERT INTO refunds (
        order_id,
        amount,
        reason,
        requested_by,
        status,
        created_at
    )
    VALUES (
        p_order_id,
        v_refund_amount,
        p_reason,
        p_requested_by,
        'approved',
        NOW()
    )
    RETURNING refund_id INTO p_refund_id;

    -- Update order status
    v_step := 'update_order';
    UPDATE orders
    SET status = 'refund_pending',
        updated_at = NOW()
    WHERE order_id = p_order_id;

    -- Restore inventory
    v_step := 'restore_inventory';
    UPDATE products p
    SET stock_quantity = stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND p.product_id = oi.product_id;

    -- Log the action
    v_step := 'audit_log';
    INSERT INTO audit_log (
        action,
        table_name,
        record_id,
        performed_by,
        details,
        created_at
    )
    VALUES (
        'REFUND_CREATED',
        'refunds',
        p_refund_id,
        p_requested_by,
        jsonb_build_object(
            'order_id', p_order_id,
            'amount', v_refund_amount,
            'reason', p_reason
        ),
        NOW()
    );

    p_status := 'approved';
    p_message := format('Refund of %s approved', v_refund_amount);

    RAISE NOTICE 'Refund % created successfully for order %', p_refund_id, p_order_id;

EXCEPTION
    WHEN lock_not_available THEN
        p_status := 'error';
        p_message := 'Order is being processed by another request';

    WHEN foreign_key_violation THEN
        p_status := 'error';
        p_message := 'Invalid reference in refund data';

    WHEN OTHERS THEN
        p_status := 'error';
        p_message := format('Error at step %s: %s', v_step, SQLERRM);

        -- Log error details
        INSERT INTO error_log (
            procedure_name,
            step,
            error_code,
            error_message,
            context,
            created_at
        )
        VALUES (
            'process_refund_request',
            v_step,
            SQLSTATE,
            SQLERRM,
            format('order_id=%s, requested_by=%s', p_order_id, p_requested_by),
            NOW()
        );
END;
$$;

-- Usage example
DO $$
DECLARE
    v_refund_id INTEGER;
    v_status TEXT;
    v_message TEXT;
BEGIN
    CALL process_refund_request(
        p_order_id := 12345,
        p_reason := 'Product damaged during shipping',
        p_requested_by := 1,
        p_refund_id := v_refund_id,
        p_status := v_status,
        p_message := v_message
    );

    RAISE NOTICE 'Result - ID: %, Status: %, Message: %',
        v_refund_id, v_status, v_message;
END;
$$;
```

## Summary

PostgreSQL stored procedures provide transaction control that functions cannot offer. Use them for batch processing, multi-step workflows, and operations requiring intermediate commits.

Key takeaways:

1. Choose procedures over functions when you need COMMIT or ROLLBACK within the code
2. Use parameter prefixes (p_ for parameters, v_ for variables) to avoid naming conflicts
3. Handle errors explicitly with EXCEPTION blocks and meaningful error codes
4. Commit in batches during large data processing to avoid lock contention
5. Use RAISE statements for debugging and audit trails
6. Prefer bulk operations over row-by-row processing
7. Test procedures with various edge cases before deploying to production

These patterns will help you build maintainable, performant stored procedures that handle real-world scenarios gracefully.
