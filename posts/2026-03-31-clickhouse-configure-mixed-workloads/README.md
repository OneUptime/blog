# How to Configure ClickHouse for Mixed Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mixed Workload, Resource Group, Priority, Configuration, Concurrency

Description: Configure ClickHouse resource groups, priority queues, and user profiles to isolate interactive and batch workloads running on the same cluster.

---

## The Mixed Workload Problem

Running interactive dashboards and heavy batch ETL on the same ClickHouse cluster means they compete for CPU, memory, and disk IO. Without isolation, a single batch query can saturate all CPU threads and make dashboards unresponsive for minutes.

## Workload Isolation with Settings Profiles

Create separate profiles for each workload type:

```sql
CREATE SETTINGS PROFILE interactive_profile
SETTINGS
    max_threads = 8,
    max_memory_usage = 4000000000,
    max_execution_time = 15,
    priority = 1;

CREATE SETTINGS PROFILE batch_profile
SETTINGS
    max_threads = 32,
    max_memory_usage = 30000000000,
    max_execution_time = 3600,
    priority = 10;
```

Lower priority numbers get higher scheduling priority in ClickHouse.

## Assigning Profiles to Users

```sql
ALTER USER dashboard_user SETTINGS PROFILE 'interactive_profile';
ALTER USER etl_user       SETTINGS PROFILE 'batch_profile';
```

## Resource Groups (ClickHouse 24+)

ClickHouse 24.x introduced workload resource groups via the scheduler:

```sql
CREATE WORKLOAD interactive_workload IN all
SETTINGS
    weight = 8,
    max_bytes_per_second = 500000000,
    max_burst_bytes = 1000000000;

CREATE WORKLOAD batch_workload IN all
SETTINGS
    weight = 1;
```

Assign users to workloads:

```sql
ALTER USER dashboard_user SETTINGS workload = 'interactive_workload';
ALTER USER etl_user       SETTINGS workload = 'batch_workload';
```

## Separating Reads from Writes

For maximum isolation, use dedicated ClickHouse replicas:

```text
Cluster topology:
  replica-1: receives all inserts
  replica-2: serves interactive queries
  replica-3: serves batch queries
```

Configure your application to route connections to the correct replica based on workload type.

## Query Queue Depth Limits

Prevent queue buildup from batch jobs blocking interactive queries:

```xml
<!-- users.xml -->
<max_concurrent_queries_for_user>10</max_concurrent_queries_for_user>
```

Per-user concurrent query caps ensure batch users don't monopolize the server queue.

## Monitoring Workload Balance

Track resource consumption by user and profile:

```sql
SELECT
    user,
    sum(ProfileEvents['OSCPUVirtualTimeMicroseconds']) / 1e6 AS cpu_seconds,
    sum(memory_usage) AS total_memory,
    count() AS query_count
FROM system.query_log
WHERE event_date = today() AND type = 'QueryFinish'
GROUP BY user
ORDER BY cpu_seconds DESC;
```

## Summary

Configure ClickHouse for mixed workloads by creating separate settings profiles with thread and memory limits, using resource groups for weight-based scheduling, assigning dedicated replicas per workload type, and monitoring per-user resource consumption. The combination of profile isolation and replica routing gives predictable latency for interactive users even during heavy batch runs.
