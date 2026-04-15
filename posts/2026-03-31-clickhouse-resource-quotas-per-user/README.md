# How to Set Up Resource Quotas Per User in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Quota, Resource Management, Multi-Tenant, User Management, Access Control

Description: Learn how to set up resource quotas per user in ClickHouse to limit query execution time, result rows, data read, and network bandwidth.

---

Resource quotas in ClickHouse let you enforce limits on how much compute each user or user group can consume over a time window. This is essential for multi-tenant environments where one heavy user should not starve others.

## What Quotas Control

ClickHouse quotas can limit:
- Total queries per interval
- Total query execution time
- Rows read
- Bytes read
- Result rows returned
- Bytes written

## Creating a Basic Quota

```sql
CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR MAX
        queries = 100,
        query_selects = 100,
        errors = 10,
        result_rows = 100000000,
        read_rows = 10000000000,
        execution_time = 3600
    TO analyst_role;
```

This allows analysts to run up to 100 SELECT queries per hour, reading no more than 10 billion rows total, with a 1-hour cumulative execution time cap.

## Quotas with Multiple Intervals

```sql
CREATE QUOTA heavy_user_quota
    FOR INTERVAL 1 HOUR MAX
        queries = 200,
        execution_time = 1800
    FOR INTERVAL 1 DAY MAX
        queries = 2000,
        read_bytes = 107374182400  -- 100 GB
    TO heavy_users;
```

## Assigning Quotas to Roles and Users

Assign to a role (preferred for groups):

```sql
CREATE ROLE analyst_role;
GRANT analyst_role TO alice, bob;

CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR MAX queries = 100, execution_time = 3600
    TO analyst_role;
```

Assign directly to a user:

```sql
CREATE QUOTA admin_quota
    FOR INTERVAL 1 HOUR MAX queries = 1000
    TO admin_user;
```

## Viewing Active Quotas

```sql
-- All defined quotas
SELECT * FROM system.quotas;

-- Current usage for your session
SELECT * FROM system.quota_usage;

-- Usage for all users (admin only)
SELECT * FROM system.quotas_usage;
```

## Monitoring Quota Violations

```sql
SELECT
    quota_key,
    quota_name,
    duration,
    queries,
    max_queries,
    execution_time,
    max_execution_time
FROM system.quotas_usage
WHERE queries >= max_queries * 0.8  -- warn at 80% usage
ORDER BY quota_key;
```

## Dropping and Modifying Quotas

```sql
-- Modify existing quota
ALTER QUOTA analyst_quota
    FOR INTERVAL 1 HOUR MAX
        queries = 150,
        execution_time = 7200
    TO analyst_role;

-- Remove quota assignment
ALTER QUOTA analyst_quota TO NONE;

-- Delete quota
DROP QUOTA analyst_quota;
```

## Combining Quotas with Settings Profiles

Quotas handle volume limits; settings profiles handle per-query resource caps:

```sql
CREATE SETTINGS PROFILE analyst_settings
SETTINGS
    max_execution_time = 30,
    max_memory_usage = 10000000000,
    max_result_rows = 1000000;

ALTER USER alice ADD PROFILES 'analyst_settings';
```

Use both together: quotas for cumulative limits, settings profiles for per-query limits.

## Summary

ClickHouse quotas enforce cumulative resource limits (queries, execution time, bytes read) per user or role over configurable time intervals. Create quotas with `CREATE QUOTA`, assign them to roles for group management, and monitor usage via `system.quotas_usage`. Combine quotas with settings profiles for comprehensive per-user resource governance.
