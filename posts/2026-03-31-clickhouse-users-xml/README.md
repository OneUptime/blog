# How to Use users.xml for User Management in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, User Management, Configuration, Access Control, XML

Description: Learn how to define ClickHouse users, passwords, profiles, and quotas in users.xml for declarative, file-based access control without SQL user management.

---

## Introduction

ClickHouse supports two user management modes: SQL-driven (`access_management = 1`) and file-based (`users.xml`). The `users.xml` file (or files in `users.d/`) defines users, their passwords, network access restrictions, settings profiles, and quotas in XML. This is useful for infrastructure-as-code environments where user configuration is tracked in version control.

## File Location

```bash
# Default users file
/etc/clickhouse-server/users.xml

# Drop-in directory (preferred for overrides)
/etc/clickhouse-server/users.d/
```

## users.xml Structure

```xml
<clickhouse>
  <users>
    <!-- Define users here -->
  </users>
  <profiles>
    <!-- Define settings profiles here -->
  </profiles>
  <quotas>
    <!-- Define resource quotas here -->
  </quotas>
</clickhouse>
```

## Defining a User with SHA256 Password

Generate the hash:

```bash
echo -n 'MySecretPassword' | sha256sum | tr -d ' -'
# c152246c91ef62f553d2109b68698b19f7dd83328374abc489920bf2e2e23510
```

```xml
<users>
  <analyst>
    <password_sha256_hex>c152246c91ef62f553d2109b68698b19f7dd83328374abc489920bf2e2e23510</password_sha256_hex>
    <networks>
      <ip>10.0.0.0/8</ip>
      <ip>172.16.0.0/12</ip>
    </networks>
    <profile>analytics</profile>
    <quota>default</quota>
    <access_management>0</access_management>
  </analyst>
</users>
```

## Defining an Admin User

```xml
<users>
  <admin>
    <password_sha256_hex>HASH_OF_ADMIN_PASSWORD</password_sha256_hex>
    <networks>
      <ip>::1</ip>
      <ip>127.0.0.1</ip>
      <ip>10.0.0.0/8</ip>
    </networks>
    <profile>default</profile>
    <quota>default</quota>
    <access_management>1</access_management>
    <named_collection_control>1</named_collection_control>
  </admin>
</users>
```

## Defining a Read-Only User

```xml
<users>
  <readonly_user>
    <password_sha256_hex>HASH_OF_READONLY_PASSWORD</password_sha256_hex>
    <networks>
      <ip>::/0</ip>  <!-- Allow from any IP -->
    </networks>
    <profile>readonly</profile>
    <quota>default</quota>
    <allow_databases>
      <!-- Restrict to specific databases -->
      <database>analytics</database>
    </allow_databases>
  </readonly_user>
</users>
```

## Defining Settings Profiles

```xml
<profiles>
  <default>
    <max_memory_usage>10000000000</max_memory_usage>
    <max_threads>8</max_threads>
    <use_uncompressed_cache>0</use_uncompressed_cache>
    <load_balancing>random</load_balancing>
  </default>

  <analytics>
    <max_memory_usage>20000000000</max_memory_usage>
    <max_threads>16</max_threads>
    <max_execution_time>300</max_execution_time>
    <use_query_cache>1</use_query_cache>
    <query_cache_ttl>60</query_cache_ttl>
  </analytics>

  <readonly>
    <readonly>1</readonly>
    <max_memory_usage>5000000000</max_memory_usage>
    <max_execution_time>60</max_execution_time>
  </readonly>
</profiles>
```

## Defining Quotas

```xml
<quotas>
  <default>
    <interval>
      <duration>3600</duration>       <!-- 1 hour window -->
      <queries>1000</queries>          <!-- Max 1000 queries per hour -->
      <errors>100</errors>             <!-- Max 100 errors per hour -->
      <result_rows>1000000000</result_rows>
      <read_rows>10000000000</read_rows>
      <execution_time>3600</execution_time>
    </interval>
  </default>

  <heavy_users>
    <interval>
      <duration>3600</duration>
      <queries>10000</queries>
      <read_rows>100000000000</read_rows>
      <execution_time>36000</execution_time>
    </interval>
  </heavy_users>
</quotas>
```

## Using a Drop-In File

Instead of editing `users.xml` directly, add a file in `users.d/`:

```bash
# /etc/clickhouse-server/users.d/my_users.xml
```

```xml
<clickhouse>
  <users>
    <etl_user>
      <password_sha256_hex>HASH_HERE</password_sha256_hex>
      <networks>
        <ip>10.10.0.0/16</ip>
      </networks>
      <profile>default</profile>
      <quota>default</quota>
    </etl_user>
  </users>
</clickhouse>
```

## Reloading Users Without Restart

```sql
SYSTEM RELOAD CONFIG;
```

Or send SIGHUP to the process:

```bash
kill -HUP $(pgrep clickhouse-server)
```

## Verifying Users

```sql
SELECT name, storage
FROM system.users;

SELECT name, type, params, precedence
FROM system.user_directories;
```

## Plain Text Password (Development Only)

```xml
<users>
  <dev_user>
    <password>plaintext_password_do_not_use_in_prod</password>
    ...
  </dev_user>
</users>
```

Never use plain text passwords in production.

## Summary

`users.xml` (and files in `users.d/`) is the file-based approach to defining ClickHouse users, settings profiles, and quotas. Use SHA256-hashed passwords, restrict network access with `<networks>`, assign profiles for per-user query limits, and assign quotas for rate limiting. Changes reload without server restart using `SYSTEM RELOAD CONFIG`. For environments with many users or dynamic provisioning, consider SQL-based user management with `access_management = 1`.
