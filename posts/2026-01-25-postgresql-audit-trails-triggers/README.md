# How to Implement Audit Trails with Triggers in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Audit, Triggers, Compliance, Security

Description: Learn how to build a complete audit trail system in PostgreSQL using triggers. This guide covers tracking inserts, updates, and deletes with full before/after snapshots, user tracking, and query optimization for audit logs.

---

Every production database eventually needs an audit trail. Whether for compliance requirements, debugging data issues, or simply understanding who changed what and when, having a reliable history of data changes is essential. PostgreSQL triggers provide a powerful way to capture these changes automatically without modifying application code.

## The Audit Table Structure

A good audit table captures the essential facts: what changed, when, who did it, and what the data looked like before and after.

```sql
-- Create the audit log table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,           -- Primary key of audited row
    action TEXT NOT NULL,              -- INSERT, UPDATE, DELETE
    old_data JSONB,                    -- Data before change
    new_data JSONB,                    -- Data after change
    changed_fields TEXT[],             -- List of modified columns
    performed_by TEXT,                 -- User who made the change
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip INET,                    -- Connection IP if available
    application_name TEXT              -- App that made the change
);

-- Create indexes for common queries
CREATE INDEX idx_audit_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_record_id ON audit_log(record_id);
CREATE INDEX idx_audit_performed_at ON audit_log(performed_at);
CREATE INDEX idx_audit_performed_by ON audit_log(performed_by);

-- Index for searching within JSON data
CREATE INDEX idx_audit_new_data ON audit_log USING gin(new_data);
```

## The Generic Audit Trigger Function

This function works with any table. It captures the operation type, extracts primary key values, and stores before/after snapshots.

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    record_id TEXT;
    current_user_name TEXT;
    key_column TEXT;
    key_columns TEXT[];
BEGIN
    -- Get the primary key column(s) for this table
    SELECT array_agg(a.attname)
    INTO key_columns
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid
        AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = TG_RELID
        AND i.indisprimary;

    -- Get current user from session variable or default to session_user
    current_user_name := COALESCE(
        current_setting('app.current_user', true),
        session_user
    );

    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        old_data := NULL;

        -- Build record_id from primary key columns
        record_id := (SELECT string_agg(new_data->>col, ',')
                      FROM unnest(key_columns) AS col);

        INSERT INTO audit_log (
            table_name, record_id, action, old_data, new_data,
            performed_by, client_ip, application_name
        ) VALUES (
            TG_TABLE_NAME, record_id, 'INSERT', old_data, new_data,
            current_user_name,
            inet_client_addr(),
            current_setting('application_name', true)
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Build record_id from primary key columns
        record_id := (SELECT string_agg(new_data->>col, ',')
                      FROM unnest(key_columns) AS col);

        -- Find which fields actually changed
        SELECT array_agg(key)
        INTO changed_fields
        FROM jsonb_each(old_data) AS o(key, value)
        WHERE o.value IS DISTINCT FROM new_data->o.key;

        -- Only log if something actually changed
        IF changed_fields IS NOT NULL THEN
            INSERT INTO audit_log (
                table_name, record_id, action, old_data, new_data,
                changed_fields, performed_by, client_ip, application_name
            ) VALUES (
                TG_TABLE_NAME, record_id, 'UPDATE', old_data, new_data,
                changed_fields, current_user_name,
                inet_client_addr(),
                current_setting('application_name', true)
            );
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;

        -- Build record_id from primary key columns
        record_id := (SELECT string_agg(old_data->>col, ',')
                      FROM unnest(key_columns) AS col);

        INSERT INTO audit_log (
            table_name, record_id, action, old_data, new_data,
            performed_by, client_ip, application_name
        ) VALUES (
            TG_TABLE_NAME, record_id, 'DELETE', old_data, new_data,
            current_user_name,
            inet_client_addr(),
            current_setting('application_name', true)
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Attaching Triggers to Tables

Apply the audit trigger to any table you want to track.

```sql
-- Create sample tables to audit
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attach audit triggers
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Setting the Current User in Application Code

The trigger reads from a session variable to track who made changes. Set this in your application.

```sql
-- At the start of each request/transaction
SET LOCAL app.current_user = 'john.doe@example.com';

-- Now perform your operations
INSERT INTO customers (email, full_name)
VALUES ('alice@example.com', 'Alice Smith');

UPDATE customers
SET status = 'premium'
WHERE email = 'alice@example.com';
```

For connection pooling, use `SET LOCAL` which resets after the transaction.

## Querying the Audit Log

### Find All Changes to a Specific Record

```sql
-- Get complete history for a customer
SELECT
    action,
    performed_at,
    performed_by,
    changed_fields,
    old_data,
    new_data
FROM audit_log
WHERE table_name = 'customers'
    AND record_id = '42'
ORDER BY performed_at DESC;
```

### Find Who Changed a Specific Field

```sql
-- Find all changes to the status field on orders
SELECT
    record_id,
    performed_at,
    performed_by,
    old_data->>'status' AS old_status,
    new_data->>'status' AS new_status
FROM audit_log
WHERE table_name = 'orders'
    AND action = 'UPDATE'
    AND 'status' = ANY(changed_fields)
ORDER BY performed_at DESC;
```

### Get Changes Within a Time Range

```sql
-- All changes in the last 24 hours
SELECT
    table_name,
    action,
    record_id,
    performed_by,
    performed_at
FROM audit_log
WHERE performed_at > NOW() - INTERVAL '24 hours'
ORDER BY performed_at DESC;
```

### Reconstruct Historical State

```sql
-- Get the state of a customer record at a specific point in time
WITH history AS (
    SELECT
        new_data,
        performed_at,
        ROW_NUMBER() OVER (ORDER BY performed_at DESC) AS rn
    FROM audit_log
    WHERE table_name = 'customers'
        AND record_id = '42'
        AND performed_at <= '2026-01-15 12:00:00'::timestamptz
        AND action IN ('INSERT', 'UPDATE')
)
SELECT new_data
FROM history
WHERE rn = 1;
```

## Excluding Sensitive Columns

Some columns should not be logged for security reasons.

```sql
CREATE OR REPLACE FUNCTION audit_trigger_exclude_sensitive()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    excluded_columns TEXT[] := ARRAY['password_hash', 'ssn', 'credit_card'];
    col TEXT;
BEGIN
    -- Convert to JSON and remove sensitive columns
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        old_data := to_jsonb(OLD);
        FOREACH col IN ARRAY excluded_columns LOOP
            old_data := old_data - col;
        END LOOP;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        new_data := to_jsonb(NEW);
        FOREACH col IN ARRAY excluded_columns LOOP
            new_data := new_data - col;
        END LOOP;
    END IF;

    -- Insert audit record with sanitized data
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, performed_by)
    VALUES (
        TG_TABLE_NAME,
        COALESCE((new_data->>'id'), (old_data->>'id')),
        TG_OP,
        old_data,
        new_data,
        COALESCE(current_setting('app.current_user', true), session_user)
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Managing Audit Log Growth

Audit tables grow fast. Plan for retention and archival.

### Partition by Time

```sql
-- Create partitioned audit log
CREATE TABLE audit_log_partitioned (
    id BIGSERIAL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    performed_by TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, performed_at)
) PARTITION BY RANGE (performed_at);

-- Create monthly partitions
CREATE TABLE audit_log_2026_01 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE audit_log_2026_02 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Archive Old Partitions

```sql
-- Detach old partition for archival
ALTER TABLE audit_log_partitioned
    DETACH PARTITION audit_log_2025_01;

-- Export to external storage
COPY audit_log_2025_01 TO '/backup/audit_2025_01.csv' WITH CSV HEADER;

-- Drop after confirmed backup
DROP TABLE audit_log_2025_01;
```

## Performance Considerations

Triggers add overhead to every write operation. Here are strategies to minimize impact.

```sql
-- Use AFTER triggers, not BEFORE
-- AFTER triggers run after the row is locked, reducing contention

-- Consider async audit logging for high-throughput tables
-- Write to a queue table, process with background worker

CREATE TABLE audit_queue (
    id BIGSERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE
);

-- Simpler trigger that just queues the audit
CREATE OR REPLACE FUNCTION queue_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_queue (payload)
    VALUES (jsonb_build_object(
        'table', TG_TABLE_NAME,
        'action', TG_OP,
        'old', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
        'new', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
        'ts', NOW()
    ));

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Testing Your Audit Trail

```sql
-- Insert test data
INSERT INTO customers (email, full_name)
VALUES ('test@example.com', 'Test User');

-- Update the record
UPDATE customers
SET full_name = 'Updated Name', status = 'premium'
WHERE email = 'test@example.com';

-- Delete the record
DELETE FROM customers WHERE email = 'test@example.com';

-- Verify audit trail captured everything
SELECT action, changed_fields, old_data, new_data, performed_at
FROM audit_log
WHERE table_name = 'customers'
ORDER BY performed_at;
```

---

A well-implemented audit trail provides invaluable visibility into your data's history. With PostgreSQL triggers, you can capture comprehensive change records without touching application code. Start with the generic approach shown here, then customize exclusions and retention policies based on your compliance and operational needs.
