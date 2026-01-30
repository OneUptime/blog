# How to Build PostgreSQL Triggers for Audit

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Database, Auditing, Security

Description: Implement audit logging in PostgreSQL using triggers to track data changes with user context, timestamps, and change history tables.

---

Audit logging is a fundamental requirement for compliance, debugging, and security. PostgreSQL triggers give you a powerful mechanism to capture every data change at the database level, ensuring that no modification goes untracked, regardless of which application or service makes the change.

This guide walks through building a production-ready audit system using PostgreSQL triggers, from basic concepts to advanced patterns with JSONB storage and performance tuning.

## Understanding PostgreSQL Triggers

A trigger is a database object that automatically executes a function when specific events occur on a table. For audit purposes, we care about data modification events: INSERT, UPDATE, and DELETE.

### Trigger Timing: BEFORE vs AFTER

| Timing | When it fires | Use case |
|--------|---------------|----------|
| BEFORE | Before the operation modifies data | Validation, data transformation, preventing changes |
| AFTER | After the operation completes | Audit logging, notifications, cascading updates |

For audit logging, AFTER triggers are the standard choice. The operation has completed successfully, so you are recording what actually happened rather than what was attempted.

### Trigger Level: Row vs Statement

| Level | Fires | Use case |
|-------|-------|----------|
| FOR EACH ROW | Once per affected row | Audit logging, row-level validation |
| FOR EACH STATEMENT | Once per SQL statement | Aggregate operations, bulk notifications |

Row-level triggers are essential for audit logging because you need to capture the before and after state of each individual row.

## Designing the Audit Table

A well-designed audit table should capture enough context to answer: who changed what, when, and what were the previous values?

The following SQL creates an audit table that stores the operation type, timing, user context, and both the old and new row values as JSONB:

```sql
-- Create schema for audit objects
CREATE SCHEMA IF NOT EXISTS audit;

-- Main audit log table
CREATE TABLE audit.change_log (
    id              BIGSERIAL PRIMARY KEY,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    row_id          TEXT,
    old_values      JSONB,
    new_values      JSONB,
    changed_fields  TEXT[],
    transaction_id  BIGINT DEFAULT txid_current(),
    statement_id    INTEGER DEFAULT statement_timestamp()::TEXT::HASHTEXT,
    session_user    TEXT DEFAULT session_user,
    application_user TEXT,
    client_addr     INET DEFAULT inet_client_addr(),
    client_port     INTEGER DEFAULT inet_client_port(),
    application_name TEXT DEFAULT current_setting('application_name', true),
    created_at      TIMESTAMPTZ DEFAULT clock_timestamp()
);

-- Index for common query patterns
CREATE INDEX idx_audit_table_operation ON audit.change_log (table_name, operation);
CREATE INDEX idx_audit_created_at ON audit.change_log (created_at);
CREATE INDEX idx_audit_row_id ON audit.change_log (table_name, row_id);
CREATE INDEX idx_audit_transaction ON audit.change_log (transaction_id);

-- Partial index for recent data (adjust the date as needed)
CREATE INDEX idx_audit_recent ON audit.change_log (created_at)
    WHERE created_at > '2026-01-01';

-- GIN index for JSONB queries
CREATE INDEX idx_audit_old_values ON audit.change_log USING GIN (old_values);
CREATE INDEX idx_audit_new_values ON audit.change_log USING GIN (new_values);
```

### Column Explanations

| Column | Purpose |
|--------|---------|
| `schema_name`, `table_name` | Identifies which table was modified |
| `operation` | INSERT, UPDATE, or DELETE |
| `row_id` | Primary key of the affected row (as text for flexibility) |
| `old_values` | Previous state of the row (NULL for INSERT) |
| `new_values` | New state of the row (NULL for DELETE) |
| `changed_fields` | Array of column names that changed (UPDATE only) |
| `transaction_id` | Groups changes in the same transaction |
| `session_user` | PostgreSQL role that executed the statement |
| `application_user` | Custom user context from your application |
| `client_addr`, `client_port` | Network connection details |
| `created_at` | Exact timestamp using `clock_timestamp()` |

## Building the Audit Trigger Function

The trigger function is where the audit logic lives. It inspects the operation type and captures the appropriate data.

This function handles all three operation types and extracts the primary key value dynamically:

```sql
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_cols TEXT[];
    pk_column TEXT;
    pk_value TEXT;
BEGIN
    -- Get the primary key column name (assumes single-column PK)
    SELECT a.attname INTO pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = TG_RELID AND i.indisprimary
    LIMIT 1;

    -- Handle different operation types
    IF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);

        -- Get primary key value from NEW record
        IF pk_column IS NOT NULL THEN
            EXECUTE format('SELECT ($1).%I::TEXT', pk_column)
                INTO pk_value USING NEW;
        END IF;

        INSERT INTO audit.change_log (
            schema_name, table_name, operation, row_id,
            old_values, new_values, changed_fields,
            application_user
        ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, pk_value,
            NULL, new_data, NULL,
            current_setting('app.current_user', true)
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Get primary key value
        IF pk_column IS NOT NULL THEN
            EXECUTE format('SELECT ($1).%I::TEXT', pk_column)
                INTO pk_value USING NEW;
        END IF;

        -- Find columns that changed
        SELECT array_agg(key) INTO changed_cols
        FROM (
            SELECT key
            FROM jsonb_each(old_data)
            EXCEPT
            SELECT key
            FROM jsonb_each(new_data)
            UNION
            SELECT key
            FROM jsonb_each(new_data)
            EXCEPT
            SELECT key
            FROM jsonb_each(old_data)
            UNION
            SELECT o.key
            FROM jsonb_each(old_data) o
            JOIN jsonb_each(new_data) n ON o.key = n.key
            WHERE o.value IS DISTINCT FROM n.value
        ) changed_keys;

        -- Only log if something actually changed
        IF changed_cols IS NOT NULL AND array_length(changed_cols, 1) > 0 THEN
            INSERT INTO audit.change_log (
                schema_name, table_name, operation, row_id,
                old_values, new_values, changed_fields,
                application_user
            ) VALUES (
                TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, pk_value,
                old_data, new_data, changed_cols,
                current_setting('app.current_user', true)
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);

        -- Get primary key value from OLD record
        IF pk_column IS NOT NULL THEN
            EXECUTE format('SELECT ($1).%I::TEXT', pk_column)
                INTO pk_value USING OLD;
        END IF;

        INSERT INTO audit.change_log (
            schema_name, table_name, operation, row_id,
            old_values, new_values, changed_fields,
            application_user
        ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, pk_value,
            old_data, NULL, NULL,
            current_setting('app.current_user', true)
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Key Implementation Details

The function uses `to_jsonb()` to convert row records to JSONB, which handles any table structure without modification. The `SECURITY DEFINER` attribute ensures the function runs with the privileges of its owner, allowing it to write to the audit table even if the calling user lacks direct access.

The change detection logic compares old and new JSONB values to identify exactly which columns changed. This prevents logging no-op updates where a statement runs but values remain the same.

## Attaching Triggers to Tables

Create a helper function to simplify adding audit triggers to tables:

```sql
CREATE OR REPLACE FUNCTION audit.enable_tracking(target_table REGCLASS)
RETURNS VOID AS $$
DECLARE
    trigger_name TEXT;
BEGIN
    trigger_name := 'audit_trigger_' || target_table::TEXT;

    -- Remove dots and schema prefixes for valid trigger name
    trigger_name := regexp_replace(trigger_name, '[^a-zA-Z0-9_]', '_', 'g');

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, target_table
    );

    EXECUTE format(
        'CREATE TRIGGER %I
         AFTER INSERT OR UPDATE OR DELETE ON %s
         FOR EACH ROW EXECUTE FUNCTION audit.log_changes()',
        trigger_name, target_table
    );

    RAISE NOTICE 'Audit trigger "%" enabled on %', trigger_name, target_table;
END;
$$ LANGUAGE plpgsql;

-- Disable tracking
CREATE OR REPLACE FUNCTION audit.disable_tracking(target_table REGCLASS)
RETURNS VOID AS $$
DECLARE
    trigger_name TEXT;
BEGIN
    trigger_name := 'audit_trigger_' || target_table::TEXT;
    trigger_name := regexp_replace(trigger_name, '[^a-zA-Z0-9_]', '_', 'g');

    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %s',
        trigger_name, target_table
    );

    RAISE NOTICE 'Audit trigger disabled on %', target_table;
END;
$$ LANGUAGE plpgsql;
```

Enable auditing on your tables:

```sql
-- Enable audit tracking
SELECT audit.enable_tracking('public.users');
SELECT audit.enable_tracking('public.orders');
SELECT audit.enable_tracking('public.payments');
```

## Capturing Application User Context

The `session_user` shows the database role, but you often need to know which application user triggered the change. Use session variables to pass this context.

Set the application user at the start of each request or transaction:

```sql
-- Set at the start of a request/transaction
SET LOCAL app.current_user = 'user@example.com';

-- Alternative: SET for the session (persists until connection closes)
SET app.current_user = 'user@example.com';
```

From your application code, execute this before any data modifications.

Node.js example using pg:

```javascript
const { Pool } = require('pg');
const pool = new Pool();

async function executeWithUserContext(userId, callback) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Set the application user context
        await client.query('SET LOCAL app.current_user = $1', [userId]);

        // Execute the actual business logic
        const result = await callback(client);

        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Usage
await executeWithUserContext('user@example.com', async (client) => {
    await client.query(
        'UPDATE users SET email = $1 WHERE id = $2',
        ['newemail@example.com', 123]
    );
});
```

Python example using psycopg2:

```python
import psycopg2
from contextlib import contextmanager

@contextmanager
def audit_context(connection, user_id):
    cursor = connection.cursor()
    try:
        cursor.execute("SET LOCAL app.current_user = %s", (user_id,))
        yield cursor
    finally:
        cursor.close()

# Usage
with psycopg2.connect(dsn) as conn:
    with conn:
        with audit_context(conn, 'user@example.com') as cursor:
            cursor.execute(
                "UPDATE users SET email = %s WHERE id = %s",
                ('newemail@example.com', 123)
            )
```

## Working with OLD and NEW Values

The trigger function receives special variables `OLD` and `NEW` that represent the row before and after modification:

| Operation | OLD | NEW |
|-----------|-----|-----|
| INSERT | NULL | The new row |
| UPDATE | Row before change | Row after change |
| DELETE | The deleted row | NULL |

### Accessing Specific Fields

When you need to audit specific fields or implement conditional logic:

```sql
CREATE OR REPLACE FUNCTION audit.log_sensitive_changes()
RETURNS TRIGGER AS $$
DECLARE
    sensitive_fields TEXT[] := ARRAY['email', 'password_hash', 'phone', 'ssn'];
    field TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        FOREACH field IN ARRAY sensitive_fields
        LOOP
            -- Check if this field exists in the table
            IF to_jsonb(OLD) ? field THEN
                old_val := to_jsonb(OLD) ->> field;
                new_val := to_jsonb(NEW) ->> field;

                IF old_val IS DISTINCT FROM new_val THEN
                    INSERT INTO audit.sensitive_field_log (
                        table_name, field_name, row_id,
                        old_value_hash, new_value_hash,
                        changed_by, changed_at
                    ) VALUES (
                        TG_TABLE_NAME, field,
                        (to_jsonb(NEW) ->> 'id'),
                        md5(COALESCE(old_val, '')),
                        md5(COALESCE(new_val, '')),
                        current_setting('app.current_user', true),
                        clock_timestamp()
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## JSONB for Flexible Audit Storage

JSONB provides several advantages for audit logging:

1. Schema flexibility: No need to alter the audit table when source tables change
2. Efficient storage: JSONB compresses repeated keys
3. Powerful querying: Rich operators for searching and filtering
4. Partial indexing: GIN indexes make JSONB queries fast

### Querying Audit Data

Find all changes to a specific record:

```sql
SELECT
    operation,
    changed_fields,
    old_values,
    new_values,
    application_user,
    created_at
FROM audit.change_log
WHERE table_name = 'users'
  AND row_id = '12345'
ORDER BY created_at DESC;
```

Find all changes to a specific field across all records:

```sql
SELECT
    row_id,
    old_values ->> 'email' AS old_email,
    new_values ->> 'email' AS new_email,
    application_user,
    created_at
FROM audit.change_log
WHERE table_name = 'users'
  AND 'email' = ANY(changed_fields)
ORDER BY created_at DESC
LIMIT 100;
```

Find records where a specific value was set:

```sql
SELECT *
FROM audit.change_log
WHERE table_name = 'orders'
  AND new_values @> '{"status": "cancelled"}'
ORDER BY created_at DESC;
```

Reconstruct a record at a point in time:

```sql
WITH ordered_changes AS (
    SELECT
        new_values,
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM audit.change_log
    WHERE table_name = 'users'
      AND row_id = '12345'
      AND created_at <= '2026-01-15 14:30:00'
      AND operation IN ('INSERT', 'UPDATE')
)
SELECT new_values
FROM ordered_changes
WHERE rn = 1;
```

## Excluding Columns from Audit

Sometimes you want to exclude certain columns from triggering audit entries, such as `updated_at` timestamps or cached computed values.

Modified trigger function with column exclusion:

```sql
CREATE OR REPLACE FUNCTION audit.log_changes_with_exclusions()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_cols TEXT[];
    excluded_cols TEXT[];
    pk_value TEXT;
BEGIN
    -- Get excluded columns from trigger argument or default
    IF TG_NARGS > 0 THEN
        excluded_cols := TG_ARGV;
    ELSE
        excluded_cols := ARRAY['updated_at', 'modified_at', 'last_seen_at'];
    END IF;

    IF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Remove excluded columns before comparison
        FOREACH pk_value IN ARRAY excluded_cols
        LOOP
            old_data := old_data - pk_value;
            new_data := new_data - pk_value;
        END LOOP;

        -- Find changed columns (excluding the excluded ones)
        SELECT array_agg(key) INTO changed_cols
        FROM (
            SELECT o.key
            FROM jsonb_each(old_data) o
            JOIN jsonb_each(new_data) n ON o.key = n.key
            WHERE o.value IS DISTINCT FROM n.value
        ) changes;

        -- Only log if non-excluded columns changed
        IF changed_cols IS NOT NULL AND array_length(changed_cols, 1) > 0 THEN
            INSERT INTO audit.change_log (
                schema_name, table_name, operation, row_id,
                old_values, new_values, changed_fields,
                application_user
            ) VALUES (
                TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP,
                (to_jsonb(NEW) ->> 'id'),
                to_jsonb(OLD), to_jsonb(NEW), changed_cols,
                current_setting('app.current_user', true)
            );
        END IF;

        RETURN NEW;
    END IF;

    -- Handle INSERT and DELETE as before
    -- ...
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Create trigger with custom exclusions:

```sql
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION audit.log_changes_with_exclusions('updated_at', 'login_count');
```

## Performance Considerations

Audit triggers add overhead to every write operation. Here are strategies to minimize the impact:

### 1. Batch Audit Writes

For high-throughput tables, buffer audit entries and write them in batches:

```sql
-- Temporary table for buffering (per-session)
CREATE UNLOGGED TABLE audit.buffer (
    data JSONB NOT NULL
);

-- Modified trigger that writes to buffer
CREATE OR REPLACE FUNCTION audit.log_to_buffer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.buffer (data) VALUES (
        jsonb_build_object(
            'schema_name', TG_TABLE_SCHEMA,
            'table_name', TG_TABLE_NAME,
            'operation', TG_OP,
            'old_values', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
            'new_values', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
            'created_at', clock_timestamp()
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Flush buffer to main audit table periodically
CREATE OR REPLACE FUNCTION audit.flush_buffer()
RETURNS INTEGER AS $$
DECLARE
    row_count INTEGER;
BEGIN
    INSERT INTO audit.change_log (
        schema_name, table_name, operation,
        old_values, new_values, created_at
    )
    SELECT
        data ->> 'schema_name',
        data ->> 'table_name',
        data ->> 'operation',
        data -> 'old_values',
        data -> 'new_values',
        (data ->> 'created_at')::TIMESTAMPTZ
    FROM audit.buffer;

    GET DIAGNOSTICS row_count = ROW_COUNT;

    TRUNCATE audit.buffer;

    RETURN row_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. Partition the Audit Table

For large audit tables, use time-based partitioning:

```sql
-- Create partitioned audit table
CREATE TABLE audit.change_log_partitioned (
    id              BIGSERIAL,
    schema_name     TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    operation       TEXT NOT NULL,
    row_id          TEXT,
    old_values      JSONB,
    new_values      JSONB,
    changed_fields  TEXT[],
    application_user TEXT,
    created_at      TIMESTAMPTZ DEFAULT clock_timestamp(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE audit.change_log_2026_01 PARTITION OF audit.change_log_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit.change_log_2026_02 PARTITION OF audit.change_log_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Automated partition creation function
CREATE OR REPLACE FUNCTION audit.create_partition_if_needed()
RETURNS VOID AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Create partition for next month if it does not exist
    partition_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    partition_name := 'change_log_' || to_char(partition_date, 'YYYY_MM');
    start_date := partition_date;
    end_date := partition_date + interval '1 month';

    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE audit.%I PARTITION OF audit.change_log_partitioned
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
        RAISE NOTICE 'Created partition: audit.%', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3. Async Audit with LISTEN/NOTIFY

For minimal latency impact, use PostgreSQL notifications and process audit entries asynchronously:

```sql
-- Lightweight trigger that just notifies
CREATE OR REPLACE FUNCTION audit.notify_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('audit_channel', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'row_id', CASE
            WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD) ->> 'id')
            ELSE (to_jsonb(NEW) ->> 'id')
        END,
        'timestamp', clock_timestamp()
    )::TEXT);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

Process notifications in your application:

```javascript
const { Client } = require('pg');

async function startAuditListener() {
    const client = new Client();
    await client.connect();

    await client.query('LISTEN audit_channel');

    client.on('notification', async (msg) => {
        const payload = JSON.parse(msg.payload);

        // Fetch full row data and write to audit table
        await processAuditEvent(payload);
    });

    console.log('Audit listener started');
}
```

### 4. Conditional Auditing

Skip audit for bulk operations or maintenance tasks:

```sql
CREATE OR REPLACE FUNCTION audit.log_changes_conditional()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if audit is disabled for this session
    IF current_setting('app.skip_audit', true) = 'true' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Normal audit logic here
    -- ...

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Disable audit for bulk operations:

```sql
-- Disable audit for this transaction
SET LOCAL app.skip_audit = 'true';

-- Perform bulk operation
UPDATE users SET status = 'inactive' WHERE last_login < '2025-01-01';

-- Re-enable (or just let the transaction end)
SET LOCAL app.skip_audit = 'false';
```

## Complete Example: Users Table Audit

Putting it all together with a practical example:

```sql
-- Create the users table
CREATE TABLE public.users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    status      VARCHAR(50) DEFAULT 'active',
    role        VARCHAR(50) DEFAULT 'user',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable audit tracking
SELECT audit.enable_tracking('public.users');

-- Test the audit system
BEGIN;
    SET LOCAL app.current_user = 'admin@example.com';

    -- Insert a user
    INSERT INTO users (email, name) VALUES ('john@example.com', 'John Doe');

    -- Update the user
    UPDATE users SET role = 'admin' WHERE email = 'john@example.com';

    -- Another update
    UPDATE users SET name = 'John D.' WHERE email = 'john@example.com';
COMMIT;

-- View the audit trail
SELECT
    operation,
    changed_fields,
    old_values ->> 'name' AS old_name,
    new_values ->> 'name' AS new_name,
    old_values ->> 'role' AS old_role,
    new_values ->> 'role' AS new_role,
    application_user,
    created_at
FROM audit.change_log
WHERE table_name = 'users'
ORDER BY created_at;
```

Expected output:

| operation | changed_fields | old_name | new_name | old_role | new_role | application_user | created_at |
|-----------|----------------|----------|----------|----------|----------|------------------|------------|
| INSERT | NULL | NULL | John Doe | NULL | user | admin@example.com | 2026-01-30 10:00:00 |
| UPDATE | {role} | John Doe | John Doe | user | admin | admin@example.com | 2026-01-30 10:00:01 |
| UPDATE | {name} | John Doe | John D. | admin | admin | admin@example.com | 2026-01-30 10:00:02 |

## Retention and Cleanup

Audit tables grow continuously. Implement a retention policy:

```sql
-- Delete audit records older than 2 years
CREATE OR REPLACE FUNCTION audit.cleanup_old_records(retention_days INTEGER DEFAULT 730)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit.change_log
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Deleted % audit records older than % days', deleted_count, retention_days;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
SELECT cron.schedule(
    'audit-cleanup',
    '0 3 * * 0',  -- Every Sunday at 3 AM
    $$SELECT audit.cleanup_old_records(730)$$
);
```

For partitioned tables, dropping old partitions is faster:

```sql
-- Drop partitions older than retention period
DROP TABLE IF EXISTS audit.change_log_2024_01;
DROP TABLE IF EXISTS audit.change_log_2024_02;
```

## Summary

PostgreSQL triggers provide a robust foundation for audit logging that works regardless of how data is modified. Key takeaways:

| Aspect | Recommendation |
|--------|----------------|
| Trigger timing | Use AFTER triggers for audit logging |
| Trigger level | FOR EACH ROW to capture individual changes |
| Storage format | JSONB for flexibility and query power |
| User context | Pass via session variables with SET LOCAL |
| Performance | Partition large tables, consider async processing |
| Retention | Automate cleanup with scheduled jobs |

The audit system described here captures complete change history at the database level, ensuring compliance requirements are met even when multiple applications access the same data. The JSONB storage format provides flexibility to handle schema changes without modifying the audit infrastructure.

Start with the basic trigger function and add complexity (partitioning, async processing, conditional auditing) as your scale demands it.
