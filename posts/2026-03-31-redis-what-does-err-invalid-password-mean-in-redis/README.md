# What Does 'ERR invalid password' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, Authentication, Password, Security, Troubleshooting

Description: Understand why Redis returns 'ERR invalid password' or 'WRONGPASS invalid username-password pair' and how to diagnose and fix authentication credential issues.

---

## What Is the ERR invalid password Error

When you send an `AUTH` command with a wrong password, Redis returns one of these errors depending on the version:

Redis 5 and earlier:
```text
(error) ERR invalid password
```

Redis 6+ with ACL:
```text
(error) WRONGPASS invalid username-password pair or user is disabled.
```

Both mean the password (and optionally username) provided does not match what is configured in Redis.

## Common Causes

1. The wrong password is being used - typos, outdated credentials
2. The `requirepass` was changed but the application was not updated
3. In Redis 6+ ACL, the username is wrong or the user is disabled
4. The password contains special characters that need escaping in some contexts
5. Leading or trailing whitespace in the password
6. The application is connecting to a different Redis instance than expected

## How to Diagnose

### Verify the Password Manually

```bash
redis-cli -h localhost -p 6379
127.0.0.1:6379> AUTH yourpassword
```

If this returns `OK`, the password is correct and the issue is in the application configuration.

If it returns `ERR invalid password`, the password is wrong.

### Check the Current requirepass Setting

If you have access to the running Redis instance (e.g., you're already connected or connecting locally without auth):

```bash
redis-cli CONFIG GET requirepass
```

This only works if the current connection is already authenticated or if Redis does not require auth for the connection.

### Check the Config File

```bash
sudo grep requirepass /etc/redis/redis.conf
# requirepass yourStrongPassword
```

### For Redis 6+ ACL

List users and their status:

```bash
redis-cli ACL LIST
```

```text
user default on #hashedpassword ~* &* +@all
user appuser on #hashedpassword ~app:* +@write +@read
```

Check if the user is enabled (`on`) or disabled (`off`).

## How to Fix

### Fix 1 - Update Application Credentials

Update your application configuration to use the correct password:

```python
import redis

# Use the correct password
r = redis.Redis(
    host='localhost',
    port=6379,
    password='correctPassword123!'
)
r.ping()
```

Use environment variables to avoid hardcoding:

```bash
export REDIS_PASSWORD="correctPassword123!"
```

### Fix 2 - Reset the Redis Password

If you have lost the password but have access to the server:

```bash
# Edit redis.conf
sudo nano /etc/redis/redis.conf
# Find: requirepass oldpassword
# Change to: requirepass newpassword

# Reload Redis config
sudo systemctl restart redis
# or
redis-cli CONFIG REWRITE
```

If you cannot authenticate to change via CONFIG SET, edit the file directly and restart Redis.

### Fix 3 - Fix Special Characters in Passwords

Passwords with special characters may need quoting in certain contexts:

In `redis.conf` (no quotes needed):
```text
requirepass myP@ssw0rd!#$
```

In redis-cli (quote if using special shell characters):
```bash
redis-cli -h localhost -a 'myP@ssw0rd!#$' PING
```

In Python:
```python
r = redis.Redis(password='myP@ssw0rd!#$')  # No escaping needed in Python strings
```

### Fix 4 - Fix ACL User Issues (Redis 6+)

If the user is disabled:

```bash
redis-cli ACL SETUSER appuser on
```

If the password needs to be reset:

```bash
redis-cli ACL SETUSER appuser on >newpassword123 ~* +@all
```

If you are using a username with the `AUTH` command:

```bash
redis-cli AUTH appuser newpassword123
```

### Fix 5 - Verify Connection Target

Ensure your application connects to the correct Redis instance:

```bash
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING
```

In Kubernetes, verify the Service name and namespace:

```bash
kubectl exec -it your-app-pod -- redis-cli -h redis-service -a $REDIS_PASSWORD PING
```

## Handling Authentication Errors in Code

### Python

```python
import redis
import os

def create_redis_client():
    r = redis.Redis(
        host=os.environ.get('REDIS_HOST', 'localhost'),
        port=int(os.environ.get('REDIS_PORT', 6379)),
        password=os.environ.get('REDIS_PASSWORD'),
        username=os.environ.get('REDIS_USERNAME', 'default')
    )
    try:
        r.ping()
        return r
    except redis.exceptions.AuthenticationError as e:
        raise RuntimeError(f"Redis authentication failed: {e}")
```

### Node.js

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME || 'default'
});

redis.on('error', (err) => {
  if (err.message.includes('WRONGPASS') || err.message.includes('ERR invalid password')) {
    console.error('Redis authentication failed - check credentials');
  }
});
```

## Summary

The "ERR invalid password" (or WRONGPASS in Redis 6+) error means the AUTH command was sent with wrong credentials. Fix it by verifying the password in `redis.conf` or ACL configuration, updating your application to use the correct credentials via environment variables, and checking that the user account is enabled in Redis 6+ ACL. Always store Redis passwords in environment variables or a secrets manager rather than in application source code.
