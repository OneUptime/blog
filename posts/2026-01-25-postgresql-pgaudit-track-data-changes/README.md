# How to Track Data Changes with pgAudit in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Audit, pgAudit, Compliance, Security, Logging

Description: Learn how to implement comprehensive audit logging in PostgreSQL using pgAudit. This guide covers installation, configuration, log analysis, and compliance-ready audit trails for SOC 2 and HIPAA requirements.

---

When regulators ask "who accessed what data and when," you need answers. PostgreSQL's built-in logging captures some information, but it falls short for serious audit requirements. pgAudit fills this gap by providing detailed session and object audit logging that satisfies compliance frameworks like SOC 2, HIPAA, and PCI DSS.

## Why pgAudit Over Standard Logging

PostgreSQL's standard logging can capture queries, but it has limitations:

- No distinction between SELECT on sensitive vs non-sensitive tables
- Cannot filter by specific objects or operations
- Logs show the query text but not which objects were actually accessed
- No structured format for compliance reporting

pgAudit addresses these by providing:
- Object-level audit logging (who accessed which table)
- Session-level logging (all DDL, all DML, etc.)
- Structured, parseable output
- Role-based audit rules

## Installing pgAudit

### On Debian/Ubuntu

```bash
# Install the extension package
sudo apt-get install postgresql-16-pgaudit

# Or for other versions
sudo apt-get install postgresql-15-pgaudit
```

### On RHEL/CentOS

```bash
# Install from PGDG repository
sudo dnf install pgaudit_16
```

### From Source

```bash
git clone https://github.com/pgaudit/pgaudit.git
cd pgaudit
make USE_PGXS=1
sudo make USE_PGXS=1 install
```

## Basic Configuration

### Enable the Extension

Edit `postgresql.conf`:

```ini
# Load pgaudit as a shared library
shared_preload_libraries = 'pgaudit'

# Restart PostgreSQL after this change
```

Then create the extension in your database:

```sql
CREATE EXTENSION pgaudit;
```

### Configure Audit Logging

```ini
# postgresql.conf - pgAudit settings

# Session audit logging - what operations to log for all users
# Options: READ, WRITE, FUNCTION, ROLE, DDL, MISC, ALL, NONE
pgaudit.log = 'DDL, WRITE'

# Log catalog (system table) access - usually disabled for noise reduction
pgaudit.log_catalog = off

# Include the object name in the audit log
pgaudit.log_relation = on

# Log statement even if command fails
pgaudit.log_statement_once = on

# Include parameter values in logs (careful with sensitive data)
pgaudit.log_parameter = on

# Log level for audit messages
pgaudit.log_level = 'log'
```

Reload configuration:

```sql
SELECT pg_reload_conf();
```

## Session Audit Logging

Session logging applies to all users based on the `pgaudit.log` setting.

### Log All Data Modifications

```ini
# postgresql.conf
pgaudit.log = 'WRITE'
```

This logs INSERT, UPDATE, DELETE, and TRUNCATE operations.

Sample log output:

```
AUDIT: SESSION,1,1,WRITE,INSERT,TABLE,public.users,
       "INSERT INTO users (email, name) VALUES ('john@example.com', 'John Doe')"
```

### Log All DDL Changes

```ini
# postgresql.conf
pgaudit.log = 'DDL'
```

Logs CREATE, ALTER, DROP statements.

### Log Read Operations

```ini
# postgresql.conf
pgaudit.log = 'READ'
```

Warning: This generates significant log volume on read-heavy systems.

### Combine Multiple Categories

```ini
# Log both data changes and schema changes
pgaudit.log = 'DDL, WRITE'
```

## Object Audit Logging

Object-level auditing provides fine-grained control over which tables are audited and for which users.

### Create an Audit Role

```sql
-- Create a role to represent audit targets
CREATE ROLE auditor;

-- Grant the auditor role access to tables you want to audit
GRANT SELECT ON sensitive_customers TO auditor;
GRANT ALL ON financial_transactions TO auditor;
```

### Configure Object Auditing

```sql
-- Set the audit role
ALTER SYSTEM SET pgaudit.role = 'auditor';
SELECT pg_reload_conf();
```

Now, any query that touches tables where `auditor` has permissions will be logged.

### Example: Audit Sensitive Tables Only

```sql
-- Create auditor role
CREATE ROLE auditor NOLOGIN;

-- Grant to sensitive tables only
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO auditor;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO auditor;
GRANT SELECT ON customer_ssn TO auditor;

-- This generates audit logs:
SELECT * FROM customers WHERE id = 1;

-- This does NOT generate audit logs (products not granted to auditor):
SELECT * FROM products;
```

## Per-User Audit Configuration

Different users can have different audit levels.

```sql
-- Service account gets full audit logging
ALTER ROLE app_service SET pgaudit.log = 'ALL';

-- Admin users get DDL and WRITE logging
ALTER ROLE dba SET pgaudit.log = 'DDL, WRITE';

-- Read-only reporting user needs minimal logging
ALTER ROLE reporter SET pgaudit.log = 'DDL';
```

## Understanding Audit Log Format

pgAudit logs follow this format:

```
AUDIT: TYPE,STATEMENT_ID,SUBSTATEMENT_ID,CLASS,COMMAND,OBJECT_TYPE,OBJECT_NAME,STATEMENT
```

| Field | Description |
|-------|-------------|
| TYPE | SESSION or OBJECT |
| STATEMENT_ID | Unique ID for the statement |
| SUBSTATEMENT_ID | For statements with sub-operations |
| CLASS | READ, WRITE, FUNCTION, ROLE, DDL, MISC |
| COMMAND | SQL command (SELECT, INSERT, etc.) |
| OBJECT_TYPE | TABLE, INDEX, SEQUENCE, etc. |
| OBJECT_NAME | Fully qualified object name |
| STATEMENT | The SQL query |

### Sample Log Entries

```
# INSERT operation
AUDIT: SESSION,1,1,WRITE,INSERT,TABLE,public.orders,
       "INSERT INTO orders (customer_id, amount) VALUES (42, 99.99)"

# DDL operation
AUDIT: SESSION,2,1,DDL,CREATE TABLE,TABLE,public.new_table,
       "CREATE TABLE new_table (id serial primary key, data text)"

# Object-level audit (SELECT on sensitive table)
AUDIT: OBJECT,3,1,READ,SELECT,TABLE,public.customer_ssn,
       "SELECT ssn FROM customer_ssn WHERE customer_id = 123"
```

## Log Output Configuration

### Log to File with Rotation

```ini
# postgresql.conf
log_destination = 'csvlog'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_rotation_size = 100MB
```

### JSON Logging for SIEM Integration

Use a log shipper to parse CSV logs into JSON:

```bash
#!/bin/bash
# parse_audit_logs.sh - Convert pgAudit CSV to JSON

csvtool namedcol log_time,user_name,database_name,message \
    /var/log/postgresql/postgresql-2026-01-25.csv | \
    jq -R -s 'split("\n") | map(select(length > 0) | split(",") |
        {timestamp: .[0], user: .[1], database: .[2], audit: .[3]})'
```

## Querying Audit Logs

### Create an Audit Log Table

For long-term storage and querying, import logs into a table:

```sql
-- Create table for audit log storage
CREATE TABLE audit_log_archive (
    id BIGSERIAL PRIMARY KEY,
    log_time TIMESTAMPTZ,
    user_name TEXT,
    database_name TEXT,
    connection_from TEXT,
    audit_type TEXT,
    statement_id INT,
    class TEXT,
    command TEXT,
    object_type TEXT,
    object_name TEXT,
    statement TEXT,
    raw_log TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_audit_log_time ON audit_log_archive(log_time);
CREATE INDEX idx_audit_user ON audit_log_archive(user_name);
CREATE INDEX idx_audit_object ON audit_log_archive(object_name);
```

### Import from CSV Log

```sql
-- Load audit entries (requires parsing the audit message)
COPY audit_log_archive (log_time, user_name, database_name, raw_log)
FROM '/var/log/postgresql/postgresql-2026-01-25.csv'
WITH (FORMAT csv, HEADER true);
```

### Compliance Queries

```sql
-- Who accessed sensitive customer data in the last 30 days?
SELECT DISTINCT
    user_name,
    log_time,
    object_name,
    command
FROM audit_log_archive
WHERE object_name LIKE '%customer%'
    AND log_time > NOW() - INTERVAL '30 days'
ORDER BY log_time DESC;

-- All DDL changes by user
SELECT
    user_name,
    log_time,
    command,
    object_name,
    statement
FROM audit_log_archive
WHERE class = 'DDL'
ORDER BY log_time DESC
LIMIT 100;

-- Failed login attempts (requires log_connections = on)
SELECT
    log_time,
    connection_from,
    raw_log
FROM audit_log_archive
WHERE raw_log LIKE '%authentication failed%'
ORDER BY log_time DESC;
```

## Performance Considerations

pgAudit adds overhead, especially with `READ` logging enabled.

```sql
-- Check current settings
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'pgaudit%';

-- Minimal logging for production
-- Only log writes and DDL
ALTER SYSTEM SET pgaudit.log = 'DDL, WRITE';

-- Use object auditing for sensitive tables instead of session READ
-- This reduces volume significantly
```

### Benchmark Impact

| Configuration | Overhead |
|--------------|----------|
| pgaudit.log = 'DDL' | < 1% |
| pgaudit.log = 'WRITE' | 1-3% |
| pgaudit.log = 'READ' | 5-15% |
| pgaudit.log = 'ALL' | 10-20% |

## Compliance Checklist

For SOC 2 / HIPAA compliance, ensure:

- [ ] All DDL operations are logged
- [ ] Data modifications (INSERT/UPDATE/DELETE) are logged
- [ ] Access to sensitive tables uses object-level auditing
- [ ] Logs include user identity and timestamp
- [ ] Logs are retained for required period (often 1+ year)
- [ ] Logs are shipped to a SIEM for alerting
- [ ] Log access is restricted and audited

---

pgAudit transforms PostgreSQL into an auditable database platform. Start with DDL and WRITE logging, add object-level auditing for sensitive tables, and ship logs to your SIEM. When auditors come knocking, you will have the evidence trail they need.
