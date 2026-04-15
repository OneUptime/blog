# How to Use SYSTEM RELOAD CONFIG in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, System, Configuration, Reload

Description: Learn how SYSTEM RELOAD CONFIG reloads ClickHouse server configuration from config.xml and users.xml without requiring a server restart.

---

Changing ClickHouse configuration normally requires editing `config.xml` or `users.xml` and restarting the server - a disruptive operation in production. For many configuration changes, however, a restart is not needed. `SYSTEM RELOAD CONFIG` instructs ClickHouse to re-read its configuration files immediately, applying most changes live. This post explains what gets reloaded, what does not, and how to use the command safely.

## SYSTEM RELOAD CONFIG

```sql
SYSTEM RELOAD CONFIG;
```

This command tells the ClickHouse server process to re-read all configuration files: `config.xml`, all files under `config.d/`, `users.xml`, and all files under `users.d/`. It is synchronous - it returns after the reload is complete.

## What Gets Reloaded

The following configuration changes are applied live by `SYSTEM RELOAD CONFIG`:

- **User accounts and permissions** (`users.xml` / `users.d/`) - new users, password changes, role grants, quota changes, profile settings.
- **Quotas** - updated query rate limits and resource quotas.
- **Settings profiles** - changes to named settings profiles applied to users.
- **Access control lists** - row-level security policies.
- **Remote server topology** (`<remote_servers>`) - adding or removing cluster nodes.
- **ZooKeeper configuration** - connection settings for ZooKeeper/Keeper.
- **Dictionary definitions** loaded from `config.xml` includes (though `SYSTEM RELOAD DICTIONARIES` is preferred for dictionary data).
- **Logging configuration** - log levels, log file paths.

## What Requires a Server Restart

Some settings cannot be changed without restarting ClickHouse:

- Listen address and port changes (`<listen_host>`, `<tcp_port>`, `<http_port>`).
- Storage path changes (`<path>`, `<tmp_path>`).
- MergeTree global settings that are initialized at startup.
- Changes to the `<macros>` section on replicated deployments (requires careful coordination).

## Practical Example - Updating a User Password

Edit `users.xml` or a file under `users.d/`:

```xml
<!-- /etc/clickhouse-server/users.d/my_app.xml -->
<clickhouse>
  <users>
    <my_app>
      <password_sha256_hex>new_sha256_hash_here</password_sha256_hex>
      <profile>default</profile>
      <quota>default</quota>
      <networks>
        <ip>::/0</ip>
      </networks>
    </my_app>
  </users>
</clickhouse>
```

Apply without restarting:

```sql
SYSTEM RELOAD CONFIG;
```

Verify the change took effect:

```sql
SELECT name, storage
FROM system.users
WHERE name = 'my_app';
```

## Practical Example - Adding a Remote Server

Add a new shard to your cluster definition in `config.d/clusters.xml`:

```xml
<clickhouse>
  <remote_servers>
    <my_cluster>
      <shard>
        <replica>
          <host>clickhouse-node-3</host>
          <port>9000</port>
        </replica>
      </shard>
    </my_cluster>
  </remote_servers>
</clickhouse>
```

Reload to apply:

```sql
SYSTEM RELOAD CONFIG;
```

Verify the new node appears:

```sql
SELECT
    cluster,
    shard_num,
    host_name,
    port,
    is_local
FROM system.clusters
WHERE cluster = 'my_cluster'
ORDER BY shard_num, host_name;
```

## Practical Example - Changing a User's Settings Profile

```xml
<!-- users.d/profiles.xml -->
<clickhouse>
  <profiles>
    <analyst>
      <max_memory_usage>20000000000</max_memory_usage>
      <max_execution_time>120</max_execution_time>
    </analyst>
  </profiles>
</clickhouse>
```

```sql
SYSTEM RELOAD CONFIG;

-- Verify the profile is live by applying it to the current session
SET profile = 'analyst';
SELECT name, value
FROM system.settings
WHERE name IN ('max_memory_usage', 'max_execution_time');
```

## SYSTEM RELOAD CONFIG vs Server Restart

| Change | SYSTEM RELOAD CONFIG | Server Restart |
|---|---|---|
| User password change | Yes | Yes |
| New user creation | Yes | Yes |
| Quota update | Yes | Yes |
| Cluster topology change | Yes | Yes |
| Port change | No | Required |
| Storage path change | No | Required |
| Dictionary data refresh | Use SYSTEM RELOAD DICTIONARIES | Yes |

## Checking Configuration After Reload

```sql
-- View effective server settings
SELECT name, value, changed
FROM system.server_settings
WHERE changed = 1
ORDER BY name;

-- View current users
SELECT
    name,
    auth_type,
    host_ip,
    host_names
FROM system.users
ORDER BY name;

-- View current quotas
SELECT name, keys, durations
FROM system.quotas
ORDER BY name;
```

## Summary

`SYSTEM RELOAD CONFIG` lets you apply most ClickHouse configuration changes - user accounts, quotas, settings profiles, cluster topology, and logging - without restarting the server. Edit the relevant `config.xml` or `users.xml` file (or a file under `config.d/` or `users.d/`), run the command, and verify the change using `system.users`, `system.clusters`, or `system.server_settings`. Reserve server restarts for the small set of settings that genuinely require them.
