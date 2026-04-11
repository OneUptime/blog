# How to Secure Redis with a Password (Beginner Guide)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Password, Authentication, Requirepass, Beginner

Description: Learn how to secure your Redis instance with a password using requirepass, ACL users, and network binding for basic security hardening.

---

## Why Redis Needs a Password

By default, Redis has no authentication. While Redis 7.0+ binds to localhost by default and protected mode (since Redis 3.2) limits unauthenticated remote access, anyone who can reach your Redis port can still read, modify, or delete all your data without a password. Setting a password is the first and most important security step.

## Setting a Password in redis.conf

Open `/etc/redis/redis.conf` and set the `requirepass` directive:

```text
requirepass your-strong-password-here
```

Generate a strong password:

```bash
openssl rand -base64 32
# Example output: xK9mP2nQvR8sT4uW6yZ0aB3cD5eF7gH=
```

Apply the password without restarting:

```bash
redis-cli CONFIG SET requirepass "your-strong-password-here"
```

Verify by saving to disk:

```bash
redis-cli -a "your-strong-password-here" CONFIG REWRITE
```

## Authenticating with the Password

After setting `requirepass`, all clients must authenticate before any commands work:

```bash
# In redis-cli, authenticate after connecting
redis-cli
> AUTH your-strong-password-here
# OK

# Or provide password directly on the command line
redis-cli -a "your-strong-password-here" PING
# PONG

# Using a URL
redis-cli -u "redis://:your-strong-password-here@localhost:6379" PING
```

## Connecting with a Password in Code

Python:

```python
import redis

r = redis.Redis(
    host='localhost',
    port=6379,
    password='your-strong-password-here',
    decode_responses=True
)

r.ping()  # raises AuthenticationError if password is wrong
```

Node.js:

```javascript
const redis = require('redis');

const client = redis.createClient({
  url: 'redis://:your-strong-password-here@localhost:6379'
});

// Or using the password option
const client2 = redis.createClient({
  socket: { host: 'localhost', port: 6379 },
  password: 'your-strong-password-here'
});
```

## Binding to Localhost Only

A password is not enough if Redis is reachable from the public internet. Bind Redis to localhost:

```text
# redis.conf
bind 127.0.0.1 ::1
```

Or bind to a specific private IP:

```text
bind 127.0.0.1 10.0.0.5
```

Restart Redis for binding changes to take effect:

```bash
sudo systemctl restart redis
```

## Disabling Dangerous Commands

Rename or disable commands that could be used to damage your data:

```text
# redis.conf - rename FLUSHALL to an empty string to disable it
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN SHUTDOWN_SECRET_TOKEN
```

## Using ACL (Redis 6+)

Modern Redis uses Access Control Lists (ACL) for fine-grained user permissions. The default user `default` is equivalent to the `requirepass` password:

```bash
# Create a read-only user
redis-cli ACL SETUSER readonly on >readonlypass ~* &* +@read

# Create a full-access user
redis-cli ACL SETUSER appuser on >apppassword ~* &* +@all

# Disable the default unauthenticated user
redis-cli ACL SETUSER default off

# List all users
redis-cli ACL LIST
```

Connect as a specific user:

```bash
redis-cli --user appuser --pass apppassword PING
```

```python
r = redis.Redis(
    host='localhost',
    port=6379,
    username='appuser',
    password='apppassword',
    decode_responses=True
)
```

## Firewall Rules

Block external access at the network level using `ufw` or `iptables`:

```bash
# Allow Redis only from your application server (10.0.0.5)
sudo ufw allow from 10.0.0.5 to any port 6379

# Deny all other access to Redis port
sudo ufw deny 6379
```

## Verifying Security

```bash
# Try connecting without a password - should fail
redis-cli PING
# NOAUTH Authentication required.

# Check who is connected
redis-cli -a "password" CLIENT LIST

# Check config (confirm requirepass is set)
redis-cli -a "password" CONFIG GET requirepass
```

## Security Checklist

```text
[ ] requirepass set with a strong random password
[ ] bind set to 127.0.0.1 or private IP (not 0.0.0.0)
[ ] Firewall rules blocking port 6379 from public internet
[ ] Dangerous commands renamed or disabled
[ ] TLS enabled for remote connections
[ ] Redis running as a non-root user
[ ] Protected-mode enabled (default in Redis 3.2+)
```

## Summary

Securing Redis starts with setting a strong password via `requirepass` and binding to `127.0.0.1` to prevent external connections. For production environments, use Redis ACL to create least-privilege users for each application, disable dangerous commands with `rename-command`, and add firewall rules as a defense-in-depth measure. Never expose Redis directly to the public internet.
