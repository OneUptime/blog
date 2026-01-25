# How to Fix "Redis authentication failed" Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Authentication, Security, Troubleshooting, DevOps

Description: Learn how to diagnose and fix Redis authentication errors, configure password authentication properly, and implement secure access patterns for your Redis deployment.

---

The "NOAUTH Authentication required" or "ERR invalid password" errors indicate that your Redis client is not authenticating properly. These errors can appear suddenly after configuration changes, deployments, or when migrating to a new Redis instance. Let us walk through the diagnosis and resolution process.

## Understanding Redis Authentication

Redis supports two authentication mechanisms:

1. **Legacy AUTH** (Redis < 6.0) - Single password for all clients
2. **ACL system** (Redis 6.0+) - Username/password with granular permissions

```bash
# Check your Redis version
redis-cli INFO server | grep redis_version

# Common auth errors:
# NOAUTH Authentication required
# ERR invalid password
# WRONGPASS invalid username-password pair
# NOPERM this user has no permissions to run this command
```

## Quick Diagnostic Steps

### 1. Test Authentication Manually

```bash
# Try connecting without auth
redis-cli -h your-redis-host -p 6379 PING
# If you get NOAUTH error, authentication is required

# Try with password (legacy)
redis-cli -h your-redis-host -p 6379 -a your-password PING

# Try with username and password (ACL)
redis-cli -h your-redis-host -p 6379 --user your-username --pass your-password PING
```

### 2. Check Server Configuration

```bash
# Connect to Redis (if you have local access)
redis-cli

# Check if password is set (legacy)
CONFIG GET requirepass

# Check ACL configuration (Redis 6+)
ACL LIST
```

## Common Causes and Solutions

### 1. Password Not Provided in Client

The most common issue is simply not providing the password in your connection string.

**Python (redis-py):**

```python
import redis

# Wrong - no password
r = redis.Redis(host='redis-host', port=6379)

# Correct - with password
r = redis.Redis(
    host='redis-host',
    port=6379,
    password='your-secure-password'
)

# Correct - with username and password (Redis 6+)
r = redis.Redis(
    host='redis-host',
    port=6379,
    username='your-username',
    password='your-secure-password'
)

# Using URL format
r = redis.from_url('redis://:your-password@redis-host:6379/0')
# With username (Redis 6+)
r = redis.from_url('redis://username:password@redis-host:6379/0')
```

**Node.js (ioredis):**

```javascript
const Redis = require('ioredis');

// With password only
const redis = new Redis({
  host: 'redis-host',
  port: 6379,
  password: 'your-secure-password'
});

// With username and password (Redis 6+)
const redis = new Redis({
  host: 'redis-host',
  port: 6379,
  username: 'your-username',
  password: 'your-secure-password'
});

// Using URL
const redis = new Redis('redis://:password@redis-host:6379');
```

**Java (Jedis):**

```java
// With password
JedisPool pool = new JedisPool(
    new JedisPoolConfig(),
    "redis-host",
    6379,
    2000,  // timeout
    "your-secure-password"
);

// With username and password (Redis 6+)
JedisPool pool = new JedisPool(
    new JedisPoolConfig(),
    "redis-host",
    6379,
    2000,
    "your-username",
    "your-secure-password"
);
```

### 2. Wrong Password

If the password was recently changed or you are connecting to a different environment:

```bash
# Verify the password works
redis-cli -h redis-host -a 'your-password' PING

# If using special characters, quote the password
redis-cli -h redis-host -a 'p@ss!word#123' PING
```

Check your configuration files for the correct password:

```bash
# Check redis.conf
grep requirepass /etc/redis/redis.conf

# Check environment variables
echo $REDIS_PASSWORD

# Check Kubernetes secrets
kubectl get secret redis-secret -o jsonpath='{.data.password}' | base64 -d
```

### 3. ACL User Does Not Exist

With Redis 6+ ACLs, the username must exist:

```bash
# List all users
redis-cli ACL LIST

# Create a new user
redis-cli ACL SETUSER myapp on >mypassword ~* +@all

# Verify user can authenticate
redis-cli --user myapp --pass mypassword PING
```

### 4. ACL Permissions Issue

The user exists but lacks required permissions:

```bash
# Check user permissions
redis-cli ACL GETUSER myapp

# Grant full access (development only)
redis-cli ACL SETUSER myapp on >password ~* +@all

# Grant specific permissions (production)
redis-cli ACL SETUSER myapp on >password ~cache:* +get +set +del +expire

# Grant read-only access
redis-cli ACL SETUSER readonly on >readpass ~* +@read
```

### 5. SSL/TLS Certificate Issues

When using TLS, authentication can fail due to certificate problems:

```python
import redis
import ssl

# Python with SSL
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED

r = redis.Redis(
    host='redis-host',
    port=6379,
    password='your-password',
    ssl=True,
    ssl_cert_reqs='required',
    ssl_ca_certs='/path/to/ca.crt'
)
```

```javascript
// Node.js with TLS
const Redis = require('ioredis');
const fs = require('fs');

const redis = new Redis({
  host: 'redis-host',
  port: 6379,
  password: 'your-password',
  tls: {
    ca: fs.readFileSync('/path/to/ca.crt'),
    rejectUnauthorized: true
  }
});
```

## Setting Up Authentication Properly

### Legacy Password Authentication (Redis < 6.0)

```bash
# Set password in redis.conf
requirepass your-secure-password-here

# Or set at runtime (temporary until restart)
redis-cli CONFIG SET requirepass "your-secure-password-here"

# Persist the change
redis-cli CONFIG REWRITE
```

### ACL-Based Authentication (Redis 6.0+)

```bash
# Create users in redis.conf
# user default off
user admin on >adminpassword ~* +@all
user app on >apppassword ~app:* +@all -@dangerous
user readonly on >readpassword ~* +@read

# Or create at runtime
redis-cli ACL SETUSER admin on >adminpassword ~* +@all

# Save ACL to file
redis-cli ACL SAVE

# Load ACL from file
redis-cli ACL LOAD
```

### Example ACL Configuration File

Create `/etc/redis/users.acl`:

```
# Admin user with full access
user admin on >super-secret-admin-pass ~* &* +@all

# Application user with limited access
user webapp on >webapp-password ~cache:* ~session:* +get +set +del +expire +ttl

# Read-only monitoring user
user monitoring on >mon-password ~* +info +client +slowlog +latency

# Disable default user
user default off
```

Then in `redis.conf`:

```
aclfile /etc/redis/users.acl
```

## Handling Authentication in Different Environments

### Docker Compose

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    environment:
      - REDIS_PASSWORD=your-secure-password
    ports:
      - "6379:6379"

  app:
    build: .
    environment:
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - redis
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
type: Opaque
stringData:
  password: your-secure-password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: password
```

### AWS ElastiCache

For ElastiCache with auth token:

```python
import redis

# ElastiCache with TLS and auth
r = redis.Redis(
    host='your-cluster.xxxxx.use1.cache.amazonaws.com',
    port=6379,
    password='your-auth-token',
    ssl=True,
    ssl_cert_reqs='required'
)
```

## Troubleshooting Connection Strings

URL format variations:

```
# Basic with password
redis://:password@host:6379/0

# With username (Redis 6+)
redis://username:password@host:6379/0

# With TLS
rediss://:password@host:6379/0

# With special characters (URL encode them)
redis://:p%40ssw0rd%23123@host:6379/0
# Original password: p@ssw0rd#123
```

URL encoding reference for common special characters:

```
@ = %40
# = %23
! = %21
$ = %24
% = %25
& = %26
/ = %2F
: = %3A
```

## Security Best Practices

1. **Use strong passwords** - At least 32 characters, randomly generated

2. **Enable TLS** - Encrypt traffic between client and server

3. **Use ACLs** - Granular permissions per user/application

4. **Rotate passwords** - Update credentials periodically

5. **Bind to specific interfaces** - Do not expose Redis to public internet

```bash
# Generate a strong password
openssl rand -base64 32

# In redis.conf
bind 10.0.1.50 127.0.0.1
protected-mode yes
requirepass your-long-random-password
```

---

Authentication errors are usually straightforward to fix once you understand what Redis expects. Start by verifying your password works with redis-cli, then ensure your client is configured correctly. For production systems, use the ACL system in Redis 6+ for granular access control and always enable TLS to protect credentials in transit.
