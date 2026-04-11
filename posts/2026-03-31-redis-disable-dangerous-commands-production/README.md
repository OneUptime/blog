# How to Disable Dangerous Redis Commands in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, ACL, Command, Production

Description: Learn how to disable or rename dangerous Redis commands like FLUSHALL, CONFIG, and DEBUG in production to prevent accidental or malicious data loss.

---

Several Redis commands can wipe all data, expose configuration, or halt the server. Disabling or renaming them is a critical step for any production deployment.

## Dangerous Commands to Address

| Command | Risk |
|---|---|
| `FLUSHALL` | Deletes all keys in all databases |
| `FLUSHDB` | Deletes all keys in current database |
| `CONFIG` | Read or change server configuration |
| `DEBUG` | Can crash or slow the server |
| `SHUTDOWN` | Stops the Redis process |
| `KEYS` | Blocks server while scanning all keys |
| `SLAVEOF` / `REPLICAOF` | Changes replication topology |

## Method 1: Rename Commands in redis.conf

Rename a command to a long random string, effectively hiding it:

```text
rename-command FLUSHALL "a7f3c9d2e8b4..."
rename-command FLUSHDB  "b2e5a1f8c3d7..."
rename-command CONFIG   "c9d4b7e2a1f6..."
rename-command DEBUG    ""
rename-command SHUTDOWN ""
rename-command KEYS     ""
```

An empty string `""` completely disables the command. A random string keeps it accessible to administrators who know the renamed form.

Note: `rename-command` is deprecated as of Redis 6.2. Prefer ACL-based restrictions for Redis 6.2+.

## Method 2: Use ACL to Restrict Commands (Recommended)

With Redis 6.2+, use ACL to deny dangerous commands per user:

```bash
# Revoke dangerous commands from the default user
ACL SETUSER default -FLUSHALL -FLUSHDB -DEBUG -SHUTDOWN -REPLICAOF

# Create an admin user with all commands
ACL SETUSER admin on >strongadminpass ~* &* allcommands

# Remove dangerous commands from application users
ACL SETUSER appuser on >apppass ~app:* &* allcommands \
  -FLUSHALL -FLUSHDB -CONFIG -DEBUG -SHUTDOWN -SLAVEOF -REPLICAOF
```

Persist the rules:

```bash
ACL SAVE
```

## Disable KEYS in Production - Use SCAN Instead

The `KEYS` command blocks Redis for the duration of the scan. Disable it and enforce `SCAN`:

```bash
ACL SETUSER default -KEYS
```

Replace application usage with `SCAN`:

```bash
# Instead of: KEYS user:*
# Use iterative SCAN:
redis-cli SCAN 0 MATCH "user:*" COUNT 100
```

## Verify Restrictions Are Working

```bash
redis-cli FLUSHALL
# (error) NOPERM this user has no permissions to run the 'flushall' command
```

## Apply Restrictions at the Config Level

For environments where ACL is not yet set up, add to `redis.conf`:

```text
# Disable completely by renaming to empty string
rename-command FLUSHALL ""
rename-command FLUSHDB  ""
rename-command DEBUG    ""
rename-command SHUTDOWN ""
```

## Summary

Disable dangerous Redis commands using either `rename-command` in `redis.conf` (legacy) or ACL rules (recommended for Redis 6.2+). Use empty string `""` to fully remove a command, or deny it with `-COMMAND` in ACL rules. Always restrict `FLUSHALL`, `FLUSHDB`, `CONFIG`, `DEBUG`, and `SHUTDOWN` on production servers.
