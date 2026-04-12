# How to Plan MySQL Capacity for Growth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Capacity Planning, Performance, Monitoring, Scaling

Description: Learn how to plan MySQL capacity for growth by analyzing current resource usage trends, projecting future requirements, and identifying scaling thresholds.

---

## Why Capacity Planning Matters

Reactive MySQL scaling - upgrading hardware or adding shards only after performance degrades - causes downtime and outages. Proactive capacity planning uses current usage metrics to project when you will hit resource limits, giving you time to scale before problems occur.

The four primary resources to plan for are CPU, memory (buffer pool), disk storage, and I/O (IOPS).

## Measuring Current Resource Usage

Start by collecting baseline metrics across all four dimensions.

**CPU usage:**

```bash
# Average CPU usage over the past hour from MySQL metrics
mysqladmin -u root -p extended-status | grep -i "threads_running\|Questions"
```

```sql
-- Queries per second
SHOW GLOBAL STATUS LIKE 'Questions';
```

Run this query 60 seconds apart and calculate `(value2 - value1) / 60` for QPS.

**Buffer pool hit rate:**

```sql
SELECT
  VARIABLE_VALUE AS reads
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Innodb_buffer_pool_reads';

SELECT
  VARIABLE_VALUE AS read_requests
FROM performance_schema.global_status
WHERE VARIABLE_NAME = 'Innodb_buffer_pool_read_requests';
```

Hit rate = `(read_requests - reads) / read_requests`. If below 99%, the buffer pool is undersized relative to the working set.

**Disk growth rate:**

```sql
SELECT
  table_schema AS db,
  ROUND(SUM(data_length + index_length) / 1073741824, 2) AS size_gb
FROM information_schema.TABLES
GROUP BY table_schema
ORDER BY size_gb DESC;
```

Run this weekly and chart the growth to project when disk will fill.

**I/O utilization:**

```bash
iostat -xm 5 3
```

Look at `%util` for the MySQL data disk. Sustained utilization above 70% is a warning sign.

## Projecting Growth

Use linear or exponential growth models based on business metrics:

```python
# Historical monthly data sizes in GB
monthly_sizes = [120, 135, 152, 171, 193]

# Calculate average monthly growth rate
growth_rates = [
    (monthly_sizes[i] - monthly_sizes[i-1]) / monthly_sizes[i-1]
    for i in range(1, len(monthly_sizes))
]
avg_growth_rate = sum(growth_rates) / len(growth_rates)

current_size = monthly_sizes[-1]
disk_capacity = 1000  # GB

months_until_full = 0
projected_size = current_size
while projected_size < disk_capacity * 0.85:  # 85% threshold
    projected_size *= (1 + avg_growth_rate)
    months_until_full += 1

print(f"Estimated months until disk is 85% full: {months_until_full}")
```

## Identifying Connection and Thread Limits

Monitor maximum connection usage to plan when to scale pooling or add replicas:

```sql
SHOW GLOBAL STATUS LIKE 'Max_used_connections';
SHOW GLOBAL VARIABLES LIKE 'max_connections';
```

If `Max_used_connections` is consistently above 70% of `max_connections`, plan to add a connection proxy or increase the limit.

## Setting Up Capacity Alerts

Create alerts at 70% thresholds using your monitoring stack. Example Prometheus alert:

```yaml
groups:
  - name: mysql_capacity
    rules:
      - alert: MySQLDiskUsageHigh
        expr: >
          1 - (node_filesystem_avail_bytes{mountpoint="/var/lib/mysql"} /
           node_filesystem_size_bytes{mountpoint="/var/lib/mysql"}) > 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: MySQL disk usage above 70%
```

## Capacity Planning Cadence

Review MySQL capacity metrics monthly:
- Current and projected disk usage
- Buffer pool hit rate trend
- Peak QPS trend vs. server CPU capacity
- Replication lag trend (indicates write load on primary)

Schedule scaling actions (add replica, increase storage, upgrade instance) at least one month before hitting 80% of any resource limit.

## Summary

MySQL capacity planning requires tracking four resources - CPU, memory, disk, and I/O - and projecting growth using historical trends. Use `information_schema.TABLES` for storage trends, Performance Schema for buffer pool and query metrics, and `iostat` for I/O utilization. Set alerts at 70% thresholds and plan scaling actions at least one month before projected limits are reached.
