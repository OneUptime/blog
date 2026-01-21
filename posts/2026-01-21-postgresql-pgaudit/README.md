# How to Audit PostgreSQL Access with pgaudit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pgaudit, Audit, Security, Compliance, Logging

Description: A guide to implementing comprehensive audit logging in PostgreSQL using the pgaudit extension for compliance and security monitoring.

---

pgaudit provides detailed session and object audit logging for PostgreSQL. This guide covers installation and configuration for compliance requirements.

## Installation

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgaudit

# RHEL/CentOS
sudo dnf install pgaudit16
```

## Configuration

```conf
# postgresql.conf
shared_preload_libraries = 'pgaudit'

# Audit settings
pgaudit.log = 'ddl, write'
pgaudit.log_catalog = off
pgaudit.log_parameter = on
pgaudit.log_statement_once = off
pgaudit.log_level = log
```

## Enable Extension

```sql
CREATE EXTENSION pgaudit;
```

## Audit Classes

| Class | Description |
|-------|-------------|
| READ | SELECT, COPY FROM |
| WRITE | INSERT, UPDATE, DELETE |
| FUNCTION | Function calls |
| ROLE | Role/permission changes |
| DDL | Schema changes |
| MISC | Other commands |
| ALL | All of the above |

## Configuration Examples

### Minimal (DDL Only)

```conf
pgaudit.log = 'ddl'
```

### Comprehensive

```conf
pgaudit.log = 'all'
pgaudit.log_catalog = off
pgaudit.log_parameter = on
```

### Role-Based Auditing

```sql
-- Create audit role
CREATE ROLE auditor;

-- Set pgaudit role
ALTER SYSTEM SET pgaudit.role = 'auditor';

-- Grant to tables for object auditing
GRANT SELECT ON sensitive_data TO auditor;
```

## Log Output

```
AUDIT: SESSION,1,1,DDL,CREATE TABLE,TABLE,public.test,CREATE TABLE test (id int);
AUDIT: SESSION,2,1,WRITE,INSERT,TABLE,public.users,INSERT INTO users VALUES (1, 'test');
```

## Parsing Logs

```bash
# Extract audit entries
grep "AUDIT:" /var/log/postgresql/*.log | cut -d, -f4-

# Count by operation
grep "AUDIT:" /var/log/postgresql/*.log | cut -d, -f4 | sort | uniq -c
```

## Best Practices

1. **Log write operations** - Track data changes
2. **Disable catalog logging** - Reduce noise
3. **Enable parameters** - For full context
4. **Rotate logs** - Manage storage
5. **Parse and analyze** - Regular review

## Conclusion

pgaudit provides comprehensive audit logging for PostgreSQL. Configure based on compliance requirements and regularly analyze logs for security monitoring.
