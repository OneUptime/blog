# How to Configure Workload Scheduling in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Workload Scheduling, Resource Management, Priority Queue, Concurrency, Performance

Description: Learn how to configure workload scheduling in ClickHouse to prioritize interactive queries over batch jobs and fairly allocate resources between user groups.

---

Workload scheduling in ClickHouse (IO scheduling introduced in v23.9, with SQL-based workload management added in v24.11) lets you define named workloads with resource budgets and priorities, ensuring interactive queries stay fast even when batch jobs are running. This post walks through setting up a practical scheduling hierarchy.

## What Is Workload Scheduling

Workload scheduling organizes queries into named workloads arranged in a hierarchy. Each workload can have:
- A CPU/IO bandwidth budget
- A concurrency limit
- A priority relative to sibling workloads

Queries inherit the resource budget of their assigned workload.

## Creating a Workload Hierarchy

```sql
-- Root workload (the shared resource pool)
CREATE WORKLOAD all SETTINGS max_speed = 1073741824;  -- 1 GB/s

-- Interactive queries: high priority
CREATE WORKLOAD interactive IN all SETTINGS
    priority = 0,
    weight = 80;

-- Batch jobs: lower priority
CREATE WORKLOAD batch IN all SETTINGS
    priority = 10,
    weight = 20;
```

A lower `priority` value means higher priority. `weight` distributes bandwidth proportionally when the server is under load.

## Assigning Queries to Workloads

At query time, set the `workload` session setting:

```sql
-- This query gets interactive priority
SET workload = 'interactive';
SELECT count() FROM events WHERE timestamp >= today();

-- This query gets batch priority
SET workload = 'batch';
SELECT count() FROM events;
```

## Assigning Default Workloads to Users

Use settings profiles to automatically assign users to workloads:

```sql
CREATE SETTINGS PROFILE analysts_profile
SETTINGS workload = 'interactive';

CREATE SETTINGS PROFILE etl_profile
SETTINGS workload = 'batch';

ALTER USER analyst_user SETTINGS PROFILE 'analysts_profile';
ALTER USER etl_pipeline SETTINGS PROFILE 'etl_profile';
```

## Adding Concurrency Limits to Workloads

```sql
CREATE WORKLOAD interactive IN all SETTINGS
    priority = 0,
    weight = 80,
    max_concurrent_queries = 30;

CREATE WORKLOAD batch IN all SETTINGS
    priority = 10,
    weight = 20,
    max_concurrent_queries = 5;
```

## Viewing Workload Configuration

```sql
SELECT
    name,
    parent,
    create_query
FROM system.workloads
ORDER BY name;
```

## Monitoring Workload Resource Usage

```sql
SELECT
    ProfileEvents['NetworkReceiveBytes'] AS net_in,
    ProfileEvents['NetworkSendBytes'] AS net_out,
    Settings['workload'] AS workload,
    count() AS queries
FROM system.query_log
WHERE event_time >= now() - INTERVAL 1 HOUR
  AND type = 'QueryFinish'
GROUP BY workload
ORDER BY queries DESC;
```

## Practical Scheduling Strategy

For a typical analytics platform:

```sql
CREATE WORKLOAD all SETTINGS max_speed = 2147483648;  -- 2 GB/s

-- Dashboard users need sub-second response
CREATE WORKLOAD dashboard IN all SETTINGS priority = 0, weight = 70, max_concurrent_queries = 50;

-- API queries need fast but less critical response
CREATE WORKLOAD api IN all SETTINGS priority = 1, weight = 20, max_concurrent_queries = 100;

-- Nightly ETL can run at lower priority
CREATE WORKLOAD etl IN all SETTINGS priority = 5, weight = 10, max_concurrent_queries = 10;
```

## Summary

ClickHouse workload scheduling creates named resource pools organized in a hierarchy with priority and weight-based bandwidth distribution. Assign users to workloads via settings profiles so their queries automatically receive appropriate resource allocations. Use `system.workloads` to inspect configurations and `system.query_log` to analyze per-workload resource consumption.
