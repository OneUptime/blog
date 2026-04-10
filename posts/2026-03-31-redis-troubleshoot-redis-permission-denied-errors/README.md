# How to Troubleshoot Redis Permission Denied Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Permission, Troubleshooting

Description: Fix Redis NOAUTH and NOPERM permission denied errors caused by missing passwords, ACL mismatches, and command restrictions.

---

Redis permission denied errors prevent clients from executing commands. These errors appear as `NOAUTH Authentication required` or `NOPERM this user has no permissions to run the 'X' command`. This guide covers diagnosis and resolution.

## Identify the Error Type

Two main permission error types exist in Redis:

**NOAUTH** - Client hasn't authenticated:

```text
(error) NOAUTH Authentication required.
```

**NOPERM** - Client authenticated but lacks command or key permissions:

```text
(error) NOPERM this user has no permissions to run the 'DEL' command
(error) NOPERM No permissions to access a key
```

## Fix NOAUTH Errors

If Redis uses `requirepass` or ACL-based authentication:

```bash
# Test with password
redis-cli -h 127.0.0.1 -a "your-password" ping

# Authenticate within redis-cli
redis-cli
> AUTH your-password
```

Check what authentication method is configured:

```bash
redis-cli CONFIG GET requirepass
redis-cli ACL WHOAMI
```

## Fix NOPERM Errors

NOPERM errors require inspecting ACL rules. First, identify the connected user:

```bash
redis-cli ACL WHOAMI
```

View all users and their permissions:

```bash
redis-cli ACL LIST
```

Sample output:

```text
user default on nopass ~* &* +@all
user appuser on #5e884898da2804... ~app:* &* +@read +@write -@dangerous
```

The format is: `user <name> <status> <password> <key-patterns> <channel-patterns> <commands>`

## Grant Missing Permissions

If a user needs access to specific commands:

```bash
# Allow SET and GET
redis-cli ACL SETUSER appuser +SET +GET

# Allow all read commands
redis-cli ACL SETUSER appuser +@read

# Allow all commands except dangerous ones
redis-cli ACL SETUSER appuser +@all -@dangerous

# Grant access to a key pattern
redis-cli ACL SETUSER appuser ~"session:*"
```

Make changes permanent by adding to `redis.conf` or an ACL file:

```text
# /etc/redis/users.acl
user appuser on >strongpassword ~app:* +@read +@write
```

```text
# redis.conf
aclfile /etc/redis/users.acl
```

## Test ACL Rules Before Applying

Use `ACL DRYRUN` to test permissions without executing the command:

```bash
redis-cli ACL DRYRUN appuser GET session:user123
# Returns OK or an error message
```

## Check Key Pattern Restrictions

NOPERM on a key means the user's key pattern does not match:

```bash
# User can only access keys matching "app:*"
redis-cli ACL SETUSER appuser ~"app:*"

# This will fail - key doesn't match pattern
redis-cli -u redis://appuser:password@localhost SET other:key value
# (error) NOPERM No permissions to access a key
```

To allow access to all keys: `~*`. To allow access to specific namespaces, use multiple patterns: `~app:* ~cache:*`.

## Summary

Redis permission errors fall into two categories: NOAUTH when a client has not authenticated, and NOPERM when an authenticated user lacks command or key access. Use `ACL WHOAMI`, `ACL LIST`, and `ACL DRYRUN` to diagnose the issue, then use `ACL SETUSER` to grant the necessary permissions. Store ACL rules in a persistent ACL file to survive restarts.
