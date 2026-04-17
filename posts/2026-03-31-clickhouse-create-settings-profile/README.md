# How to Create a Settings Profile in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Security, Settings Profile, Configuration

Description: Learn how to use CREATE SETTINGS PROFILE in ClickHouse to bundle query settings with constraints, inheriting profiles and assigning them to users.

---

Settings profiles in ClickHouse group query-level settings and apply them consistently to users and roles. They enable administrators to enforce memory limits, timeout caps, and other constraints, preventing runaway queries or misconfigured client sessions.

## CREATE SETTINGS PROFILE Syntax

```sql
CREATE SETTINGS PROFILE [IF NOT EXISTS | OR REPLACE] name
    [SETTINGS variable [= value]
        [MIN [=] min_value]
        [MAX [=] max_value]
        [CONST | READONLY | WRITABLE | CHANGEABLE_IN_READONLY]
    | INHERIT 'profile_name' [,...]]
    [TO {role [,...] | ALL | ALL EXCEPT role [,...]}]
```

## Basic Profile Creation

```sql
-- Simple profile limiting memory per query
CREATE SETTINGS PROFILE limited_memory
    SETTINGS max_memory_usage = 1000000000;  -- 1 GB

-- Profile with a query timeout
CREATE SETTINGS PROFILE short_timeout
    SETTINGS max_execution_time = 30;  -- 30 seconds
```

## Setting Constraints: MIN, MAX, READONLY, CONST

Constraints restrict how users may override a setting:

```sql
CREATE SETTINGS PROFILE analyst_profile
    SETTINGS
        -- User can set between 512 MB and 4 GB; defaults to 2 GB
        max_memory_usage = 2000000000
            MIN 536870912
            MAX 4294967296,

        -- User cannot change this value
        max_execution_time = 60 READONLY,

        -- Value is fixed; even admins cannot override it in queries
        readonly = 0 CONST;
```

The constraint keywords:

| Keyword | Behaviour |
|---|---|
| `MIN` | Sets the minimum value the user can choose |
| `MAX` | Sets the maximum value the user can choose |
| `READONLY` | User can read but not change the setting |
| `CONST` | Value is fixed and cannot be overridden |
| `WRITABLE` | Explicitly marks the setting as changeable (default) |
| `CHANGEABLE_IN_READONLY` | Allows changing in read-only mode |

## Inheriting Profiles

A profile can inherit all settings from one or more parent profiles and then add or override settings:

```sql
-- Base profile
CREATE SETTINGS PROFILE base_profile
    SETTINGS
        max_threads = 4,
        max_execution_time = 120;

-- Inherits base_profile and tightens memory
CREATE SETTINGS PROFILE restricted_profile
    SETTINGS
        INHERIT 'base_profile',
        max_memory_usage = 500000000 MAX 1000000000;

-- Inherits base_profile and loosens execution time
CREATE SETTINGS PROFILE power_profile
    SETTINGS
        INHERIT 'base_profile',
        max_execution_time = 600,
        max_threads = 16;
```

## ASSIGN TO Users and Roles

```sql
-- Assign to a specific role
CREATE SETTINGS PROFILE analyst_profile
    SETTINGS
        max_memory_usage = 2000000000 MAX 8000000000,
        max_execution_time = 120 MAX 600
    TO analyst_role;

-- Assign to all users except admins
CREATE SETTINGS PROFILE default_profile
    SETTINGS
        max_memory_usage = 1000000000,
        max_execution_time = 60
    TO ALL EXCEPT admin_role;
```

## Assigning Profiles to Users

Profiles can also be assigned when creating or altering users:

```sql
-- Assign profile when creating a user
CREATE USER alice SETTINGS PROFILE 'analyst_profile';

-- Change a user's profile
ALTER USER alice SETTINGS PROFILE 'power_profile';
```

## Complete Practical Example

```sql
-- Tier 1: read-only dashboard users
CREATE SETTINGS PROFILE dashboard_profile
    SETTINGS
        readonly = 1 CONST,
        max_memory_usage = 500000000 MAX 2000000000,
        max_execution_time = 30 MAX 60,
        max_threads = 2 MAX 4
    TO dashboard_role;

-- Tier 2: data analysts
CREATE SETTINGS PROFILE analyst_profile
    SETTINGS
        max_memory_usage = 4000000000 MAX 8000000000,
        max_execution_time = 300 MAX 900,
        max_threads = 8 MAX 16,
        use_query_cache = 1
    TO analyst_role;

-- Tier 3: ETL service accounts
CREATE SETTINGS PROFILE etl_profile
    SETTINGS
        max_memory_usage = 16000000000,
        max_execution_time = 3600 READONLY,
        max_insert_block_size = 1048576
    TO etl_role;
```

## Viewing and Managing Profiles

```sql
-- List all profiles
SHOW SETTINGS PROFILES;

-- Show definition of a profile
SHOW CREATE SETTINGS PROFILE analyst_profile;

-- Query the system table
SELECT name, storage
FROM system.settings_profiles;

-- See which settings are in a profile
SELECT
    setting_name,
    value,
    min,
    max,
    writability
FROM system.settings_profile_elements
WHERE profile_name = 'analyst_profile';

-- Alter a profile
ALTER SETTINGS PROFILE analyst_profile
    SETTINGS max_memory_usage = 6000000000 MAX 12000000000;

-- Drop a profile
DROP SETTINGS PROFILE IF EXISTS dashboard_profile;
```

## Summary

Settings profiles in ClickHouse bundle query settings with optional MIN/MAX/READONLY/CONST constraints. Profiles can inherit from parent profiles for layered configuration, and are assigned to users or roles via the `TO` clause or directly on the user definition. This provides predictable, enforceable query behaviour across all user classes.
