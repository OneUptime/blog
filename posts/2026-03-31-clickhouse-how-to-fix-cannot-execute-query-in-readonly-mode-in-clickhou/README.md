# How to Fix 'Cannot execute query in readonly mode' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Permission, Configuration, Troubleshooting

Description: Fix ClickHouse 'Cannot execute query in readonly mode' by identifying the readonly setting source and adjusting user profiles or connection settings.

---

## Understanding the Error

ClickHouse has a `readonly` setting that restricts what a session or user can execute. When you try to run a write operation in a read-only session, you see:

```text
Code: 164. DB::Exception: Cannot execute query in readonly mode.
```

The `readonly` setting has three levels:
- `0` - no restrictions (read and write allowed)
- `1` - only read queries allowed; settings cannot be changed
- `2` - read queries allowed; some settings can be changed but not the readonly setting itself

## Common Causes

- User profile configured with `readonly = 1` or `readonly = 2`
- Connection made with the `readonly` HTTP parameter set
- ClickHouse started with a corrupted or read-only data directory
- Replica is in a state where writes are temporarily blocked
- Connecting via a read replica endpoint

## Diagnosing the Problem

Check the current readonly setting in your session:

```sql
SELECT value
FROM system.settings
WHERE name = 'readonly';
```

Check the user's profile configuration:

```sql
SELECT
    name,
    storage,
    auth_type
FROM system.users
WHERE name = currentUser();
```

Check profile settings:

```sql
SELECT
    profile_name,
    setting_name,
    value
FROM system.settings_profile_elements
WHERE setting_name = 'readonly';
```

## Fix 1 - Update the User Profile in users.xml

If the user's profile has `readonly` set, update it:

```xml
<!-- /etc/clickhouse-server/users.d/users.xml -->
<clickhouse>
  <profiles>
    <my_profile>
      <!-- Change from 1 or 2 to 0 to allow writes -->
      <readonly>0</readonly>
    </my_profile>
  </profiles>
</clickhouse>
```

ClickHouse watches its configuration files and reloads them automatically. To force a reload immediately, run:

```sql
SYSTEM RELOAD CONFIG;
SYSTEM RELOAD USERS;
```

## Fix 2 - Use SQL to Alter the Profile

In ClickHouse 22.x+ with SQL-driven access control:

```sql
-- Check current profile settings
SHOW CREATE SETTINGS PROFILE my_profile;

-- Alter the profile to remove readonly restriction
ALTER SETTINGS PROFILE my_profile
MODIFY SETTINGS readonly = 0;
```

## Fix 3 - Fix HTTP Connection Readonly Parameter

If connecting via HTTP and passing `readonly=1`:

```bash
# Wrong: readonly mode
curl "http://localhost:8123/?query=INSERT+INTO+...&readonly=1"

# Correct: no readonly restriction
curl "http://localhost:8123/?query=INSERT+INTO+..."
```

In application code:

```python
import clickhouse_connect

# Don't pass readonly=True for write operations
client = clickhouse_connect.get_client(
    host='localhost',
    user='default',
    password='secret'
    # Do NOT add: settings={'readonly': 1}
)
```

## Fix 4 - Fix Read-Only Replicas

ClickHouse replication is multi-leader, so any healthy replica can accept writes. However, if a replica loses its ZooKeeper/Keeper connection it goes into a read-only state and will reject writes. Check replication status:

```sql
SELECT
    database,
    table,
    is_readonly,
    total_replicas,
    active_replicas
FROM system.replicas;
```

If `is_readonly = 1`, inspect the cause (ZooKeeper/Keeper connectivity, session expiration) and route writes to a healthy replica. In your application:

```yaml
# Application connection config
write_host: clickhouse-writable.example.com
read_host: clickhouse-replica.example.com
```

## Fix 5 - Fix Data Directory Permissions

If the data directory is read-only at the OS level:

```bash
# Check permissions
ls -la /var/lib/clickhouse/

# Fix permissions
sudo chown -R clickhouse:clickhouse /var/lib/clickhouse/
sudo chmod -R 755 /var/lib/clickhouse/

# Restart ClickHouse
sudo systemctl restart clickhouse-server
```

## Fix 6 - Allow Setting Changes in readonly = 2 Mode

If `readonly = 2` is intentional and you just need to change a specific setting:

```sql
-- In readonly=2, you can change most settings except readonly itself
-- This works:
SET max_execution_time = 300;

-- But writes still fail in readonly mode
-- You must change the readonly setting at the profile level
```

## Verifying the Fix

```sql
-- After fixing, verify the setting
SELECT value FROM system.settings WHERE name = 'readonly';
-- Should return: 0

-- Test a write operation
CREATE TABLE test_write (id UInt32) ENGINE = Memory;
INSERT INTO test_write VALUES (1);
SELECT * FROM test_write;
DROP TABLE test_write;
```

## Summary

"Cannot execute query in readonly mode" in ClickHouse is controlled by the `readonly` session setting, which can be set at the user profile level or via HTTP parameters. Fix it by setting `readonly = 0` in the user profile XML or via SQL `ALTER SETTINGS PROFILE`, checking HTTP connection parameters, and routing writes to a replica that is not in a read-only state.
