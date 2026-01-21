# How to Implement PostgreSQL Triggers and Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Triggers, Functions, PL/pgSQL, Stored Procedures, Automation

Description: A comprehensive guide to implementing PostgreSQL triggers and functions, covering trigger types, function creation, event handling, and practical use cases for database automation.

---

Triggers and functions in PostgreSQL enable powerful database automation - from audit logging to data validation to complex business logic. This guide covers creating and managing triggers and PL/pgSQL functions.

## Prerequisites

- PostgreSQL 12+ installed
- Basic SQL knowledge
- Understanding of database events

## PL/pgSQL Functions

### Basic Function

```sql
-- Simple function
CREATE OR REPLACE FUNCTION add_numbers(a INTEGER, b INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN a + b;
END;
$$ LANGUAGE plpgsql;

-- Call function
SELECT add_numbers(5, 3);  -- Returns 8
```

### Function with Variables

```sql
CREATE OR REPLACE FUNCTION calculate_order_total(order_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC := 0;
    tax_rate NUMERIC := 0.08;
    subtotal NUMERIC;
BEGIN
    -- Calculate subtotal
    SELECT SUM(quantity * price) INTO subtotal
    FROM order_items
    WHERE order_id = calculate_order_total.order_id;

    -- Calculate total with tax
    total := subtotal * (1 + tax_rate);

    RETURN COALESCE(total, 0);
END;
$$ LANGUAGE plpgsql;
```

### Function with Multiple Return Values

```sql
-- Using OUT parameters
CREATE OR REPLACE FUNCTION get_user_stats(
    user_id INTEGER,
    OUT order_count INTEGER,
    OUT total_spent NUMERIC,
    OUT avg_order NUMERIC
) AS $$
BEGIN
    SELECT
        COUNT(*),
        SUM(total),
        AVG(total)
    INTO order_count, total_spent, avg_order
    FROM orders
    WHERE customer_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Call
SELECT * FROM get_user_stats(123);
```

### Function Returning Table

```sql
CREATE OR REPLACE FUNCTION get_recent_orders(customer_id INTEGER, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    order_id INTEGER,
    order_date TIMESTAMP,
    total NUMERIC,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.created_at, o.total, o.status
    FROM orders o
    WHERE o.customer_id = get_recent_orders.customer_id
    ORDER BY o.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Call
SELECT * FROM get_recent_orders(123, 5);
```

## Trigger Basics

### Trigger Types

| Type | When | Use Case |
|------|------|----------|
| BEFORE | Before operation | Validation, modification |
| AFTER | After operation | Audit, notification |
| INSTEAD OF | Replace operation | Views |

### Timing

| Timing | Description |
|--------|-------------|
| FOR EACH ROW | Fires for each affected row |
| FOR EACH STATEMENT | Fires once per statement |

## Creating Triggers

### Basic Trigger Function

```sql
-- Trigger function must return TRIGGER
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_timestamp();
```

### Audit Logging Trigger

```sql
-- Audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50),
    operation VARCHAR(10),
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to table
CREATE TRIGGER users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();
```

### Validation Trigger

```sql
CREATE OR REPLACE FUNCTION validate_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_email
    BEFORE INSERT OR UPDATE OF email ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_email();
```

### Conditional Trigger

```sql
-- Trigger with WHEN condition
CREATE TRIGGER log_price_changes
    AFTER UPDATE OF price ON products
    FOR EACH ROW
    WHEN (OLD.price IS DISTINCT FROM NEW.price)
    EXECUTE FUNCTION log_price_change();

-- Function
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO price_history (product_id, old_price, new_price, changed_at)
    VALUES (NEW.id, OLD.price, NEW.price, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Advanced Patterns

### Cascade Updates

```sql
CREATE OR REPLACE FUNCTION cascade_customer_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update related tables when customer email changes
    IF OLD.email IS DISTINCT FROM NEW.email THEN
        UPDATE notifications
        SET email = NEW.email
        WHERE customer_id = NEW.id;

        UPDATE invoices
        SET billing_email = NEW.email
        WHERE customer_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Denormalization Trigger

```sql
-- Keep order_count in customers table updated
CREATE OR REPLACE FUNCTION update_customer_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers
        SET order_count = order_count + 1
        WHERE id = NEW.customer_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers
        SET order_count = order_count - 1
        WHERE id = OLD.customer_id;
    END IF;
    RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_order_count
    AFTER INSERT OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_order_count();
```

### Notification Trigger

```sql
-- Send notification on important events
CREATE OR REPLACE FUNCTION notify_order_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_order', json_build_object(
        'order_id', NEW.id,
        'customer_id', NEW.customer_id,
        'total', NEW.total
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_notification
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_created();
```

### Soft Delete Trigger

```sql
-- Convert DELETE to UPDATE for soft delete
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET deleted_at = NOW(), is_active = false
    WHERE id = OLD.id;
    RETURN NULL;  -- Prevent actual delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soft_delete_users
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete();
```

## Trigger Variables

### Available Variables

```sql
CREATE OR REPLACE FUNCTION trigger_info()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'TG_NAME: %', TG_NAME;        -- Trigger name
    RAISE NOTICE 'TG_TABLE_NAME: %', TG_TABLE_NAME;  -- Table name
    RAISE NOTICE 'TG_TABLE_SCHEMA: %', TG_TABLE_SCHEMA;  -- Schema
    RAISE NOTICE 'TG_OP: %', TG_OP;            -- INSERT/UPDATE/DELETE
    RAISE NOTICE 'TG_WHEN: %', TG_WHEN;        -- BEFORE/AFTER
    RAISE NOTICE 'TG_LEVEL: %', TG_LEVEL;      -- ROW/STATEMENT
    RAISE NOTICE 'TG_NARGS: %', TG_NARGS;      -- Number of arguments
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### NEW and OLD Records

```sql
CREATE OR REPLACE FUNCTION compare_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- OLD is previous value (UPDATE/DELETE only)
    -- NEW is new value (INSERT/UPDATE only)

    IF TG_OP = 'UPDATE' THEN
        -- Compare specific fields
        IF OLD.status != NEW.status THEN
            RAISE NOTICE 'Status changed from % to %', OLD.status, NEW.status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Managing Triggers

### List Triggers

```sql
-- All triggers on a table
SELECT tgname, tgenabled, tgtype
FROM pg_trigger
WHERE tgrelid = 'users'::regclass
AND NOT tgisinternal;

-- Detailed trigger info
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';
```

### Enable/Disable Triggers

```sql
-- Disable single trigger
ALTER TABLE users DISABLE TRIGGER users_audit;

-- Enable trigger
ALTER TABLE users ENABLE TRIGGER users_audit;

-- Disable all triggers on table
ALTER TABLE users DISABLE TRIGGER ALL;

-- Enable all triggers
ALTER TABLE users ENABLE TRIGGER ALL;
```

### Drop Triggers

```sql
-- Drop specific trigger
DROP TRIGGER users_audit ON users;

-- Drop if exists
DROP TRIGGER IF EXISTS users_audit ON users;
```

## Performance Considerations

### Efficient Trigger Design

```sql
-- GOOD: Only trigger when needed
CREATE TRIGGER efficient_trigger
    AFTER UPDATE OF important_column ON big_table
    FOR EACH ROW
    WHEN (OLD.important_column IS DISTINCT FROM NEW.important_column)
    EXECUTE FUNCTION my_function();

-- AVOID: Triggering on every update
CREATE TRIGGER inefficient_trigger
    AFTER UPDATE ON big_table
    FOR EACH ROW
    EXECUTE FUNCTION my_function();
```

### Batch Operations

```sql
-- Statement-level trigger for batch operations
CREATE OR REPLACE FUNCTION batch_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO batch_log (table_name, operation, row_count, executed_at)
    VALUES (TG_TABLE_NAME, TG_OP,
        (SELECT COUNT(*) FROM deleted_rows),  -- Transition table
        NOW());
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_delete_audit
    AFTER DELETE ON orders
    REFERENCING OLD TABLE AS deleted_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION batch_audit();
```

## Error Handling

```sql
CREATE OR REPLACE FUNCTION safe_operation()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        -- Risky operation
        PERFORM some_function(NEW.id);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't fail the trigger
            INSERT INTO error_log (message, detail)
            VALUES (SQLERRM, SQLSTATE);
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

1. **Keep triggers simple** - Complex logic should be in application
2. **Use WHEN clause** - Filter trigger execution
3. **Test thoroughly** - Triggers can have unexpected effects
4. **Document triggers** - Clear comments on purpose
5. **Monitor performance** - Triggers add overhead
6. **Handle errors gracefully** - Don't break operations
7. **Consider alternatives** - Generated columns, constraints

## Conclusion

PostgreSQL triggers and functions enable powerful automation:

1. **Data validation** - Enforce business rules
2. **Audit logging** - Track all changes
3. **Denormalization** - Maintain computed values
4. **Notifications** - Alert on events
5. **Soft deletes** - Preserve data

Use triggers judiciously to enhance your database while maintaining performance and clarity.
