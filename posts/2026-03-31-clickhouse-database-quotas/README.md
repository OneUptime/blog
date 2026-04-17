# How to Set Up Database-Level Quotas in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Quota, Database, Administration, Resource Management

Description: Learn how to create and apply ClickHouse quotas to limit query count, data read, and execution time per user or role over configurable time intervals.

---

ClickHouse quotas let you limit how many queries a user can run, how much data they can read, and how long queries can execute - all measured over a rolling time window. Quotas protect the cluster from runaway queries, prevent individual users from monopolizing resources, and enforce SLA boundaries between different user groups.

## How Quotas Work

A quota defines one or more time intervals (for example, 1 hour and 1 day) and a set of limits per interval. ClickHouse tracks consumption per user per interval. When a limit is reached, subsequent queries are rejected until the interval resets.

Quotas are assigned to users directly or through roles.

## Quota Limit Types

| Limit | Description |
|-------|-------------|
| `queries` | Maximum number of queries in the interval |
| `errors` | Maximum number of failed queries |
| `result_rows` | Maximum rows returned across all queries |
| `result_bytes` | Maximum bytes returned across all queries |
| `read_rows` | Maximum rows read from storage |
| `read_bytes` | Maximum bytes read from storage |
| `execution_time` | Maximum total query execution time in seconds |
| `failed_sequential_authentications` | Maximum consecutive authentication failures |

## Creating a Quota

```sql
-- Basic quota: 1000 queries and 100 GiB of data read per hour
CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 1000,
        MAX read_bytes = 107374182400;
```

## Creating a Multi-Interval Quota

Define different limits for different time windows within one quota:

```sql
CREATE QUOTA analyst_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 200,
        MAX read_bytes = 10737418240,  -- 10 GiB per hour
        MAX execution_time = 3600      -- 1 hour of total CPU per hour
    FOR INTERVAL 1 DAY
        MAX queries = 2000,
        MAX read_bytes = 107374182400, -- 100 GiB per day
        MAX execution_time = 28800     -- 8 hours of total CPU per day
    TO analyst;
```

## Assigning Quotas to Users

Assign a quota directly to a user:

```sql
CREATE QUOTA etl_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 50,
        MAX read_bytes = 53687091200  -- 50 GiB per hour
    TO etl_user;
```

Assign to a role so all role members share the same quota:

```sql
CREATE QUOTA shared_role_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 500,
        MAX read_bytes = 53687091200
    TO reporting_role;
```

When assigned to a role, the quota is shared across all users in that role. All their queries count toward the same pool.

## Creating a Keyed Quota (Per-User Tracking)

By default, when a quota is assigned to a role, all users in the role share the same quota counter. To track each user individually within the same quota, use `KEYED BY user_name`:

```sql
CREATE QUOTA per_user_quota KEYED BY user_name
    FOR INTERVAL 1 HOUR
        MAX queries = 100,
        MAX read_bytes = 10737418240
    TO analyst;
```

Now each user in the `analyst` role has their own independent 100-queries-per-hour limit.

Other keying options:

```sql
-- Track by client IP (useful for API gateways)
CREATE QUOTA per_ip_quota KEYED BY ip_address
    FOR INTERVAL 1 HOUR
        MAX queries = 200
    TO api_role;

-- Track by client key (for application-level separation)
CREATE QUOTA per_client_quota KEYED BY client_key
    FOR INTERVAL 1 HOUR
        MAX queries = 500
    TO app_role;
```

## Setting Execution Time Quotas

Limit total CPU time to prevent expensive analytical queries from blocking others:

```sql
CREATE QUOTA resource_constrained
    FOR INTERVAL 1 HOUR
        MAX execution_time = 600,    -- 10 minutes of query CPU per hour
        MAX queries = 50
    FOR INTERVAL 1 DAY
        MAX execution_time = 3600,   -- 1 hour of query CPU per day
        MAX queries = 200
    TO restricted_analyst;
```

## Monitoring Quota Usage

Check current quota consumption:

```sql
SELECT
    quota_name,
    quota_key,
    start_time,
    end_time,
    duration,
    queries,
    errors,
    result_rows,
    read_rows,
    formatReadableSize(read_bytes) AS data_read,
    execution_time
FROM system.quotas_usage
ORDER BY quota_name, quota_key;
```

List all defined quotas:

```sql
SELECT name, keys, durations
FROM system.quotas
ORDER BY name;
```

See quota limits in detail:

```sql
SELECT
    quota_name,
    duration,
    max_queries,
    max_read_bytes,
    max_execution_time
FROM system.quota_limits
ORDER BY quota_name, duration;
```

## Checking Who Hit Quota Limits

```sql
SELECT
    event_time,
    user,
    exception_code,
    exception
FROM system.query_log
WHERE exception_code = 201  -- QUOTA_EXCEEDED error code
  AND event_time >= today()
ORDER BY event_time DESC;
```

## Modifying an Existing Quota

```sql
-- Add a new interval to an existing quota
ALTER QUOTA analyst_quota
    FOR INTERVAL 1 WEEK
        MAX queries = 10000,
        MAX read_bytes = 1099511627776;  -- 1 TiB per week

-- Update limits on an existing interval
ALTER QUOTA analyst_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 300,
        MAX read_bytes = 21474836480;  -- 20 GiB per hour
```

## Removing a Quota

```sql
-- Reassign the quota so it no longer applies to anyone
ALTER QUOTA analyst_quota TO NONE;

-- Drop the quota entirely
DROP QUOTA IF EXISTS analyst_quota;
```

## Example: Full Role-Based Quota Setup

```sql
-- Create roles
CREATE ROLE analyst;
CREATE ROLE etl_writer;
CREATE ROLE admin;

-- Grant privileges
GRANT SELECT ON analytics.* TO analyst;
GRANT SELECT, INSERT ON analytics.* TO etl_writer;
GRANT ALL ON *.* TO admin;

-- Create quotas
CREATE QUOTA analyst_quota KEYED BY user_name
    FOR INTERVAL 1 HOUR
        MAX queries = 100,
        MAX read_bytes = 10737418240,
        MAX execution_time = 600
    FOR INTERVAL 1 DAY
        MAX queries = 1000,
        MAX read_bytes = 107374182400
    TO analyst;

CREATE QUOTA etl_quota
    FOR INTERVAL 1 HOUR
        MAX queries = 20,
        MAX read_bytes = 53687091200
    TO etl_writer;

-- Admin has no quota (unlimited)

-- Assign roles to users
GRANT analyst TO alice, bob;
GRANT etl_writer TO etl_pipeline;

-- Verify
SELECT quota_name, quota_key, queries, formatReadableSize(read_bytes)
FROM system.quotas_usage;
```

## Summary

ClickHouse quotas give you fine-grained control over resource consumption per user, role, or client IP over configurable time windows. Create quotas with `CREATE QUOTA`, define multi-interval limits with `MAX` clauses, and use `KEYED BY user_name` for per-user tracking within shared roles. Monitor consumption with `system.quota_usage` and detect quota-exceeded errors in `system.query_log`.
