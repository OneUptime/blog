# How to Monitor MySQL InnoDB Buffer Pool, Slow Query Rate, and Thread State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MySQL, InnoDB, Buffer Pool Monitoring

Description: Monitor MySQL InnoDB buffer pool hit ratio, slow query rate, and thread state using the OpenTelemetry Collector MySQL receiver for database performance tuning.

MySQL's InnoDB storage engine relies heavily on its buffer pool for caching data and indexes. When the buffer pool is too small, MySQL reads from disk, which is orders of magnitude slower. Monitoring buffer pool efficiency alongside slow query rates and thread states gives you a complete picture of MySQL performance.

## Collector Configuration

```yaml
receivers:
  mysql:
    endpoint: "mysql:3306"
    username: monitoring
    password: "${env:MYSQL_PASSWORD}"
    database: information_schema
    collection_interval: 15s
    metrics:
      mysql.buffer_pool.pages:
        enabled: true
      mysql.buffer_pool.data_pages:
        enabled: true
      mysql.buffer_pool.operations:
        enabled: true
      mysql.buffer_pool.page_flushes:
        enabled: true
      mysql.commands:
        enabled: true
      mysql.threads:
        enabled: true
      mysql.query.count:
        enabled: true
      mysql.query.slow.count:
        enabled: true
      mysql.connection.count:
        enabled: true
      mysql.tmp_resources:
        enabled: true
      mysql.sorts:
        enabled: true
      mysql.locks:
        enabled: true
      mysql.row_locks:
        enabled: true

processors:
  batch:
    timeout: 10s
  resource:
    attributes:
      - key: service.name
        value: mysql
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [mysql]
      processors: [resource, batch]
      exporters: [otlp]
```

## InnoDB Buffer Pool Metrics

### Buffer Pool Hit Ratio

The buffer pool hit ratio tells you how often InnoDB finds data in memory versus reading from disk:

```text
buffer_pool_hit_ratio = 1 - (rate(mysql.buffer_pool.operations{operation="reads"}[5m]) / rate(mysql.buffer_pool.operations{operation="read_requests"}[5m]))
```

A hit ratio above 99% is good. Below 95% indicates the buffer pool is too small for your working set.

### Buffer Pool Pages

```text
mysql.buffer_pool.pages{kind="total"}       - Total pages in buffer pool
mysql.buffer_pool.pages{kind="data"}        - Pages containing data
mysql.buffer_pool.pages{kind="free"}        - Free (unused) pages
mysql.buffer_pool.data_pages{status="dirty"} - Modified data pages not yet flushed to disk
```

If `free` pages are consistently at zero, the buffer pool is fully utilized and InnoDB is evicting pages to make room for new data.

### Buffer Pool Utilization

```text
buffer_pool_utilization = mysql.buffer_pool.pages{kind="data"} / mysql.buffer_pool.pages{kind="total"} * 100
```

Above 95% utilization means the buffer pool is nearly full. Consider increasing `innodb_buffer_pool_size`.

### Page Flushes

```text
mysql.buffer_pool.page_flushes - Number of requests to flush pages from the buffer pool
flush_rate = rate(mysql.buffer_pool.page_flushes[5m])
```

High flush rates during normal operations indicate the buffer pool is under pressure.

## Slow Query Monitoring

### Slow Query Count

```text
mysql.query.slow.count - Total slow queries (cumulative)
slow_query_rate = rate(mysql.query.slow.count[5m])
```

Enable the slow query log in MySQL:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;  -- queries taking more than 2 seconds
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL log_output = 'FILE';
```

### Parsing Slow Query Logs

Use the filelog receiver to collect slow query logs:

```yaml
receivers:
  filelog/mysql-slow:
    include:
      - /var/log/mysql/slow.log
    start_at: end
    multiline:
      line_start_pattern: '^# Time:'
    operators:
      - type: regex_parser
        regex: '# Query_time: (?P<query_time>[\d.]+)\s+Lock_time: (?P<lock_time>[\d.]+)\s+Rows_sent: (?P<rows_sent>\d+)\s+Rows_examined: (?P<rows_examined>\d+)'
      - type: add
        field: attributes["log.type"]
        value: "slow_query"
```

## Thread State Monitoring

### Thread Counts

```text
mysql.threads{kind="connected"}  - Total connected threads
mysql.threads{kind="running"}    - Threads actively executing
mysql.threads{kind="cached"}     - Threads in the thread cache
mysql.threads{kind="created"}    - Total threads created (cumulative)
```

High `running` thread count indicates many concurrent queries. High `created` count relative to `cached` means the thread cache is too small.

### Thread State Detail

For detailed thread state information, query `SHOW PROCESSLIST`:

```sql
SELECT
    STATE,
    COUNT(*) as count
FROM information_schema.PROCESSLIST
GROUP BY STATE
ORDER BY count DESC;
```

Common states to watch:
- `Sending data` - Reading and processing rows
- `Waiting for table lock` - Lock contention
- `Sorting result` - Sorting without an index
- `Creating tmp table` - Query uses temporary tables

## Creating a Monitoring User

```sql
CREATE USER 'monitoring'@'%' IDENTIFIED BY 'monitor_password';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'monitoring'@'%';
GRANT SELECT ON performance_schema.* TO 'monitoring'@'%';
FLUSH PRIVILEGES;
```

## Alert Conditions

```yaml
# Buffer pool hit ratio low

- alert: MySQLBufferPoolLowHitRatio
  condition: buffer_pool_hit_ratio < 0.95
  for: 15m
  severity: warning
  message: "Buffer pool hit ratio is {{ value }}. Consider increasing innodb_buffer_pool_size."

# Slow queries increasing
- alert: MySQLSlowQueries
  condition: rate(mysql.query.slow.count[5m]) > 5
  for: 10m
  severity: warning
  message: "{{ value }} slow queries/sec. Check slow query log for details."

# High thread count
- alert: MySQLHighThreadCount
  condition: mysql.threads{kind="running"} > 50
  for: 5m
  severity: warning
  message: "{{ value }} threads actively running. May indicate query performance issues."

# Lock waits
- alert: MySQLRowLockWaits
  condition: rate(mysql.row_locks{kind="waits"}[5m]) > 10
  for: 5m
  severity: warning
  message: "{{ value }} row lock waits/sec. Check for lock contention."

# Connection count near max
- alert: MySQLConnectionsHigh
  condition: mysql.threads{kind="connected"} > 140
  for: 5m
  severity: warning
  message: "{{ value }} connections. Approaching max_connections limit."
```

## Summary

MySQL performance monitoring with OpenTelemetry centers on three areas: InnoDB buffer pool efficiency (hit ratio, utilization, flush rate), slow query detection (count and detailed log analysis), and thread state (running threads, lock waits). The MySQL receiver collects these metrics from MySQL's global status and InnoDB tables. Set alerts on buffer pool hit ratio below 95%, growing slow query rates, and high concurrent thread counts to catch performance issues early and guide tuning decisions.
