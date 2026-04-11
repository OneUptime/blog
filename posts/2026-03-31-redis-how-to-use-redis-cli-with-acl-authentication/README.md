# How to Use Redis CLI with ACL Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Authentication, Redis Cli, Security

Description: Connect to Redis using ACL users with redis-cli, authenticate with usernames and passwords, and test ACL permissions from the command line.

---

## Redis ACL Overview

Redis 6.0 introduced ACL (Access Control Lists) to replace the single-password authentication model. Each ACL user can have:
- A username and password
- Allowed and denied commands
- Allowed key patterns
- Allowed Pub/Sub channel patterns

## Authenticating with ACL Users in redis-cli

```bash
# Redis 6+ ACL authentication uses AUTH username password
redis-cli -u redis://username:password@localhost:6379

# Or using flags
redis-cli -h localhost -p 6379 --user username --pass password

# Authenticate within interactive mode
127.0.0.1:6379> AUTH username password
OK

# Check current user
127.0.0.1:6379> ACL WHOAMI
"username"
```

## Connection URI Format

```bash
# Full URI with authentication
redis-cli -u redis://readuser:secretpass@redis.example.com:6379/0

# With TLS
redis-cli -u rediss://readuser:secretpass@redis.example.com:6380/0

# URL encode special characters in password
# @ -> %40, : -> %3A, / -> %2F
```

## Creating ACL Users for Testing

```bash
# Create a read-only user
redis-cli ACL SETUSER readuser on >readpass ~* &* +@read -@write

# Create a user with access to specific key patterns
redis-cli ACL SETUSER appuser on >apppass ~app:* &* +@all

# Create an admin user
redis-cli ACL SETUSER admin on >adminpass ~* &* +@all

# List all users
redis-cli ACL LIST

# View a specific user's permissions
redis-cli ACL GETUSER readuser
```

## Testing Permissions from redis-cli

Use `ACL DRYRUN` to test whether a user has permission for a command without executing it:

```bash
# Test if 'readuser' can GET a key
redis-cli ACL DRYRUN readuser GET somekey
# Output: OK (allowed) or error (denied)

# Test if 'readuser' can SET a key
redis-cli ACL DRYRUN readuser SET somekey somevalue
# Output: This user has no permissions to run the 'SET' command

# Test key pattern access
redis-cli ACL DRYRUN appuser GET app:config
# Output: OK

redis-cli ACL DRYRUN appuser GET other:key
# Output: No permissions to access a key
```

## Authenticating with a Script

```bash
#!/bin/bash
# authenticate-redis.sh

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_USER="${REDIS_USER:-default}"
REDIS_PASS="${REDIS_PASS:-}"

# Run a command as a specific user
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
  --user "$REDIS_USER" --pass "$REDIS_PASS" \
  --no-auth-warning \
  PING
```

## Verifying ACL Configuration

```bash
# Show current user
redis-cli --user admin --pass adminpass ACL WHOAMI

# Show all users and their rules
redis-cli --user admin --pass adminpass ACL LIST

# Sample output:
# user default on nopass ~* &* +@all
# user readuser on #hashed_password ~* &* +@read
# user appuser on #hashed_password ~app:* &* +@all

# Get detailed info on a user
redis-cli --user admin --pass adminpass ACL GETUSER readuser
```

## Loading ACL from File

```bash
# aclfile.acl
user default off
user readuser on >readpass ~* &* +@read
user writeuser on >writepass ~* &* +@write +@read
user admin on >adminpass ~* &* +@all

# Point redis.conf to the ACL file
# aclfile /etc/redis/users.acl

# Reload ACL rules without restarting
redis-cli ACL LOAD
```

## Connecting with ioredis Using ACL

```javascript
const Redis = require('ioredis');

// Connect with ACL user
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASS,
});

redis.on('connect', async () => {
  const user = await redis.acl('WHOAMI');
  console.log(`Connected as: ${user}`);
});
```

## Monitoring ACL Denials

```bash
# View recent ACL access denials
redis-cli ACL LOG

# Reset the ACL log
redis-cli ACL LOG RESET

# Get a specific number of recent entries
redis-cli ACL LOG 10
```

## Summary

Redis CLI supports ACL authentication via the `--user` and `--pass` flags, or using the `redis://username:password@host:port` URI format. Use `ACL DRYRUN` to test user permissions without side effects, and `ACL LOG` to investigate authentication failures. Store credentials in environment variables or secrets management systems rather than passing them directly on the command line to avoid exposure in process lists.
