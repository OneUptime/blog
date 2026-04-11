# How to Disable Redis Persistence Commands in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Production, Configuration, Hardening

Description: Disable or rename dangerous Redis persistence commands like BGSAVE, BGREWRITEAOF, and CONFIG in production to prevent unauthorized data manipulation and attacks.

---

Redis persistence commands like `BGSAVE`, `BGREWRITEAOF`, `CONFIG`, and `DEBUG` can be weaponized by attackers who gain unauthorized access. Disabling or renaming these commands reduces the attack surface and prevents accidental data loss from misconfigured clients.

## Commands to Disable or Rename

| Command | Risk |
|---|---|
| `CONFIG SET` | Change Redis config at runtime, including persistence paths |
| `CONFIG REWRITE` | Overwrite redis.conf on disk |
| `DEBUG` | Crash the server, inspect memory |
| `BGSAVE` | Trigger a dump.rdb save, potentially to a modified path |
| `BGREWRITEAOF` | Rewrite AOF file |
| `SHUTDOWN` | Shut down the server |
| `SLAVEOF` / `REPLICAOF` | Redirect replication to an attacker-controlled server |
| `FLUSHALL` | Delete all data across all databases |
| `FLUSHDB` | Delete all data in the current database |
| `MONITOR` | Stream all commands received by the server, exposing sensitive data |

## Disabling Commands with rename-command

In `redis.conf`, rename a command to an empty string to disable it entirely:

```text
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN ""
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command BGSAVE ""
rename-command BGREWRITEAOF ""
rename-command SLAVEOF ""
rename-command REPLICAOF ""
rename-command MONITOR ""
```

## Renaming to a Secret Token

If you need to use these commands in controlled circumstances (e.g., from a management host), rename them to a hard-to-guess string:

```text
rename-command CONFIG "config-a8f3e291c74b"
rename-command FLUSHALL "flushall-9d2f6b1e5c83"
rename-command DEBUG "debug-c5a1f9b3d7e2"
```

Only authorized administrators with the renamed commands can use them:

```bash
redis-cli config-a8f3e291c74b GET maxmemory
redis-cli flushall-9d2f6b1e5c83
```

## Using ACLs Instead of rename-command (Redis 6+)

ACLs provide more granular control and are preferred over `rename-command` in modern Redis:

```bash
# Create a restricted application user
ACL SETUSER appuser on >securepassword ~* &* +@all -CONFIG -DEBUG -SHUTDOWN -FLUSHALL -FLUSHDB -BGSAVE -BGREWRITEAOF -SLAVEOF -REPLICAOF -MONITOR

# Create an admin user with full access
ACL SETUSER adminuser on >adminpassword ~* &* +@all

# Save ACL rules
ACL SAVE
```

Verify the restriction:

```bash
redis-cli -u redis://appuser:securepassword@localhost:6379 CONFIG GET maxmemory
# (error) NOPERM this user has no permissions to run the 'config' command
```

## Verifying Commands Are Disabled

```bash
redis-cli CONFIG GET maxmemory
# (error) ERR unknown command 'CONFIG', with args beginning with: 'GET' 'maxmemory'

redis-cli FLUSHALL
# (error) ERR unknown command 'FLUSHALL'
```

## Applying in Docker

```bash
docker run -d redis:7 \
  redis-server \
  --rename-command CONFIG "" \
  --rename-command FLUSHALL "" \
  --rename-command DEBUG "" \
  --rename-command SHUTDOWN ""
```

## Summary

Disabling dangerous Redis persistence and administrative commands with `rename-command ""` is a simple but effective production hardening step. For modern Redis 6+ deployments, prefer ACLs for fine-grained per-user command restrictions. Combine both approaches with network-level access controls and TLS for a defense-in-depth security posture.
