# How to Handle 'Too Many Connections' in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Connections, Troubleshooting, PgBouncer, Performance

Description: A comprehensive guide to diagnosing and resolving PostgreSQL 'too many connections' errors, covering connection limits, pooling solutions, and monitoring strategies.

---

The "too many connections" error occurs when PostgreSQL reaches its maximum connection limit. This guide covers diagnosis, immediate fixes, and long-term solutions.

## Understanding the Error

```
FATAL: too many connections for role "myuser"
FATAL: sorry, too many clients already
```

## Check Current Connections

```sql
-- Current connection count
SELECT COUNT(*) FROM pg_stat_activity;

-- Connection limit
SHOW max_connections;

-- Connections by state
SELECT state, COUNT(*)
FROM pg_stat_activity
GROUP BY state;

-- Connections by user
SELECT usename, COUNT(*)
FROM pg_stat_activity
GROUP BY usename
ORDER BY COUNT(*) DESC;

-- Connections by application
SELECT application_name, COUNT(*)
FROM pg_stat_activity
GROUP BY application_name
ORDER BY COUNT(*) DESC;
```

## Immediate Solutions

### Terminate Idle Connections

```sql
-- Kill idle connections older than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes'
AND pid != pg_backend_pid();

-- Kill all connections for specific user
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'problematic_user'
AND pid != pg_backend_pid();
```

### Increase max_connections (Temporary)

```sql
-- Check current value
SHOW max_connections;

-- Increase (requires restart)
ALTER SYSTEM SET max_connections = 200;
-- Then: sudo systemctl restart postgresql
```

## Long-Term Solutions

### Connection Pooling (Recommended)

```ini
# pgbouncer.ini
[databases]
myapp = host=localhost port=5432 dbname=myapp

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### Connection Timeouts

```conf
# postgresql.conf
idle_in_transaction_session_timeout = 60000  # 60 seconds
idle_session_timeout = 300000  # 5 minutes (PostgreSQL 14+)
```

### Per-User Limits

```sql
-- Limit connections per user
ALTER ROLE myuser CONNECTION LIMIT 20;

-- Check limits
SELECT rolname, rolconnlimit FROM pg_roles;
```

## Monitoring

```sql
-- Connection usage percentage
SELECT
    (SELECT COUNT(*) FROM pg_stat_activity) AS current,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max,
    ROUND(100.0 * COUNT(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) AS usage_percent
FROM pg_stat_activity;
```

## Best Practices

1. **Use connection pooling** - PgBouncer or built-in
2. **Set appropriate limits** - Per-user connection limits
3. **Monitor connections** - Alert before hitting limits
4. **Close connections properly** - Application-level fixes
5. **Use connection timeouts** - Clean up idle connections

## Conclusion

Resolve "too many connections" by implementing connection pooling, setting appropriate limits, and monitoring connection usage proactively.
