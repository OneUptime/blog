# How to Implement Fair Scheduling in Multi-Tenant ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fair Scheduling, Multi-Tenant, Workload Scheduling, Resource Management, Performance

Description: Learn how to implement fair resource scheduling across multiple tenants in ClickHouse using workloads, weights, and settings profiles.

---

In a multi-tenant ClickHouse deployment, fair scheduling ensures that no single tenant can monopolize server resources while others starve. ClickHouse's workload scheduling feature provides weighted fair queuing that distributes IO bandwidth proportionally between tenants.

## The Multi-Tenant Challenge

Without fair scheduling, a tenant running a heavy batch query can:
- Consume all available IO bandwidth
- Increase query latency for other tenants from milliseconds to minutes
- Trigger out-of-memory errors for other concurrent queries

## Setting Up a Workload Hierarchy

```sql
-- Root workload with total IO budget
CREATE WORKLOAD all SETTINGS max_bytes_per_second = 2147483648;  -- 2 GB/s

-- Tenant A: larger contract, gets more bandwidth (60%)
CREATE WORKLOAD tenant_a PARENT all SETTINGS
    weight = 60,
    max_concurrent_queries = 50;

-- Tenant B: smaller contract (30%)
CREATE WORKLOAD tenant_b PARENT all SETTINGS
    weight = 30,
    max_concurrent_queries = 30;

-- Internal analytics (10%)
CREATE WORKLOAD internal PARENT all SETTINGS
    weight = 10,
    max_concurrent_queries = 20;
```

With weighted fair queuing, when all tenants are active, Tenant A gets 60% of bandwidth, Tenant B 30%, and internal 10%. Unused bandwidth from idle tenants is redistributed to active ones.

## Per-Tenant Settings Profiles

```sql
CREATE SETTINGS PROFILE tenant_a_profile
SETTINGS
    workload = 'tenant_a',
    max_execution_time = 60,
    max_memory_usage = 20000000000;

CREATE SETTINGS PROFILE tenant_b_profile
SETTINGS
    workload = 'tenant_b',
    max_execution_time = 30,
    max_memory_usage = 10000000000;
```

## Assigning Tenants to Workloads

```sql
CREATE USER tenant_a_user IDENTIFIED BY 'password'
SETTINGS PROFILE 'tenant_a_profile';

CREATE USER tenant_b_user IDENTIFIED BY 'password'
SETTINGS PROFILE 'tenant_b_profile';
```

## Adding Sub-Workloads for Interactive vs Batch

Give each tenant priority tiers within their own workload:

```sql
CREATE WORKLOAD tenant_a_interactive PARENT tenant_a SETTINGS
    priority = 0,
    weight = 80;

CREATE WORKLOAD tenant_a_batch PARENT tenant_a SETTINGS
    priority = 5,
    weight = 20;
```

```sql
CREATE SETTINGS PROFILE tenant_a_dashboard SETTINGS workload = 'tenant_a_interactive';
CREATE SETTINGS PROFILE tenant_a_etl SETTINGS workload = 'tenant_a_batch';
```

## Monitoring Per-Tenant Resource Usage

```sql
SELECT
    Settings['workload'] AS workload,
    count() AS queries,
    sum(query_duration_ms) AS total_duration_ms,
    sum(read_bytes) AS total_read_bytes,
    sum(memory_usage) AS total_memory
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND type = 'QueryFinish'
GROUP BY workload
ORDER BY total_read_bytes DESC;
```

## Detecting Fairness Violations

Alert when one tenant consistently gets less than their fair share:

```sql
WITH expected AS (
    SELECT
        'tenant_a' AS workload, 60 AS weight UNION ALL
    SELECT 'tenant_b', 30 UNION ALL
    SELECT 'internal', 10
)
SELECT
    q.workload,
    sum(q.read_bytes) AS actual_bytes,
    sum(q.read_bytes) * 100.0 / sum(sum(q.read_bytes)) OVER () AS actual_pct,
    e.weight AS target_pct
FROM system.query_log q
JOIN expected e ON q.Settings['workload'] = e.workload
WHERE q.event_time >= now() - INTERVAL 1 HOUR
  AND q.type = 'QueryFinish'
GROUP BY q.workload, e.weight;
```

## Summary

Fair scheduling in multi-tenant ClickHouse is implemented through the workload scheduling system. Create per-tenant workloads with proportional weights under a shared root workload, assign tenants via settings profiles, and add sub-workloads for interactive-vs-batch tiering within each tenant. Monitor per-workload IO consumption via `system.query_log` to detect imbalances.
