# How to Use Stored Procedures in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Stored Procedures, SQL, Database, PL/pgSQL, Performance

Description: Learn how to create and use stored procedures in PostgreSQL. This guide covers procedure creation, parameter handling, transaction control, and best practices for production use.

---

Stored procedures were introduced in PostgreSQL 11 and provide a way to encapsulate business logic directly in the database. Unlike functions, procedures can manage transactions, making them ideal for complex operations that require commits or rollbacks within the procedure itself.

---

## Procedures vs Functions

Before diving into procedures, it is important to understand how they differ from functions:

| Feature | Function | Procedure |
|---------|----------|-----------|
| Return value | Must return a value | Cannot return a value directly |
| Transaction control | Cannot COMMIT/ROLLBACK | Can COMMIT/ROLLBACK |
| Call syntax | SELECT or expression | CALL statement |
| Use in queries | Can be used in SELECT | Cannot be used in SELECT |
| Available since | PostgreSQL 7.x | PostgreSQL 11 |

---

## Creating Your First Procedure

### Basic Syntax

```sql
-- Simple procedure with no parameters
CREATE OR REPLACE PROCEDURE cleanup_old_logs()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete logs older than 30 days
    DELETE FROM application_logs
    WHERE created_at < NOW() - INTERVAL '30 days';

    -- Log the cleanup action
    INSERT INTO maintenance_log (action, executed_at)
    VALUES ('cleanup_old_logs', NOW());
END;
$$;

-- Call the procedure
CALL cleanup_old_logs();
```

### Procedure with Parameters

```sql
-- Procedure with input parameters
CREATE OR REPLACE PROCEDURE transfer_funds(
    sender_id INTEGER,
    recipient_id INTEGER,
    amount DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    sender_balance DECIMAL(10,2);
BEGIN
    -- Check sender balance
    SELECT balance INTO sender_balance
    FROM accounts
    WHERE id = sender_id
    FOR UPDATE;  -- Lock the row to prevent race conditions

    IF sender_balance IS NULL THEN
        RAISE EXCEPTION 'Sender account % not found', sender_id;
    END IF;

    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient funds. Balance: %, Required: %',
            sender_balance, amount;
    END IF;

    -- Deduct from sender
    UPDATE accounts
    SET balance = balance - amount,
        updated_at = NOW()
    WHERE id = sender_id;

    -- Add to recipient
    UPDATE accounts
    SET balance = balance + amount,
        updated_at = NOW()
    WHERE id = recipient_id;

    -- Record the transaction
    INSERT INTO transactions (from_account, to_account, amount, created_at)
    VALUES (sender_id, recipient_id, amount, NOW());

    RAISE NOTICE 'Transfer of % from account % to account % completed',
        amount, sender_id, recipient_id;
END;
$$;

-- Execute the transfer
CALL transfer_funds(1, 2, 100.00);
```

---

## Transaction Control in Procedures

The key advantage of procedures over functions is the ability to control transactions.

### Using COMMIT and ROLLBACK

```sql
-- Procedure that processes records in batches with commits
CREATE OR REPLACE PROCEDURE process_large_dataset(
    batch_size INTEGER DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    processed_count INTEGER := 0;
    total_processed INTEGER := 0;
    batch_record RECORD;
BEGIN
    -- Process records in batches to avoid long-running transactions
    LOOP
        processed_count := 0;

        -- Process one batch
        FOR batch_record IN
            SELECT id
            FROM pending_tasks
            WHERE status = 'pending'
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED  -- Skip locked rows for concurrency
        LOOP
            -- Mark as processing
            UPDATE pending_tasks
            SET status = 'processing',
                started_at = NOW()
            WHERE id = batch_record.id;

            -- Perform the actual processing here
            -- ... business logic ...

            -- Mark as completed
            UPDATE pending_tasks
            SET status = 'completed',
                completed_at = NOW()
            WHERE id = batch_record.id;

            processed_count := processed_count + 1;
        END LOOP;

        -- Exit if no more records to process
        IF processed_count = 0 THEN
            EXIT;
        END IF;

        total_processed := total_processed + processed_count;

        -- Commit after each batch to release locks and free resources
        COMMIT;

        RAISE NOTICE 'Processed batch of % records. Total: %',
            processed_count, total_processed;
    END LOOP;

    RAISE NOTICE 'Processing complete. Total processed: %', total_processed;
END;
$$;

-- Run the batch processor
CALL process_large_dataset(500);
```

### Savepoints in Procedures

```sql
-- Procedure using savepoints for partial rollbacks
CREATE OR REPLACE PROCEDURE import_user_data(
    user_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    user_record RECORD;
    import_errors TEXT[] := '{}';
BEGIN
    -- Iterate through each user in the JSON array
    FOR user_record IN
        SELECT * FROM jsonb_to_recordset(user_data)
        AS x(email TEXT, name TEXT, department TEXT)
    LOOP
        -- Create savepoint before each user import
        BEGIN
            -- Attempt to insert the user
            INSERT INTO users (email, name, department)
            VALUES (user_record.email, user_record.name, user_record.department);

            RAISE NOTICE 'Imported user: %', user_record.email;

        EXCEPTION WHEN unique_violation THEN
            -- Log the error but continue with other users
            import_errors := array_append(
                import_errors,
                format('Duplicate email: %s', user_record.email)
            );
            RAISE NOTICE 'Skipped duplicate: %', user_record.email;
        END;
    END LOOP;

    -- Report any errors
    IF array_length(import_errors, 1) > 0 THEN
        RAISE NOTICE 'Import completed with errors: %', import_errors;
    ELSE
        RAISE NOTICE 'Import completed successfully';
    END IF;
END;
$$;

-- Example usage
CALL import_user_data('[
    {"email": "user1@example.com", "name": "User One", "department": "Engineering"},
    {"email": "user2@example.com", "name": "User Two", "department": "Sales"}
]'::jsonb);
```

---

## Output Parameters

While procedures cannot return values directly, you can use output parameters:

```sql
-- Procedure with output parameters
CREATE OR REPLACE PROCEDURE get_account_summary(
    IN account_id INTEGER,
    OUT total_balance DECIMAL(10,2),
    OUT transaction_count INTEGER,
    OUT last_transaction_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Get account balance
    SELECT balance INTO total_balance
    FROM accounts
    WHERE id = account_id;

    -- Get transaction statistics
    SELECT COUNT(*), MAX(created_at)
    INTO transaction_count, last_transaction_date
    FROM transactions
    WHERE from_account = account_id OR to_account = account_id;

    IF total_balance IS NULL THEN
        RAISE EXCEPTION 'Account % not found', account_id;
    END IF;
END;
$$;

-- Call procedure with output parameters
DO $$
DECLARE
    v_balance DECIMAL(10,2);
    v_count INTEGER;
    v_last_date TIMESTAMP;
BEGIN
    CALL get_account_summary(1, v_balance, v_count, v_last_date);
    RAISE NOTICE 'Balance: %, Transactions: %, Last: %',
        v_balance, v_count, v_last_date;
END;
$$;
```

---

## Error Handling

```sql
-- Comprehensive error handling in procedures
CREATE OR REPLACE PROCEDURE safe_delete_user(
    target_user_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_email TEXT;
BEGIN
    -- Store email for logging before deletion
    SELECT email INTO deleted_email
    FROM users
    WHERE id = target_user_id;

    IF deleted_email IS NULL THEN
        RAISE EXCEPTION 'User with ID % does not exist', target_user_id
            USING ERRCODE = 'P0002';  -- no_data_found
    END IF;

    -- Attempt to delete related data first
    BEGIN
        DELETE FROM user_sessions WHERE user_id = target_user_id;
        DELETE FROM user_preferences WHERE user_id = target_user_id;
        DELETE FROM audit_log WHERE user_id = target_user_id;

    EXCEPTION WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Cannot delete user % - has dependent records', target_user_id
            USING HINT = 'Delete dependent records first';
    END;

    -- Delete the user
    DELETE FROM users WHERE id = target_user_id;

    -- Log the deletion
    INSERT INTO deletion_log (entity_type, entity_id, identifier, deleted_at)
    VALUES ('user', target_user_id, deleted_email, NOW());

    RAISE NOTICE 'User % (%) deleted successfully', target_user_id, deleted_email;

EXCEPTION
    WHEN OTHERS THEN
        -- Log unexpected errors
        INSERT INTO error_log (procedure_name, error_message, error_detail, occurred_at)
        VALUES ('safe_delete_user', SQLERRM, SQLSTATE, NOW());

        -- Re-raise the exception
        RAISE;
END;
$$;
```

---

## Security and Permissions

```sql
-- Create procedure with security definer
-- Procedure runs with the privileges of the owner, not the caller
CREATE OR REPLACE PROCEDURE admin_reset_password(
    target_email TEXT,
    new_password_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as procedure owner
SET search_path = public  -- Prevent search_path injection
AS $$
BEGIN
    -- Verify caller has admin role (even though procedure runs as owner)
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = current_user
        AND rolsuper = false
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE username = current_user
            AND role = 'admin'
        )
    ) THEN
        RAISE EXCEPTION 'Only administrators can reset passwords';
    END IF;

    UPDATE users
    SET password_hash = new_password_hash,
        password_changed_at = NOW(),
        must_change_password = true
    WHERE email = target_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with email % not found', target_email;
    END IF;

    -- Audit log
    INSERT INTO security_audit (action, target_email, performed_by, performed_at)
    VALUES ('password_reset', target_email, current_user, NOW());
END;
$$;

-- Grant execute permission to specific role
GRANT EXECUTE ON PROCEDURE admin_reset_password(TEXT, TEXT) TO admin_role;
```

---

## Practical Examples

### Data Archival Procedure

```sql
-- Archive old data with progress tracking
CREATE OR REPLACE PROCEDURE archive_old_orders(
    archive_before DATE,
    batch_size INTEGER DEFAULT 1000
)
LANGUAGE plpgsql
AS $$
DECLARE
    archived_count INTEGER := 0;
    batch_count INTEGER;
    start_time TIMESTAMP := clock_timestamp();
BEGIN
    RAISE NOTICE 'Starting archive of orders before %', archive_before;

    LOOP
        -- Move batch to archive table
        WITH moved AS (
            DELETE FROM orders
            WHERE created_at < archive_before
            AND id IN (
                SELECT id FROM orders
                WHERE created_at < archive_before
                LIMIT batch_size
            )
            RETURNING *
        )
        INSERT INTO orders_archive
        SELECT *, NOW() as archived_at
        FROM moved;

        GET DIAGNOSTICS batch_count = ROW_COUNT;

        IF batch_count = 0 THEN
            EXIT;
        END IF;

        archived_count := archived_count + batch_count;

        -- Commit each batch
        COMMIT;

        RAISE NOTICE 'Archived % records (total: %)', batch_count, archived_count;
    END LOOP;

    -- Update statistics
    INSERT INTO archive_history (
        table_name,
        records_archived,
        archive_date,
        duration_seconds
    )
    VALUES (
        'orders',
        archived_count,
        archive_before,
        EXTRACT(EPOCH FROM clock_timestamp() - start_time)
    );

    RAISE NOTICE 'Archive complete. Total archived: % in % seconds',
        archived_count,
        EXTRACT(EPOCH FROM clock_timestamp() - start_time);
END;
$$;

-- Archive orders older than 2 years
CALL archive_old_orders('2024-01-01'::DATE, 500);
```

### Scheduled Maintenance Procedure

```sql
-- Comprehensive maintenance procedure
CREATE OR REPLACE PROCEDURE perform_maintenance()
LANGUAGE plpgsql
AS $$
DECLARE
    table_record RECORD;
    maintenance_start TIMESTAMP := clock_timestamp();
BEGIN
    RAISE NOTICE 'Starting database maintenance at %', maintenance_start;

    -- Clean up expired sessions
    DELETE FROM sessions WHERE expires_at < NOW();
    RAISE NOTICE 'Cleaned up expired sessions';
    COMMIT;

    -- Clean up old notifications
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND is_read = true;
    RAISE NOTICE 'Cleaned up old notifications';
    COMMIT;

    -- Update statistics on frequently accessed tables
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_stat_user_tables
        WHERE n_live_tup > 10000
        ORDER BY n_live_tup DESC
        LIMIT 10
    LOOP
        EXECUTE format('ANALYZE %I.%I',
            table_record.schemaname,
            table_record.tablename);
        RAISE NOTICE 'Analyzed table: %.%',
            table_record.schemaname,
            table_record.tablename;
    END LOOP;
    COMMIT;

    -- Log maintenance completion
    INSERT INTO maintenance_log (
        maintenance_type,
        started_at,
        completed_at,
        duration_seconds
    )
    VALUES (
        'scheduled_maintenance',
        maintenance_start,
        clock_timestamp(),
        EXTRACT(EPOCH FROM clock_timestamp() - maintenance_start)
    );

    RAISE NOTICE 'Maintenance completed in % seconds',
        EXTRACT(EPOCH FROM clock_timestamp() - maintenance_start);
END;
$$;
```

---

## Best Practices

1. **Use procedures for transaction control** - If your logic requires intermediate commits, use procedures instead of functions.

2. **Keep procedures focused** - Each procedure should do one thing well. Complex workflows should be broken into multiple procedures.

3. **Handle errors explicitly** - Always include proper error handling to prevent silent failures.

4. **Log important actions** - Include audit logging for procedures that modify critical data.

5. **Use SECURITY DEFINER carefully** - Only when necessary, and always set `search_path` to prevent injection attacks.

6. **Commit in batches** - For long-running operations, commit periodically to avoid lock contention and memory issues.

---

## Conclusion

Stored procedures in PostgreSQL provide powerful capabilities for encapsulating business logic and managing transactions within the database. They are particularly useful for batch processing, data migrations, and complex operations that require intermediate commits. By following the patterns and best practices outlined in this guide, you can build reliable and maintainable database procedures.

---

*Need to monitor your PostgreSQL stored procedures? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including procedure execution times, error tracking, and performance metrics.*
