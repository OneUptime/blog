# How to Automate ClickHouse Partition Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Partition, Cleanup, Automation, Data Lifecycle, TTL

Description: Learn how to automate partition cleanup in ClickHouse using TTL rules, scheduled scripts, and Python-based partition drop automation to manage data retention.

---

## Why Automate Partition Cleanup

ClickHouse tables storing time-series data grow indefinitely without a retention policy. Manual partition drops are error-prone. Automating cleanup ensures storage stays bounded, reduces query scan time on old data, and keeps part counts manageable.

## Option 1: TTL Rules (Recommended)

ClickHouse's built-in TTL is the simplest and most reliable approach. TTL runs automatically as a background operation.

```sql
-- Delete rows older than 90 days
CREATE TABLE events (
  event_time DateTime,
  user_id    UInt64,
  event_type String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (user_id, event_time)
TTL event_time + INTERVAL 90 DAY;
```

Add TTL to an existing table:

```sql
ALTER TABLE events MODIFY TTL event_time + INTERVAL 90 DAY;
```

Force TTL materialization immediately (normally runs during merges):

```sql
ALTER TABLE events MATERIALIZE TTL;
```

## Option 2: Scheduled Partition DROP Script

For more control (e.g., keep 6 months of monthly partitions), use a scheduled script.

```python
import clickhouse_connect
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

def cleanup_old_partitions(
    client,
    database: str,
    table: str,
    retention_months: int = 6
) -> list[str]:
    cutoff = datetime.now() - relativedelta(months=retention_months)
    cutoff_partition = int(cutoff.strftime('%Y%m'))

    # Get existing partitions older than cutoff
    result = client.query(f"""
        SELECT DISTINCT partition
        FROM system.parts
        WHERE database = '{database}'
          AND table = '{table}'
          AND active = 1
          AND toUInt32(partition) < {cutoff_partition}
        ORDER BY partition
    """)

    dropped = []
    for row in result.result_rows:
        partition = row[0]
        client.command(f"ALTER TABLE {database}.{table} DROP PARTITION ID '{partition}'")
        dropped.append(partition)
        print(f"Dropped partition {partition} from {database}.{table}")

    return dropped


if __name__ == '__main__':
    client = clickhouse_connect.get_client(
        host='localhost',
        username='default',
        password=''
    )
    dropped = cleanup_old_partitions(client, 'analytics', 'events', retention_months=6)
    print(f"Removed {len(dropped)} partitions")
```

## Option 3: TTL with Tiered Storage

Instead of deleting old data, move it to cheaper storage (S3) after a threshold:

```sql
-- Move data to S3 disk after 30 days, delete after 180 days
ALTER TABLE events MODIFY TTL
  event_time + INTERVAL 30 DAY TO DISK 's3_disk',
  event_time + INTERVAL 180 DAY DELETE;
```

## Scheduling with Cron

```bash
# /etc/cron.d/clickhouse-cleanup
# Run partition cleanup daily at 2am
0 2 * * * clickhouse /opt/scripts/partition_cleanup.py >> /var/log/ch_cleanup.log 2>&1
```

## Monitoring Partition Sizes

```sql
-- Check partition sizes to identify what cleanup would reclaim
SELECT
  partition,
  count() AS parts,
  formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE database = 'analytics'
  AND table = 'events'
  AND active = 1
GROUP BY partition
ORDER BY partition;
```

## Safety: Dry Run Before Dropping

Always run with a dry-run flag before executing drops:

```python
def cleanup_old_partitions(client, database, table, retention_months, dry_run=True):
    # ... find partitions ...
    for partition in old_partitions:
        if dry_run:
            print(f"[DRY RUN] Would drop: {partition}")
        else:
            client.command(f"ALTER TABLE {database}.{table} DROP PARTITION ID '{partition}'")
```

## Summary

Automate ClickHouse partition cleanup using built-in TTL rules for simplicity, or a scheduled Python script for custom retention logic. TTL is preferred because it runs automatically without external orchestration. For cold storage rather than deletion, use TTL with tiered storage to move old partitions to S3. Always dry-run partition drop scripts before executing them in production.
