# How to Handle ClickHouse Disk Full Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk Full, Incident Response, Storage, Operation

Description: Respond to a ClickHouse disk full event by identifying large tables and partitions, freeing space safely, and preventing recurrence with TTL and monitoring.

---

A full disk stops ClickHouse from accepting new inserts and can corrupt part merges in progress. Acting quickly and methodically prevents data loss.

## Immediate Triage

Check disk usage:

```bash
df -h /var/lib/clickhouse
du -sh /var/lib/clickhouse/data/default/*/
```

Check which tables are largest:

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    count() AS part_count
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 10;
```

## Free Space Quickly

1. Drop old partitions from non-critical tables:

```sql
-- Identify old partitions
SELECT partition, formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'logs' AND active
GROUP BY partition
ORDER BY partition ASC
LIMIT 10;

-- Drop the oldest partition
ALTER TABLE logs DROP PARTITION '202401';
```

2. Remove inactive (detached) parts:

```bash
ls -lh /var/lib/clickhouse/data/default/events/detached/
```

```sql
-- Remove all detached parts for a table
SET allow_drop_detached = 1;
ALTER TABLE events DROP DETACHED PARTITION ALL;
```

3. Manually force a merge to compact small parts (reduces overhead):

```sql
OPTIMIZE TABLE events FINAL;
```

## Set TTL to Prevent Recurrence

```sql
ALTER TABLE logs MODIFY TTL ts + INTERVAL 30 DAY;
```

For cold data, move to cheaper storage before deletion:

```sql
ALTER TABLE logs MODIFY TTL
    ts + INTERVAL 14 DAY TO DISK 's3',
    ts + INTERVAL 30 DAY DELETE;
```

## Add Monitoring Alerts

```bash
# Shell script for cron / monitoring agent
USAGE=$(df /var/lib/clickhouse | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$USAGE" -gt 80 ]; then
    echo "ClickHouse disk at ${USAGE}%" | mail -s "ALERT: CH Disk" ops@company.com
fi
```

Or configure [OneUptime](https://oneuptime.com) to check disk utilization every 5 minutes and alert at 75% and 85% thresholds so you have time to respond before a full-disk event.

## Summary

Disk full events are recoverable by dropping old partitions and detached parts. Prevent recurrence with TTL policies, cold-storage tiering, and disk utilization monitoring with multi-threshold alerts.
