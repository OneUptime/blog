# How to Build Business Logic with PL/pgSQL Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PL/pgSQL, Stored Procedures, Functions, Database Programming, SQL

Description: Learn how to write business logic with PL/pgSQL procedures and functions in PostgreSQL. This guide covers function creation, control flow, error handling, transactions, and performance patterns for database-side programming.

---

> Moving business logic to the database can dramatically reduce round-trips and improve performance for data-intensive operations. PostgreSQL PL/pgSQL lets you write procedures that run inside the database, close to your data. This guide shows you how to build robust, maintainable stored procedures for real-world applications.

---

## Functions vs Procedures

PostgreSQL has both functions and procedures. Know when to use each:

```sql
-- FUNCTION: Returns a value, can be used in queries
-- Cannot manage transactions (no COMMIT/ROLLBACK inside)
CREATE FUNCTION get_user_email(user_id INTEGER)
RETURNS TEXT AS $$
    SELECT email FROM users WHERE id = user_id;
$$ LANGUAGE SQL;

-- Usage in queries
SELECT name, get_user_email(id) FROM orders;

-- PROCEDURE: Doesn't return a value, can manage transactions
-- Use CALL to execute
CREATE PROCEDURE archive_old_orders(days_old INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    -- Can commit/rollback inside procedure
    DELETE FROM orders WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;
    COMMIT;  -- Allowed in procedures
END;
$$;

-- Usage
CALL archive_old_orders(365);
```

---

## Basic PL/pgSQL Syntax

### Variable Declaration and Assignment

```sql
CREATE OR REPLACE FUNCTION calculate_order_total(order_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    -- Variable declarations
    subtotal NUMERIC := 0;
    tax_rate NUMERIC := 0.08;
    discount NUMERIC;
    final_total NUMERIC;
    order_record RECORD;  -- Row type
BEGIN
    -- Query into variables
    SELECT SUM(quantity * price) INTO subtotal
    FROM order_items
    WHERE order_id = calculate_order_total.order_id;

    -- Handle NULL
    subtotal := COALESCE(subtotal, 0);

    -- Get discount from orders table
    SELECT discount_percent INTO discount
    FROM orders
    WHERE id = order_id;

    discount := COALESCE(discount, 0);

    -- Calculate final total
    final_total := subtotal * (1 - discount / 100) * (1 + tax_rate);

    RETURN ROUND(final_total, 2);
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT calculate_order_total(12345);
```

### Control Flow

```sql
CREATE OR REPLACE FUNCTION get_shipping_rate(
    weight NUMERIC,
    destination VARCHAR
)
RETURNS NUMERIC AS $$
DECLARE
    base_rate NUMERIC;
    weight_surcharge NUMERIC;
BEGIN
    -- IF/ELSIF/ELSE
    IF destination IN ('US', 'CA', 'MX') THEN
        base_rate := 5.99;
    ELSIF destination IN ('UK', 'DE', 'FR') THEN
        base_rate := 15.99;
    ELSE
        base_rate := 25.99;
    END IF;

    -- CASE expression
    weight_surcharge := CASE
        WHEN weight < 1 THEN 0
        WHEN weight < 5 THEN 2.00
        WHEN weight < 10 THEN 5.00
        ELSE weight * 0.75
    END;

    RETURN base_rate + weight_surcharge;
END;
$$ LANGUAGE plpgsql;
```

### Loops

```sql
CREATE OR REPLACE FUNCTION generate_invoice_numbers(
    start_num INTEGER,
    count INTEGER
)
RETURNS TABLE(invoice_number VARCHAR) AS $$
DECLARE
    i INTEGER;
    current_year VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYY');
BEGIN
    -- Simple FOR loop
    FOR i IN 1..count LOOP
        invoice_number := 'INV-' || current_year || '-' || LPAD((start_num + i - 1)::TEXT, 6, '0');
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM generate_invoice_numbers(1, 5);
-- Returns: INV-2024-000001, INV-2024-000002, ...
```

### Iterating Over Query Results

```sql
CREATE OR REPLACE FUNCTION process_pending_orders()
RETURNS INTEGER AS $$
DECLARE
    order_rec RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Loop through query results
    FOR order_rec IN
        SELECT id, customer_id, total
        FROM orders
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT 100  -- Process in batches
    LOOP
        -- Process each order
        UPDATE orders
        SET status = 'processing',
            processed_at = NOW()
        WHERE id = order_rec.id;

        -- Call another function
        PERFORM notify_customer(order_rec.customer_id, 'Order processing started');

        processed_count := processed_count + 1;
    END LOOP;

    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Error Handling

### Basic Exception Handling

```sql
CREATE OR REPLACE FUNCTION safe_divide(
    numerator NUMERIC,
    denominator NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
    RETURN numerator / denominator;
EXCEPTION
    WHEN division_by_zero THEN
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Comprehensive Error Handling

```sql
CREATE OR REPLACE FUNCTION transfer_funds(
    from_account INTEGER,
    to_account INTEGER,
    amount NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
    from_balance NUMERIC;
    error_message TEXT;
    error_detail TEXT;
BEGIN
    -- Validate input
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', amount
            USING HINT = 'Provide a positive transfer amount';
    END IF;

    -- Check source balance
    SELECT balance INTO from_balance
    FROM accounts
    WHERE id = from_account
    FOR UPDATE;  -- Lock the row

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source account not found: %', from_account;
    END IF;

    IF from_balance < amount THEN
        RAISE EXCEPTION 'Insufficient funds. Balance: %, Requested: %',
            from_balance, amount
            USING ERRCODE = 'check_violation';
    END IF;

    -- Perform transfer
    UPDATE accounts SET balance = balance - amount WHERE id = from_account;
    UPDATE accounts SET balance = balance + amount WHERE id = to_account;

    -- Log the transfer
    INSERT INTO transfer_log (from_account, to_account, amount, transferred_at)
    VALUES (from_account, to_account, amount, NOW());

    RETURN TRUE;

EXCEPTION
    WHEN check_violation THEN
        -- Re-raise with context
        RAISE;
    WHEN OTHERS THEN
        -- Log unexpected errors
        GET STACKED DIAGNOSTICS
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL;

        INSERT INTO error_log (function_name, error_message, error_detail, occurred_at)
        VALUES ('transfer_funds', error_message, error_detail, NOW());

        RAISE EXCEPTION 'Transfer failed: %', error_message;
END;
$$ LANGUAGE plpgsql;
```

---

## Returning Data

### Return Single Value

```sql
CREATE FUNCTION count_active_users()
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER FROM users WHERE status = 'active';
$$ LANGUAGE SQL;
```

### Return Single Row

```sql
CREATE FUNCTION get_user_details(user_id INTEGER)
RETURNS TABLE(
    id INTEGER,
    email VARCHAR,
    name VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.name, u.created_at
    FROM users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM get_user_details(123);
```

### Return Multiple Rows

```sql
CREATE FUNCTION search_products(
    search_term TEXT,
    category_id INTEGER DEFAULT NULL,
    min_price NUMERIC DEFAULT 0,
    max_price NUMERIC DEFAULT 999999
)
RETURNS TABLE(
    id INTEGER,
    name VARCHAR,
    price NUMERIC,
    category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.price,
        c.name AS category
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE
        (search_term IS NULL OR p.name ILIKE '%' || search_term || '%')
        AND (category_id IS NULL OR p.category_id = category_id)
        AND p.price BETWEEN min_price AND max_price
    ORDER BY p.name
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM search_products('laptop', category_id => 5, max_price => 1000);
```

### Return JSONB

```sql
CREATE FUNCTION get_order_summary(order_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'order_id', o.id,
        'status', o.status,
        'total', o.total,
        'customer', jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email
        ),
        'items', (
            SELECT jsonb_agg(jsonb_build_object(
                'product', p.name,
                'quantity', oi.quantity,
                'price', oi.price
            ))
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = o.id
        )
    ) INTO result
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = order_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Returns JSON like:
-- {
--   "order_id": 123,
--   "status": "completed",
--   "total": 299.99,
--   "customer": {"id": 1, "name": "John", "email": "john@example.com"},
--   "items": [{"product": "Widget", "quantity": 2, "price": 49.99}]
-- }
```

---

## Transaction Control in Procedures

```sql
CREATE OR REPLACE PROCEDURE batch_process_orders(batch_size INTEGER DEFAULT 100)
LANGUAGE plpgsql AS $$
DECLARE
    order_rec RECORD;
    processed INTEGER := 0;
BEGIN
    FOR order_rec IN
        SELECT id FROM orders WHERE status = 'pending'
        ORDER BY created_at
        LIMIT batch_size * 10  -- Fetch more than batch_size
    LOOP
        -- Process order
        UPDATE orders
        SET status = 'processed',
            processed_at = NOW()
        WHERE id = order_rec.id;

        processed := processed + 1;

        -- Commit every batch_size records
        IF processed % batch_size = 0 THEN
            COMMIT;
            RAISE NOTICE 'Committed % orders', processed;
        END IF;
    END LOOP;

    -- Final commit for remaining records
    COMMIT;
    RAISE NOTICE 'Total processed: %', processed;
END;
$$;

-- Usage
CALL batch_process_orders(500);
```

---

## Triggers with PL/pgSQL

### Audit Trigger

```sql
-- Audit table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_user);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if data actually changed
        IF OLD IS DISTINCT FROM NEW THEN
            INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_user);
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_user);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to table
CREATE TRIGGER orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_func();
```

### Validation Trigger

```sql
CREATE OR REPLACE FUNCTION validate_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure total matches items
    IF (
        SELECT SUM(quantity * price)
        FROM order_items
        WHERE order_id = NEW.id
    ) != NEW.total THEN
        RAISE EXCEPTION 'Order total does not match items'
            USING HINT = 'Recalculate order total';
    END IF;

    -- Ensure customer exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM customers
        WHERE id = NEW.customer_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive customer: %', NEW.customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_order_trigger
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_order();
```

---

## Performance Best Practices

### Use SQL When Possible

```sql
-- PL/pgSQL (slower - row-by-row)
CREATE FUNCTION sum_order_totals_slow()
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC := 0;
    order_rec RECORD;
BEGIN
    FOR order_rec IN SELECT total FROM orders LOOP
        total := total + order_rec.total;
    END LOOP;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Pure SQL (faster - set-based)
CREATE FUNCTION sum_order_totals_fast()
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(total), 0) FROM orders;
$$ LANGUAGE SQL;
```

### Avoid Context Switching

```sql
-- Bad: Multiple queries
CREATE FUNCTION get_user_stats_bad(user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    order_count INTEGER;
    total_spent NUMERIC;
    last_order DATE;
BEGIN
    SELECT COUNT(*) INTO order_count FROM orders WHERE customer_id = user_id;
    SELECT SUM(total) INTO total_spent FROM orders WHERE customer_id = user_id;
    SELECT MAX(created_at)::DATE INTO last_order FROM orders WHERE customer_id = user_id;

    RETURN jsonb_build_object(
        'order_count', order_count,
        'total_spent', total_spent,
        'last_order', last_order
    );
END;
$$ LANGUAGE plpgsql;

-- Good: Single query
CREATE FUNCTION get_user_stats_good(user_id INTEGER)
RETURNS JSONB AS $$
    SELECT jsonb_build_object(
        'order_count', COUNT(*),
        'total_spent', COALESCE(SUM(total), 0),
        'last_order', MAX(created_at)::DATE
    )
    FROM orders
    WHERE customer_id = user_id;
$$ LANGUAGE SQL;
```

### Cache Expensive Calculations

```sql
-- Materialized computed column
ALTER TABLE orders ADD COLUMN calculated_total NUMERIC;

CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET calculated_total = (
        SELECT SUM(quantity * price)
        FROM order_items
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();
```

---

## Conclusion

PL/pgSQL brings your business logic close to your data, reducing network round-trips and enabling powerful data transformations. Key takeaways:

1. Use functions for queries, procedures for data modifications with transaction control
2. Return TABLE for multiple rows, JSONB for complex structures
3. Handle errors explicitly with EXCEPTION blocks
4. Prefer set-based SQL over row-by-row PL/pgSQL loops
5. Use triggers for validation, auditing, and maintaining computed values

With well-designed stored procedures, you can move performance-critical logic into PostgreSQL while keeping your application code clean and focused.

---

*Need to monitor your stored procedure performance? [OneUptime](https://oneuptime.com) provides database monitoring with function execution tracking, slow query alerts, and performance analytics for PostgreSQL.*

**Related Reading:**
- [How to Read and Optimize Slow Queries with EXPLAIN ANALYZE](https://oneuptime.com/blog/post/2026-01-25-explain-analyze-postgresql/view)
- [How to Query and Index JSONB Efficiently in PostgreSQL](https://oneuptime.com/blog/post/2026-01-26-jsonb-querying-indexing-postgresql/view)
