# How to Use Settings Profiles for Resource Control in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Settings Profile, Resource Control, User Management, Access Control, Performance

Description: Learn how to create and apply settings profiles in ClickHouse to enforce per-query resource limits and default configurations for different user types.

---

Settings profiles in ClickHouse let you define named collections of query settings and assign them to users or roles. They are the primary tool for enforcing per-query resource limits - maximum memory, execution time, result size - without requiring users to set these values manually.

## Creating a Settings Profile

```sql
CREATE SETTINGS PROFILE analyst_profile
SETTINGS
    max_execution_time = 30,
    max_memory_usage = 10000000000,       -- 10 GB
    max_result_rows = 1000000,
    max_bytes_before_external_group_by = 5000000000,
    priority = 0;
```

## Common Resource-Control Settings

| Setting | Description |
|---------|-------------|
| `max_execution_time` | Max query wall-clock time (seconds) |
| `max_memory_usage` | Max memory per query (bytes) |
| `max_threads` | Max CPU threads per query |
| `max_result_rows` | Max rows in SELECT result |
| `max_rows_to_read` | Max rows scanned from storage |
| `max_bytes_to_read` | Max bytes read from storage |
| `priority` | Query scheduling priority (lower = higher priority) |

## Profiles for Different User Tiers

```sql
-- Light users: dashboards, short queries
CREATE SETTINGS PROFILE dashboard_profile
SETTINGS
    max_execution_time = 10,
    max_memory_usage = 2000000000,   -- 2 GB
    max_threads = 8,
    max_result_rows = 100000;

-- Power users: analysts running complex queries
CREATE SETTINGS PROFILE analyst_profile
SETTINGS
    max_execution_time = 120,
    max_memory_usage = 20000000000,  -- 20 GB
    max_threads = 32;

-- ETL pipelines: long-running but low priority
CREATE SETTINGS PROFILE etl_profile
SETTINGS
    max_execution_time = 7200,
    max_memory_usage = 50000000000,  -- 50 GB
    max_threads = 16,
    priority = 10,
    workload = 'batch';
```

## Assigning Profiles to Users

```sql
ALTER USER alice ADD PROFILES 'analyst_profile';
ALTER USER dashboard_service ADD PROFILES 'dashboard_profile';
ALTER USER etl_pipeline ADD PROFILES 'etl_profile';
```

## Assigning Profiles to Roles

Preferred approach for managing groups:

```sql
CREATE ROLE analysts;
CREATE ROLE dashboard_users;

ALTER ROLE analysts ADD PROFILES 'analyst_profile';
ALTER ROLE dashboard_users ADD PROFILES 'dashboard_profile';

GRANT analysts TO alice, bob;
GRANT dashboard_users TO grafana_service;
```

## Viewing Active Profiles

```sql
-- List all profiles
SELECT name, id FROM system.settings_profiles;

-- View settings in a profile
SELECT setting_name, value, writability
FROM system.settings_profile_elements
WHERE profile_name = 'analyst_profile';
```

## Profile Inheritance

Profiles can inherit from parent profiles:

```sql
CREATE SETTINGS PROFILE base_profile
SETTINGS max_execution_time = 60, max_memory_usage = 5000000000;

CREATE SETTINGS PROFILE senior_analyst_profile
SETTINGS INHERIT 'base_profile', max_memory_usage = 30000000000;  -- Override just this setting
```

## Readonly Setting to Prevent Overrides

Prevent users from overriding specific limits:

```sql
CREATE SETTINGS PROFILE locked_dashboard_profile
SETTINGS
    max_execution_time = 10 READONLY,
    max_memory_usage = 2000000000 READONLY;
```

Users assigned this profile cannot override `max_execution_time` or `max_memory_usage` in their queries.

## Summary

Settings profiles are the recommended way to enforce resource limits in ClickHouse. Create profiles for each user tier with appropriate `max_execution_time`, `max_memory_usage`, and `max_threads` values. Assign profiles to roles for group management and use `READONLY` to prevent users from bypassing critical limits.
