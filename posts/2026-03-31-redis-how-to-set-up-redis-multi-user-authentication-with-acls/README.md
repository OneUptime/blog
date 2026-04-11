# How to Set Up Redis Multi-User Authentication with ACLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Authentication, Security, Multi-User

Description: Learn how to configure Redis Access Control Lists (ACLs) to create multiple users with different permissions, key patterns, and command restrictions.

---

## What Are Redis ACLs?

Redis ACL (Access Control List) system, introduced in Redis 6.0, allows you to define multiple users with:

- Individual passwords
- Allowed or denied commands
- Allowed or denied key patterns
- Allowed Pub/Sub channel patterns (Redis 6.2+)

ACLs replace the single `requirepass` approach with fine-grained, per-user access control.

## Default User

Redis starts with a single `default` user that has no password and full access. In production, restrict or disable it:

```bash
redis-cli ACL WHOAMI
```

Output: `"default"`

## Creating Users with ACL SETUSER

The `ACL SETUSER` command creates and configures users:

```bash
# Create a read-only user
ACL SETUSER readuser on >readPassword ~* &* +@read

# Create an app user with read/write on specific key prefix
ACL SETUSER appuser on >appPassword ~app:* &* +@read +@write +DEL +EXPIRE

# Create an admin user with full access
ACL SETUSER admin on >adminPassword ~* &* +@all

# Disable the default user
ACL SETUSER default off
```

## ACL Rule Syntax

Each rule component:

```text
on/off        - Enable or disable the user
>password     - Set a password (use multiple >pass for multiple passwords)
~pattern      - Allow key access matching the glob pattern (e.g., ~app:*)
&channel      - Allow Pub/Sub channel access (e.g., &notifications:*)
+@category    - Allow a command category (+@read, +@write, +@all)
-@category    - Deny a command category (-@dangerous)
+command      - Allow a specific command (+GET)
-command      - Deny a specific command (-FLUSHALL)
reset         - Reset all rules for the user
resetpass     - Remove all passwords
nopass        - Allow login without a password (security risk)
```

## Defining Users in redis.conf

For persistent configuration, define users in `redis.conf`:

```text
# /etc/redis/redis.conf

# Disable default user
user default off

# Application user
user appuser on >StrongAppPassword123 ~app:* &app:* +@read +@write +DEL +EXPIRE +TTL

# Read-only reporting user
user reporter on >ReadOnlyPass456 ~* &* +@read

# Admin user
user admin on >AdminSecurePass789 ~* &* +@all

# Background job user
user worker on >WorkerPass321 ~jobs:* ~queue:* &* +@read +@write +BLPOP +BRPOP
```

After editing `redis.conf`, restart Redis to apply changes:

```bash
sudo systemctl restart redis
```

To apply changes at runtime without editing `redis.conf`, use `ACL SETUSER` commands directly, then persist them with `CONFIG REWRITE`:

```bash
redis-cli ACL SETUSER appuser on >StrongAppPassword123 ~app:* &app:* +@read +@write +DEL +EXPIRE +TTL
redis-cli CONFIG REWRITE
```

## Using an External ACL File

Keep ACL rules in a separate file:

```text
# redis.conf
aclfile /etc/redis/users.acl
```

Create the file:

```text
# /etc/redis/users.acl
user default off
user appuser on >AppPass ~app:* &* +@read +@write +DEL
user admin on >AdminPass ~* &* +@all
```

Reload at runtime:

```bash
redis-cli ACL LOAD
```

Save changes to the ACL file:

```bash
redis-cli ACL SAVE
```

## Listing All Users

```bash
redis-cli ACL LIST
```

Sample output:

```text
user default off resetchannels -@all
user appuser on #sha256hash... ~app:* &* +@read +@write +DEL
user admin on #sha256hash... ~* &* +@all
```

## Inspecting a Specific User

```bash
redis-cli ACL GETUSER appuser
```

Output:

```text
 1) "flags"
 2) 1) "on"
 3) "passwords"
 4) 1) "(sha256 hash)"
 5) "commands"
 6) "+@read +@write +DEL"
 7) "keys"
 8) "~app:*"
 9) "channels"
10) "&*"
```

## Testing Permissions with ACL DRYRUN

Available since Redis 7.0, `ACL DRYRUN` tests whether a command would succeed for a user without executing it:

```bash
redis-cli ACL DRYRUN appuser SET app:key "value"
# Returns OK if allowed

redis-cli ACL DRYRUN appuser FLUSHALL
# Returns error if not allowed
```

## Monitoring ACL Violations

Track unauthorized access attempts:

```bash
redis-cli ACL LOG
```

Output shows denied commands, the user, client address, and timestamp.

Reset the log:

```bash
redis-cli ACL LOG RESET
```

## Connecting as a Specific User

```bash
redis-cli -u redis://appuser:AppPass@localhost:6379
```

Or:

```bash
redis-cli AUTH appuser AppPass
```

In application code (Python):

```python
import redis

r = redis.Redis(
    host="localhost",
    port=6379,
    username="appuser",
    password="StrongAppPassword123"
)
r.set("app:mykey", "value")
```

## Summary

Redis ACLs provide fine-grained, per-user access control through usernames, passwords, key patterns, and command categories. Define users with `ACL SETUSER` or in `redis.conf` / an external ACL file. Disable the default user in production and assign minimal permissions to each service user. Use `ACL DRYRUN` to test rules before deployment and `ACL LOG` to monitor denied access attempts.
