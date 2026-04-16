# How to Configure ClickHouse users.xml File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, users.xml, Configuration, Access Control, Security

Description: Learn how to configure the ClickHouse users.xml file to define users, passwords, profiles, and quotas for access control and resource management.

---

## Overview

The `users.xml` file in ClickHouse (located at `/etc/clickhouse-server/users.xml`) defines users, their authentication, settings profiles, and quotas. It is the primary mechanism for access control when not using SQL-driven access control. You can also split this configuration into files under `users.d/`.

## File Structure

```xml
<?xml version="1.0"?>
<clickhouse>
    <profiles>
        <!-- Settings profiles -->
    </profiles>

    <users>
        <!-- User definitions -->
    </users>

    <quotas>
        <!-- Resource quotas -->
    </quotas>
</clickhouse>
```

## Defining a User with Password

```xml
<clickhouse>
    <users>
        <analyst>
            <!-- SHA256 hash of the password -->
            <password_sha256_hex>
                8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
            </password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>readonly</profile>
            <quota>default</quota>
        </analyst>
    </users>
</clickhouse>
```

Generate a SHA256 hash:

```bash
echo -n "mypassword" | sha256sum
```

## Creating Settings Profiles

```xml
<profiles>
    <default>
        <max_memory_usage>10000000000</max_memory_usage>
        <use_uncompressed_cache>0</use_uncompressed_cache>
        <load_balancing>random</load_balancing>
    </default>

    <readonly>
        <readonly>1</readonly>
        <max_execution_time>30</max_execution_time>
        <max_memory_usage>5000000000</max_memory_usage>
    </readonly>

    <analyst>
        <max_memory_usage>20000000000</max_memory_usage>
        <max_execution_time>300</max_execution_time>
        <max_threads>8</max_threads>
        <join_algorithm>hash</join_algorithm>
    </analyst>
</profiles>
```

## Defining Quotas

```xml
<quotas>
    <default>
        <interval>
            <duration>3600</duration>      <!-- 1 hour window -->
            <queries>1000</queries>        <!-- max queries per hour -->
            <errors>100</errors>
            <result_rows>1000000000</result_rows>
            <read_rows>10000000000</read_rows>
            <execution_time>3600</execution_time>
        </interval>
    </default>

    <analyst_quota>
        <interval>
            <duration>3600</duration>
            <queries>5000</queries>
            <execution_time>7200</execution_time>
        </interval>
    </analyst_quota>
</quotas>
```

## Restricting Network Access

```xml
<users>
    <internal_app>
        <password_sha256_hex>...</password_sha256_hex>
        <networks>
            <ip>10.0.0.0/8</ip>
            <ip>192.168.1.0/24</ip>
        </networks>
        <profile>default</profile>
        <quota>default</quota>
    </internal_app>
</users>
```

## Splitting into users.d/ Files

Instead of editing `users.xml` directly, drop override files in `/etc/clickhouse-server/users.d/`:

```xml
<!-- /etc/clickhouse-server/users.d/analyst.xml -->
<clickhouse>
    <users>
        <analyst>
            <password_sha256_hex>...</password_sha256_hex>
            <networks><ip>::/0</ip></networks>
            <profile>readonly</profile>
            <quota>default</quota>
        </analyst>
    </users>
</clickhouse>
```

This keeps changes isolated and simplifies configuration management.

## Reloading Configuration

```bash
sudo clickhouse-client --query "SYSTEM RELOAD CONFIG"
```

Changes to `users.xml` take effect after reload without restarting the server.

## Summary

The ClickHouse `users.xml` file defines users (with hashed passwords and network restrictions), settings profiles (with query limits), and quotas (with hourly resource caps). Use the `users.d/` directory for modular configuration. Reload configuration changes with `SYSTEM RELOAD CONFIG` without restarting. For new deployments, consider using SQL-based access control (`CREATE USER`, `GRANT`) as the preferred approach.
