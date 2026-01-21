# How to Optimize PostgreSQL Connection Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Connections, Configuration, Performance, max_connections

Description: A guide to optimizing PostgreSQL connection settings, covering max_connections, memory implications, and sizing strategies.

---

Connection settings significantly impact PostgreSQL performance and resource usage. This guide covers optimal configuration.

## Key Settings

### max_connections

```conf
# postgresql.conf
max_connections = 100  # Default

# Each connection uses ~10MB RAM
# Formula: available_memory / 10MB = rough max
```

### Connection Calculation

```
Available memory for connections = Total RAM - shared_buffers - OS needs

Example (32GB server):
- shared_buffers: 8GB
- OS/other: 4GB
- Available: 20GB
- Max connections: 20GB / 10MB = 2000 (but use pooling instead)
```

### superuser_reserved_connections

```conf
# Reserve for admin access
superuser_reserved_connections = 3
```

## With Connection Pooling

```conf
# With PgBouncer (recommended)
max_connections = 100  # PgBouncer handles more

# PgBouncer settings
max_client_conn = 1000
default_pool_size = 25
```

## Per-Connection Memory

```conf
# Memory per operation
work_mem = 16MB

# Effective per-connection limit
# max memory = work_mem * sorts/hashes per query
```

## Timeouts

```conf
# Idle session timeout (PostgreSQL 14+)
idle_session_timeout = 300000  # 5 minutes

# Idle in transaction timeout
idle_in_transaction_session_timeout = 60000  # 1 minute

# Statement timeout
statement_timeout = 30000  # 30 seconds
```

## TCP Settings

```conf
# Keepalives (detect dead connections)
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 6
```

## Monitoring Connections

```sql
-- Current connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Connection by state
SELECT state, COUNT(*)
FROM pg_stat_activity
GROUP BY state;

-- Long-running connections
SELECT pid, usename, state, query_start, query
FROM pg_stat_activity
WHERE state != 'idle'
AND query_start < NOW() - INTERVAL '5 minutes';
```

## Sizing Guidelines

| Workload | max_connections | Notes |
|----------|-----------------|-------|
| Small app | 50-100 | Without pooler |
| Medium | 100-200 | Consider pooler |
| Large | 100-200 + pooler | Pooler required |

## Best Practices

1. **Use connection pooling** - Essential for scaling
2. **Set appropriate timeouts** - Clean up idle connections
3. **Reserve admin connections** - superuser_reserved
4. **Monitor usage** - Alert before hitting limits
5. **Size for workload** - Not maximum possible

## Conclusion

Keep max_connections reasonable and use connection pooling for high-concurrency applications. Monitor connection usage and set appropriate timeouts.
