# Redis ACL Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Command, Cheat Sheet, Security

Description: Complete Redis ACL commands reference covering ACL SETUSER, ACL GETUSER, ACL LIST, ACL LOG, and access control rule syntax.

---

Redis Access Control Lists (ACLs), introduced in Redis 6.0, allow you to create users with fine-grained permissions. Here is the complete command reference and rule syntax.

## ACL User Management

```bash
# List all ACL rules
ACL LIST
# Returns lines like:
# user default on nopass ~* &* +@all

# List all usernames
ACL USERS

# Get current authenticated username
ACL WHOAMI

# Get rules for a specific user
ACL GETUSER alice

# Create or update a user
ACL SETUSER alice

# Delete a user
ACL DELUSER alice
```

## ACL Rule Syntax

Rules are combined in a single ACL SETUSER call:

```bash
ACL SETUSER alice \
  on \                          # enable the user
  >secure_password123 \         # set password
  ~user:* \                     # allow keys matching user:*
  &notifications \              # allow pub/sub channel "notifications"
  +GET +SET +DEL \              # allow specific commands
  -@dangerous                   # deny dangerous command category
```

### Status Rules

```bash
on          # enable user
off         # disable user (cannot authenticate)
nopass      # no password required (use with care)
resetpass   # remove all passwords
```

### Password Rules

```bash
>password        # add a password
<password        # remove a password
#sha256hash      # add a hashed password (SHA-256 hex)
!sha256hash      # remove a hashed password
```

### Key Permission Rules

```bash
~*               # access all keys
~user:*          # access keys matching user:*
~session:???     # access keys matching session:???
%R~*             # read-only access to all keys (Redis 7.0+)
%W~cache:*       # write-only access to cache:* keys (Redis 7.0+)
%RW~logs:*       # read-write access to logs:* keys (Redis 7.0+)
resetkeys        # remove all key permissions
```

### Pub/Sub Channel Rules (Redis 6.2+)

```bash
&*               # allow all pub/sub channels
&orders          # allow only "orders" channel
&order-*         # allow channels matching order-*
resetchannels    # remove all channel permissions
```

### Command Rules

```bash
+@all            # allow all commands
-@all            # deny all commands
+@read           # allow all read commands
+@write          # allow all write commands
+@string         # allow string commands
-@dangerous      # deny dangerous commands (FLUSHALL, DEBUG, etc.)
+GET -SET        # allow GET, deny SET
+@hash +@list    # allow hash and list commands
allcommands      # same as +@all
nocommands       # same as -@all
```

## Practical Examples

```bash
# Read-only user for a replica or reporting service
ACL SETUSER readonly on >readpass ~* +@read

# App user with limited key access
ACL SETUSER myapp on >apppassword \
  ~session:* ~cache:* \
  +GET +SET +DEL +EXPIRE +TTL +HSET +HGET +HGETALL +HDEL

# Worker with queue access only
ACL SETUSER worker on >workerpass \
  ~jobs:* \
  +RPUSH +BLPOP +LRANGE +LLEN

# Admin user
ACL SETUSER admin on >adminpass ~* &* +@all

# Disable the default user (security hardening)
ACL SETUSER default off
```

## ACL Log

```bash
# View recent ACL violations
ACL LOG
ACL LOG 10      # last 10 entries
ACL LOG RESET   # clear the log

# Configure log max length
CONFIG SET acllog-max-len 128
```

## Saving ACL Configuration

```bash
# Save current ACLs to file
ACL SAVE

# Load ACLs from file
ACL LOAD

# In redis.conf
# aclfile /etc/redis/users.acl
```

## Summary

Redis ACL commands let you create users with precise permissions over commands, key patterns, and pub/sub channels. Use ACL SETUSER with %R~ and %W~ prefixes in Redis 7.0+ for read-only or write-only key access, and ACL LOG to audit unauthorized access attempts. Always disable or restrict the default user in production.
