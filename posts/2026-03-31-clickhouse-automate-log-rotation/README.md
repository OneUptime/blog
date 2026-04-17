# How to Automate ClickHouse Log Rotation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Log Rotation, Automation, Operation, Disk Management

Description: Automate ClickHouse log rotation using built-in config settings and OS-level logrotate to prevent disk exhaustion from unbounded log growth.

---

## Why Log Rotation Is Critical

ClickHouse generates several log files: `clickhouse-server.log`, `clickhouse-server.err.log`, and various trace logs. Without rotation, these files grow without bound and eventually fill the disk, causing the server to crash.

## ClickHouse Built-in Log Settings

ClickHouse has built-in log rotation controlled in `config.xml`. This is the easiest way to manage log size:

```xml
<logger>
    <level>information</level>
    <log>/var/log/clickhouse-server/clickhouse-server.log</log>
    <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
    <size>500M</size>      <!-- rotate when file exceeds 500 MB -->
    <count>5</count>       <!-- keep 5 rotated files -->
</logger>
```

With `<size>` and `<count>` set, ClickHouse rotates the log file automatically without any external tool.

## Adding logrotate as a Safety Net

Even with built-in rotation, add a logrotate config as a backstop:

```text
/var/log/clickhouse-server/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        kill -HUP $(cat /var/run/clickhouse-server/clickhouse-server.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
```

Place this file at `/etc/logrotate.d/clickhouse-server` and it runs via the system logrotate cron job.

## Rotating Query Logs Stored in ClickHouse Tables

ClickHouse also writes query logs to internal tables like `system.query_log`. These grow indefinitely by default. Configure TTL-based cleanup:

```xml
<query_log>
    <database>system</database>
    <table>query_log</table>
    <ttl>event_date + INTERVAL 30 DAY DELETE</ttl>
    <flush_interval_milliseconds>7500</flush_interval_milliseconds>
</query_log>
```

Similar settings apply to `system.trace_log`, `system.metric_log`, and `system.part_log`.

## Manually Dropping Old Partitions

If TTL is not configured, drop old partitions manually:

```sql
ALTER TABLE system.query_log
    DROP PARTITION tuple(toYYYYMM(now() - INTERVAL 60 DAY));
```

`DROP PARTITION` needs a literal value or a `tuple(...)` that matches the partition key, not a bare function call.

Automate this with a cron job:

```bash
#!/bin/bash
PARTITION=$(date -d "60 days ago" +%Y%m)
clickhouse-client --query \
  "ALTER TABLE system.query_log DROP PARTITION ${PARTITION}"
```

## Monitoring Log Disk Usage

Check current log file sizes to catch rotation failures early:

```bash
du -sh /var/log/clickhouse-server/* | sort -rh | head -20
```

Set an alert in OneUptime to notify on-call when `/var/log/clickhouse-server` exceeds 80% of its allocated partition.

## Summary

Automating ClickHouse log rotation through built-in config size limits, logrotate, and TTL-based cleanup of system tables keeps disk usage bounded and prevents the server from going down due to a full disk.
