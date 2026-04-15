# How to Configure ClickHouse User Profiles and Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Security, Configuration, Access Control

Description: Learn how to define ClickHouse user profiles and quotas to control query resource limits, enforce access policies, and prevent individual users from overloading the server.

---

ClickHouse provides two complementary mechanisms for controlling what users can do and how many resources they can consume: **profiles** and **quotas**. Profiles set query-level configuration values (memory limits, result sizes, read-only mode). Quotas limit cumulative resource consumption over a time interval (total rows read, total query time, number of queries).

## Profiles

A profile is a named collection of settings that apply to all queries run by a user assigned to that profile. Profiles are defined in `/etc/clickhouse-server/users.xml` or a file in `/etc/clickhouse-server/users.d/`.

### Defining Profiles

```xml
<clickhouse>
    <profiles>

        <!-- Default profile applied to the default user -->
        <default>
            <max_memory_usage>10737418240</max_memory_usage>
            <use_uncompressed_cache>1</use_uncompressed_cache>
            <load_balancing>random</load_balancing>
            <max_result_rows>1000000</max_result_rows>
            <max_result_bytes>1073741824</max_result_bytes>
        </default>

        <!-- Read-only profile for dashboards and BI tools -->
        <readonly>
            <readonly>1</readonly>
            <max_memory_usage>4294967296</max_memory_usage>
            <max_result_rows>100000</max_result_rows>
            <max_execution_time>30</max_execution_time>
        </readonly>

        <!-- Power user profile for data engineers -->
        <engineer>
            <max_memory_usage>42949672960</max_memory_usage>
            <max_bytes_before_external_group_by>10737418240</max_bytes_before_external_group_by>
            <max_bytes_before_external_sort>10737418240</max_bytes_before_external_sort>
            <max_execution_time>600</max_execution_time>
            <max_result_rows>10000000</max_result_rows>
        </engineer>

        <!-- ETL profile for insert-heavy pipelines -->
        <etl>
            <max_memory_usage>21474836480</max_memory_usage>
            <max_insert_block_size>1048576</max_insert_block_size>
            <max_execution_time>3600</max_execution_time>
            <!-- Allow DDL -->
            <readonly>0</readonly>
        </etl>

    </profiles>
</clickhouse>
```

### Key Profile Settings

| Setting | Purpose |
|---|---|
| `readonly` | 0 = full access, 1 = read-only (no writes, DDL, or settings changes), 2 = read-only but allows changing settings |
| `max_memory_usage` | Max RAM per query in bytes |
| `max_execution_time` | Max query duration in seconds |
| `max_result_rows` | Truncate or fail if SELECT returns more rows |
| `max_result_bytes` | Truncate or fail if result exceeds this size |
| `load_balancing` | How to pick replicas: `random`, `nearest_hostname`, `in_order` |
| `use_uncompressed_cache` | Enable/disable the uncompressed cache for this profile |

### Inheriting from Another Profile

ClickHouse supports built-in profile inheritance using the `<inherit>` tag. A profile can inherit all settings from another profile and then override specific values:

```xml
<profiles>
    <base>
        <max_memory_usage>10737418240</max_memory_usage>
        <max_execution_time>60</max_execution_time>
    </base>

    <engineer>
        <inherit>base</inherit>
        <!-- Override only what differs -->
        <max_execution_time>600</max_execution_time>
    </engineer>
</profiles>
```

## Quotas

Quotas track cumulative resource usage over a rolling or fixed time window and reject queries once a limit is exceeded.

### Defining Quotas

```xml
<clickhouse>
    <quotas>

        <!-- Default quota: no restrictions -->
        <default>
            <interval>
                <duration>3600</duration>  <!-- 1 hour window -->
                <queries>0</queries>        <!-- 0 = unlimited -->
                <errors>0</errors>
                <result_rows>0</result_rows>
                <read_rows>0</read_rows>
                <execution_time>0</execution_time>
            </interval>
        </default>

        <!-- Dashboard quota: light users with hourly caps -->
        <dashboard_quota>
            <interval>
                <duration>3600</duration>   <!-- Per hour -->
                <queries>500</queries>
                <errors>50</errors>
                <result_rows>10000000</result_rows>   <!-- 10 million rows per hour -->
                <read_rows>50000000000</read_rows>    <!-- 50 billion rows scanned per hour -->
                <execution_time>300</execution_time>  <!-- 300 seconds total execution per hour -->
            </interval>
        </dashboard_quota>

        <!-- Engineer quota: per-day limits -->
        <engineer_quota>
            <interval>
                <duration>86400</duration>    <!-- Per day -->
                <queries>0</queries>           <!-- Unlimited queries -->
                <errors>0</errors>
                <result_rows>0</result_rows>
                <read_rows>1000000000000</read_rows>  <!-- 1 trillion rows per day -->
                <execution_time>7200</execution_time> <!-- 2 hours total CPU time per day -->
            </interval>
        </engineer_quota>

        <!-- API quota with both hourly and daily windows -->
        <api_quota>
            <interval>
                <duration>3600</duration>
                <queries>1000</queries>
                <errors>100</errors>
                <result_rows>50000000</result_rows>
                <read_rows>100000000000</read_rows>
                <execution_time>600</execution_time>
            </interval>
            <interval>
                <duration>86400</duration>
                <queries>10000</queries>
                <errors>500</errors>
                <result_rows>500000000</result_rows>
                <read_rows>1000000000000</read_rows>
                <execution_time>3600</execution_time>
            </interval>
        </api_quota>

    </quotas>
</clickhouse>
```

## Defining Users and Assigning Profiles and Quotas

```xml
<clickhouse>
    <users>

        <default>
            <password></password>
            <networks>
                <ip>::1</ip>
                <ip>127.0.0.1</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
        </default>

        <dashboard_user>
            <password_sha256_hex>a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3</password_sha256_hex>
            <networks>
                <ip>10.0.0.0/8</ip>
            </networks>
            <profile>readonly</profile>
            <quota>dashboard_quota</quota>
            <!-- Restrict to specific databases -->
            <allow_databases>
                <database>analytics</database>
                <database>reporting</database>
            </allow_databases>
        </dashboard_user>

        <data_engineer>
            <password_sha256_hex>b3a8e0e1f9ab1bfe3a36f231f676f78bb28a2d0bf4c8fa9a3e6d5c7b2a1908d7</password_sha256_hex>
            <networks>
                <ip>10.0.1.0/24</ip>
            </networks>
            <profile>engineer</profile>
            <quota>engineer_quota</quota>
        </data_engineer>

        <etl_pipeline>
            <password_sha256_hex>c7a3b2d9e8f1a4e5d6c7b8a9f0e1d2c3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8</password_sha256_hex>
            <networks>
                <ip>10.0.2.100</ip>
                <ip>10.0.2.101</ip>
            </networks>
            <profile>etl</profile>
            <quota>default</quota>
        </etl_pipeline>

    </users>
</clickhouse>
```

## Generating Password Hashes

```bash
# Generate SHA-256 hash for a password
echo -n "my_secure_password" | sha256sum | awk '{print $1}'
```

Or use ClickHouse itself:

```sql
SELECT lower(hex(SHA256('my_secure_password')));
```

## Using SQL-Driven Access Control (ClickHouse 20.4+)

Modern ClickHouse supports managing users, roles, and quotas via SQL instead of config files:

```sql
-- Create a settings profile
CREATE SETTINGS PROFILE IF NOT EXISTS readonly_profile
SETTINGS
    readonly = 1,
    max_memory_usage = 4294967296,
    max_execution_time = 30;

-- Create a quota
CREATE QUOTA IF NOT EXISTS dashboard_quota
FOR INTERVAL 1 HOUR MAX queries = 500, read_rows = 50000000000
TO dashboard_role;

-- Create a role and assign the settings profile
CREATE ROLE IF NOT EXISTS dashboard_role;
ALTER ROLE dashboard_role SETTINGS PROFILE readonly_profile;

-- Create a user and assign the role
CREATE USER IF NOT EXISTS grafana_user
IDENTIFIED WITH sha256_password BY 'grafana_pass'
DEFAULT ROLE dashboard_role;

-- Grant SELECT on specific tables
GRANT SELECT ON analytics.* TO grafana_user;
```

## Monitoring Quota Usage

```sql
-- Current quota consumption
SELECT
    quota_name,
    quota_key,
    start_time,
    end_time,
    duration,
    queries,
    max_queries,
    read_rows,
    max_read_rows,
    execution_time,
    max_execution_time
FROM system.quota_usage;
```

```sql
-- All defined quotas
SELECT *
FROM system.quotas;

-- All quota limits
SELECT *
FROM system.quota_limits;
```

## Conclusion

Profiles and quotas work together to give you complete control over ClickHouse resource consumption. Use profiles to set per-query guardrails (memory, execution time, result size, read-only mode) and quotas to enforce cumulative hourly or daily budgets per user or role. Prefer SQL-driven access control in ClickHouse 20.4+ for a more maintainable setup, and monitor quota usage via `system.quota_usage` to adjust limits as your workload grows.
