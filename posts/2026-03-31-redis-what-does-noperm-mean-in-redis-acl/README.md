# What Does 'NOPERM' Mean in Redis ACL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Error, Debugging

Description: Understand the Redis NOPERM error returned by ACL permission checks, why it occurs, and how to grant the right permissions to fix it.

---

The `NOPERM` error in Redis means the authenticated user does not have permission to execute the requested command or access the requested key. It was introduced with Redis 6 Access Control Lists (ACL) and replaces the simpler single-password model.

## What Causes the Error

```bash
127.0.0.1:6379> AUTH readonlyuser readonlypass
OK
127.0.0.1:6379> SET mykey "hello"
(error) NOPERM this user has no permissions to run the 'set' command
```

NOPERM can occur when:
- The user is restricted to a subset of commands (read-only, specific command categories)
- The user does not have access to a specific key pattern
- The user is not allowed to access a specific channel (for pub/sub)

## Inspecting Permissions

Use `ACL WHOAMI` to see the current user:

```bash
127.0.0.1:6379> ACL WHOAMI
"readonlyuser"
```

Use `ACL LIST` to view all users and their permissions:

```bash
127.0.0.1:6379> ACL LIST
1) "user default on nopass ~* &* +@all"
2) "user readonlyuser on #<sha256hash> ~* &* +@read"
```

Use `ACL GETUSER` for a detailed breakdown:

```bash
127.0.0.1:6379> ACL GETUSER readonlyuser
 1) "flags"
 2) 1) "on"
 3) "passwords"
 4) 1) "<sha256>"
 5) "commands"
 6) "+@read"
 7) "keys"
 8) "~*"
 9) "channels"
10) "&*"
```

## Granting Missing Permissions

**Add a specific command:**

```bash
127.0.0.1:6379> ACL SETUSER readonlyuser +SET
OK
```

**Add a command category:**

```bash
127.0.0.1:6379> ACL SETUSER readonlyuser +@write
OK
```

**Restrict to specific key patterns:**

```bash
# Allow access only to keys starting with "app:"
127.0.0.1:6379> ACL SETUSER appuser ~app:* +@all
OK
```

**Full read-write user for all keys:**

```bash
127.0.0.1:6379> ACL SETUSER appuser on >strongpassword ~* +@all
OK
```

## Configuring ACL in a File

For production, manage ACL rules in an external file referenced in `redis.conf`:

```text
aclfile /etc/redis/acl.conf
```

Example `acl.conf`:

```text
user default off
user admin on >adminpassword ~* +@all
user appuser on >apppassword ~* +@read +@write -@dangerous
user readonly on >readpass ~* +@read
```

Reload without restarting:

```bash
127.0.0.1:6379> ACL LOAD
OK
```

## Saving ACL Changes

```bash
# Save current in-memory ACL rules to the aclfile
127.0.0.1:6379> ACL SAVE
OK
```

## Logging Permission Failures

Enable ACL logging to track NOPERM events:

```bash
127.0.0.1:6379> ACL LOG
# Shows recent ACL violations

127.0.0.1:6379> ACL LOG RESET
OK
```

## Summary

NOPERM means the current ACL user lacks permission for the command or key pattern requested. Use `ACL GETUSER` to inspect permissions, `ACL SETUSER` to grant the missing command categories or key patterns, and manage production ACL rules through an external `aclfile` for consistency and audit trails.
