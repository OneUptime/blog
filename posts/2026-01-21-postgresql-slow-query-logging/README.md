# How to Set Up PostgreSQL Slow Query Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Slow Queries, Logging, Performance, Monitoring

Description: A comprehensive guide to configuring PostgreSQL slow query logging, covering log settings, analysis tools, and optimization strategies.

---

Slow query logging helps identify performance bottlenecks by recording queries that exceed a specified duration. This guide covers configuration, analysis, and optimization.

## Basic Configuration

```conf
# postgresql.conf

# Log queries slower than 1 second
log_min_duration_statement = 1000  # milliseconds

# Or log all queries with duration
log_statement = 'all'
log_duration = on

# Log line prefix for context
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Log destination
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
```

## Recommended Settings

```conf
# Production slow query logging
log_min_duration_statement = 500  # 500ms threshold
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0  # Log all temp file usage

# Auto-explain for slow queries
shared_preload_libraries = 'auto_explain'
auto_explain.log_min_duration = '1s'
auto_explain.log_analyze = on
auto_explain.log_buffers = on
```

## Query Analysis

### pg_stat_statements

```sql
CREATE EXTENSION pg_stat_statements;

-- Top slow queries
SELECT
    substring(query, 1, 100) AS query,
    calls,
    round(mean_exec_time::numeric, 2) AS avg_ms,
    round(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### pgBadger Analysis

```bash
# Install pgBadger
sudo apt install pgbadger

# Generate report
pgbadger /var/log/postgresql/*.log -o report.html

# Incremental analysis
pgbadger --incremental /var/log/postgresql/*.log
```

## Optimization Workflow

1. **Enable slow query logging**
2. **Collect logs for representative period**
3. **Analyze with pgBadger or pg_stat_statements**
4. **Identify top offenders**
5. **Use EXPLAIN ANALYZE on slow queries**
6. **Apply optimizations (indexes, query rewrites)**
7. **Verify improvements**

## Alerting

```yaml
# Prometheus alert rule
- alert: PostgreSQLSlowQueries
  expr: rate(pg_stat_statements_seconds_total[5m]) > 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High slow query rate detected"
```

## Best Practices

1. **Start with reasonable threshold** - 500ms-1s
2. **Log to separate files** - Easier analysis
3. **Use pg_stat_statements** - Aggregated statistics
4. **Regular analysis** - Weekly review of slow queries
5. **Correlate with load** - Understand patterns

## Conclusion

Slow query logging is essential for PostgreSQL performance optimization. Configure appropriate thresholds, analyze regularly, and act on findings.
