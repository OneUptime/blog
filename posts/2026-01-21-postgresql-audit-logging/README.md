# How to Implement Audit Logging in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Audit Logging, Compliance, Security, Triggers, pgaudit

Description: A comprehensive guide to implementing audit logging in PostgreSQL, covering trigger-based logging, pgaudit extension, CDC patterns, and compliance requirements.

---

Audit logging tracks all changes to your database for security, compliance, and debugging purposes. This guide covers multiple approaches to implement comprehensive audit trails in PostgreSQL.

## Prerequisites

- PostgreSQL 12+ installed
- Understanding of compliance requirements
- Sufficient storage for audit data

## Audit Logging Approaches

| Approach | Pros | Cons |
|----------|------|------|
| Trigger-based | Flexible, captures data | Performance overhead |
| pgaudit | Comprehensive, SQL-level | Log-based, needs parsing |
| CDC (Debezium) | Real-time, external | Complex setup |
| Application-level | Full control | Incomplete coverage |

## Trigger-Based Audit Logging

### Audit Table Structure

```sql
-- Comprehensive audit log table
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    schema_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    row_id TEXT,
    user_name VARCHAR(100),
    application_name VARCHAR(100),
    client_addr INET,
    session_id TEXT,
    transaction_id BIGINT,
    statement_id INTEGER,
    query TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_table ON audit_log(table_name, executed_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_name, executed_at);
CREATE INDEX idx_audit_log_time ON audit_log(executed_at);
CREATE INDEX idx_audit_log_row ON audit_log(table_name, row_id);
```

### Generic Audit Trigger

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[];
    row_id TEXT;
BEGIN
    -- Determine row ID
    IF TG_OP = 'DELETE' THEN
        row_id := OLD.id::TEXT;
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'INSERT' THEN
        row_id := NEW.id::TEXT;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        row_id := NEW.id::TEXT;
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Find changed fields
        SELECT array_agg(key)
        INTO changed_fields
        FROM (
            SELECT key
            FROM jsonb_each(to_jsonb(OLD)) AS o(key, value)
            FULL OUTER JOIN jsonb_each(to_jsonb(NEW)) AS n(key, value)
                USING (key)
            WHERE o.value IS DISTINCT FROM n.value
        ) changed;
    END IF;

    -- Insert audit record
    INSERT INTO audit_log (
        schema_name,
        table_name,
        operation,
        old_data,
        new_data,
        changed_fields,
        row_id,
        user_name,
        application_name,
        client_addr,
        session_id,
        transaction_id
    ) VALUES (
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        row_id,
        current_user,
        current_setting('application_name', true),
        inet_client_addr(),
        pg_backend_pid()::TEXT,
        txid_current()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Apply Audit Trigger

```sql
-- Create audit trigger on a table
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Create triggers for multiple tables
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['users', 'orders', 'products', 'customers'];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I_audit_trigger
             AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION audit_trigger_function()',
            table_name, table_name
        );
    END LOOP;
END;
$$;
```

### Query Audit Log

```sql
-- Recent changes to a table
SELECT
    operation,
    row_id,
    user_name,
    executed_at,
    changed_fields
FROM audit_log
WHERE table_name = 'users'
ORDER BY executed_at DESC
LIMIT 100;

-- Changes by specific user
SELECT *
FROM audit_log
WHERE user_name = 'admin'
AND executed_at > NOW() - INTERVAL '24 hours'
ORDER BY executed_at DESC;

-- History of specific record
SELECT
    operation,
    old_data,
    new_data,
    executed_at,
    user_name
FROM audit_log
WHERE table_name = 'users'
AND row_id = '123'
ORDER BY executed_at;

-- Reconstruct record at point in time
WITH changes AS (
    SELECT
        new_data,
        executed_at,
        ROW_NUMBER() OVER (ORDER BY executed_at DESC) AS rn
    FROM audit_log
    WHERE table_name = 'users'
    AND row_id = '123'
    AND executed_at <= '2025-01-21 12:00:00'
)
SELECT new_data FROM changes WHERE rn = 1;
```

## pgaudit Extension

### Install pgaudit

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgaudit

# RHEL/CentOS
sudo dnf install pgaudit16
```

### Configure pgaudit

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'

# Log all DDL and DML
pgaudit.log = 'ddl, write, read'

# Log statement parameters
pgaudit.log_parameter = on

# Log catalog access
pgaudit.log_catalog = off

# Log client info
pgaudit.log_client = on

# Log level
pgaudit.log_level = 'log'

# Log specific roles only
# pgaudit.role = 'auditor'
```

### Enable Extension

```sql
CREATE EXTENSION pgaudit;

-- Configure per-role auditing
ALTER ROLE admin SET pgaudit.log = 'all';
ALTER ROLE app_user SET pgaudit.log = 'write, ddl';
```

### pgaudit Log Output

```
AUDIT: SESSION,1,1,DDL,CREATE TABLE,TABLE,public.test_table,CREATE TABLE test_table (id int);,<none>
AUDIT: SESSION,2,1,WRITE,INSERT,TABLE,public.users,INSERT INTO users (name) VALUES ('John');,<none>
AUDIT: SESSION,3,1,READ,SELECT,TABLE,public.users,SELECT * FROM users;,<none>
```

### Parse pgaudit Logs

```bash
# Extract audit entries
grep "AUDIT:" /var/log/postgresql/postgresql-16-main.log > audit_entries.log

# Parse with script
#!/usr/bin/env python3
import re
import json

pattern = r'AUDIT: (\w+),(\d+),(\d+),(\w+),([^,]*),([^,]*),([^,]*),([^,]*),(.*)$'

with open('audit_entries.log') as f:
    for line in f:
        match = re.search(pattern, line)
        if match:
            entry = {
                'audit_type': match.group(1),
                'statement_id': match.group(2),
                'substatement_id': match.group(3),
                'class': match.group(4),
                'command': match.group(5),
                'object_type': match.group(6),
                'object_name': match.group(7),
                'statement': match.group(8)
            }
            print(json.dumps(entry))
```

## Application Context in Audits

### Set Application Context

```sql
-- Set context at connection time
SET application_name = 'web-app-v2.1';
SET myapp.user_id = '12345';
SET myapp.request_id = 'req-abc-123';

-- Use in audit trigger
CREATE OR REPLACE FUNCTION get_app_context()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'app_name', current_setting('application_name', true),
        'user_id', current_setting('myapp.user_id', true),
        'request_id', current_setting('myapp.request_id', true)
    );
END;
$$ LANGUAGE plpgsql;
```

### Enhanced Audit Trigger with Context

```sql
CREATE OR REPLACE FUNCTION audit_with_context()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        old_data,
        new_data,
        user_name,
        app_context
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
        current_user,
        get_app_context()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## Audit Log Management

### Partition Audit Logs

```sql
-- Create partitioned audit table
CREATE TABLE audit_log_partitioned (
    id BIGSERIAL,
    table_name VARCHAR(50) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_name VARCHAR(100),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (executed_at);

-- Create monthly partitions
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE audit_log_2025_02 PARTITION OF audit_log_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### Archive Old Audit Data

```sql
-- Move old audit data to archive
INSERT INTO audit_log_archive
SELECT * FROM audit_log
WHERE executed_at < NOW() - INTERVAL '90 days';

DELETE FROM audit_log
WHERE executed_at < NOW() - INTERVAL '90 days';

-- Or drop old partitions
DROP TABLE audit_log_2024_01;
```

### Audit Log Retention Policy

```sql
-- Automated cleanup function
CREATE OR REPLACE FUNCTION cleanup_audit_logs(retention_days INTEGER)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_log
    WHERE executed_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron
SELECT cron.schedule(
    'cleanup-audit-logs',
    '0 2 * * *',
    'SELECT cleanup_audit_logs(365)'
);
```

## Compliance Considerations

### GDPR Requirements

```sql
-- Anonymize old audit data
UPDATE audit_log
SET
    new_data = new_data - 'email' - 'name' - 'phone',
    old_data = old_data - 'email' - 'name' - 'phone'
WHERE executed_at < NOW() - INTERVAL '7 years';

-- Or delete specific user's audit trail (right to erasure)
DELETE FROM audit_log
WHERE (new_data->>'user_id')::INTEGER = 12345
   OR (old_data->>'user_id')::INTEGER = 12345;
```

### PCI-DSS Requirements

```sql
-- Ensure sensitive data is masked
CREATE OR REPLACE FUNCTION mask_sensitive_fields(data JSONB)
RETURNS JSONB AS $$
BEGIN
    -- Mask credit card numbers
    IF data ? 'card_number' THEN
        data := jsonb_set(data, '{card_number}',
            '"****-****-****-' || RIGHT(data->>'card_number', 4) || '"');
    END IF;

    -- Mask CVV
    data := data - 'cvv';

    RETURN data;
END;
$$ LANGUAGE plpgsql;

-- Apply masking in audit trigger
new_data := mask_sensitive_fields(to_jsonb(NEW));
```

## Best Practices

1. **Choose appropriate approach** - Triggers vs pgaudit based on needs
2. **Partition audit tables** - Manage growth efficiently
3. **Index appropriately** - Balance query speed and write overhead
4. **Set retention policies** - Don't keep data forever
5. **Secure audit logs** - Separate permissions
6. **Test restore procedures** - Verify audit data is usable
7. **Monitor storage** - Audit logs can grow quickly

## Conclusion

PostgreSQL audit logging provides comprehensive tracking:

1. **Trigger-based** - Full data capture, flexible queries
2. **pgaudit** - SQL statement logging, low overhead
3. **Application context** - Link to business events
4. **Compliance** - Meet regulatory requirements

Implement audit logging early and manage it proactively for security and compliance.
