# How to Set Up ClickHouse Alerts for Disk Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alert, Disk Space, Monitoring, Operation

Description: Set up disk space alerts in ClickHouse using system tables and external monitoring tools to prevent disk-full conditions that cause data loss or write failures.

---

A full disk is one of the most dangerous conditions for a ClickHouse cluster. When the disk fills up, inserts fail, merges stall, and replicas fall behind. Setting up early-warning alerts gives your team time to act before the situation becomes critical.

## Querying Disk Usage for Alerting

The foundation of disk space alerting is the `system.disks` table:

```sql
SELECT
    name AS disk_name,
    path,
    formatReadableSize(total_space) AS total,
    formatReadableSize(free_space) AS free,
    round((1 - free_space / total_space) * 100, 2) AS used_pct,
    free_space < 10737418240 AS is_critical  -- less than 10 GB
FROM system.disks
ORDER BY used_pct DESC;
```

## Setting Up a Disk Space Snapshot Table

Create a dedicated alert table to record disk health snapshots:

```sql
CREATE TABLE disk_space_alerts (
    check_time DateTime DEFAULT now(),
    disk_name String,
    free_space UInt64,
    total_space UInt64,
    used_pct Float64,
    severity LowCardinality(String)
) ENGINE = MergeTree
ORDER BY (check_time, disk_name)
TTL check_time + INTERVAL 7 DAY;
```

Insert current state via a scheduled script:

```bash
clickhouse-client --query "
INSERT INTO disk_space_alerts (disk_name, free_space, total_space, used_pct, severity)
SELECT
    name,
    free_space,
    total_space,
    round((1 - free_space / total_space) * 100, 2) AS used_pct,
    multiIf(
        free_space < 5368709120, 'critical',
        free_space < 21474836480, 'warning',
        'ok'
    ) AS severity
FROM system.disks
WHERE free_space < 21474836480
"
```

Schedule this with cron every 5 minutes.

## Prometheus Integration

If you expose ClickHouse metrics via the Prometheus endpoint, disk metrics are available at:

```text
ClickHouseAsyncMetrics_DiskAvailable_<disk_name>
ClickHouseAsyncMetrics_DiskTotal_<disk_name>
```

Create a Prometheus alerting rule:

```yaml
groups:
  - name: clickhouse_disk
    rules:
      - alert: ClickHouseDiskSpaceWarning
        expr: |
          (ClickHouseAsyncMetrics_DiskTotal_default - ClickHouseAsyncMetrics_DiskAvailable_default)
          / ClickHouseAsyncMetrics_DiskTotal_default > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse disk usage above 80% on {{ $labels.instance }}"

      - alert: ClickHouseDiskSpaceCritical
        expr: ClickHouseAsyncMetrics_DiskAvailable_default < 10737418240
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse disk critically low on {{ $labels.instance }}"
```

## Grafana Alert Setup

In Grafana, create an alert on the disk usage panel:

```text
Query A: SELECT used_pct FROM disk_space_alerts WHERE disk_name = 'default' ORDER BY check_time DESC LIMIT 1

Alert conditions:
  Warning:  A > 80
  Critical: A > 90

Notification channels: PagerDuty (critical), Slack (warning)
```

## Automated Response

When disk space drops below a critical threshold, an automated response script can:
1. Trigger a manual OPTIMIZE to merge parts and reduce part count overhead
2. Force TTL deletion to expire old data early

```bash
# Force TTL cleanup
clickhouse-client --query "ALTER TABLE mydb.events MATERIALIZE TTL"

# Check if space was recovered
clickhouse-client --query "SELECT formatReadableSize(free_space) FROM system.disks WHERE name='default'"
```

## Summary

Disk space alerts are non-negotiable for production ClickHouse clusters. Set up multi-tier alerts at 70%, 80%, and 90% usage with appropriate severity levels. Combine Prometheus metrics for real-time alerting with a snapshot table for historical tracking, and have automated runbooks ready to trigger TTL cleanup or insert pausing when critical thresholds are breached.
