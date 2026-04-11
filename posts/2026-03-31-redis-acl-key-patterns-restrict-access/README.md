# How to Restrict Redis Key Access with ACL Key Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Security, Key, Authorization

Description: Learn how to use Redis ACL key patterns to limit which keys each user can read or write, isolating data between applications sharing one instance.

---

Redis ACL key patterns let you restrict which keys a user can access. When multiple apps share a single Redis server, you can enforce namespace isolation so that App A cannot read or modify App B's data.

## Key Pattern Syntax

Key pattern rules appear in `ACL SETUSER` using tilde (`~`) for read/write and percent signs for separate read (`%R~`) and write (`%W~`) access:

```text
~pattern         Allow read and write on matching keys
%R~pattern       Allow read only on matching keys (Redis 7.0+)
%W~pattern       Allow write only on matching keys (Redis 7.0+)
allkeys          Allow access to all keys
resetkeys        Remove all key patterns (deny all keys)
```

## Namespace Isolation Example

Assign each application its own key prefix:

```bash
# App A can only access keys starting with "app-a:"
ACL SETUSER app-a-user on >pass1 ~app-a:* &* -@all +@read +@write +@string +@hash

# App B can only access keys starting with "app-b:"
ACL SETUSER app-b-user on >pass2 ~app-b:* &* -@all +@read +@write +@string +@hash
```

Test isolation:

```bash
redis-cli -u redis://app-a-user:pass1@127.0.0.1:6379 SET app-a:session "data"
# OK
redis-cli -u redis://app-a-user:pass1@127.0.0.1:6379 GET app-b:session
# (error) NOPERM this user has no permissions to access one of the keys used as arguments
```

## Multiple Patterns for One User

A user can match keys across several prefixes:

```bash
ACL SETUSER shared-reader on >sharedpass ~cache:* ~session:* ~config:* &* -@all +@read
```

## Read-Only vs Write-Only Key Access (Redis 7.0+)

Separate read and write permissions on keys:

```bash
# Logging service: can write logs but only read its own audit keys
ACL SETUSER logger on >logpass %W~logs:* %R~audit:logger:* &* -@all +SET +GET +APPEND
```

## Wildcard Patterns

Patterns follow glob-style matching:

```text
~user:*         Matches user:123, user:profile:456
~session:??     Matches session:ab, session:xy (exactly 2 chars after colon)
~metrics:[0-9]* Matches metrics:1, metrics:99
```

## Check Effective Key Permissions

```bash
ACL GETUSER app-a-user
```

```text
...
5) "keys"
6) "app-a:*"
...
```

## Use ACL DRYRUN to Test Before Applying

```bash
ACL DRYRUN app-a-user GET app-b:somekey
# "This user has no permissions to access the 'app-b:somekey' key"
```

## Summary

Redis ACL key patterns use `~pattern` to restrict which keys a user can access, enforcing namespace isolation between applications. Redis 7.0 adds `%R~` and `%W~` for separate read and write key restrictions. Always test patterns with `ACL DRYRUN` before deploying to production.
