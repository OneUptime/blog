# How to Use Redis AUTH Command to Authenticate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AUTH, Security, Authentication, ACL

Description: Learn how to use the Redis AUTH command to authenticate a connection with a password or username and password, covering both legacy and ACL-based authentication modes.

---

## Overview

`AUTH` authenticates a Redis client connection. In Redis 5 and earlier, it accepts a single password matching `requirepass`. In Redis 6.0+, it accepts an optional username and password to authenticate against the ACL system. An unauthenticated connection to a server with authentication enabled returns `NOAUTH` errors on every command.

```mermaid
flowchart TD
    A[Client connects] --> B[Server requires authentication]
    B --> C{AUTH called?}
    C -- AUTH password --> D{Password matches default user?}
    C -- AUTH username password --> E{Username+password match ACL?}
    D -- Yes --> F[Authenticated as default user]
    D -- No --> G[WRONGPASS error]
    E -- Yes --> H[Authenticated as named user]
    E -- No --> G
    F --> I[Commands available per user permissions]
    H --> I
```

## Syntax

```redis
AUTH password
AUTH username password
```

The single-argument form authenticates against the `default` user. The two-argument form (Redis 6.0+) authenticates as a specific user.

## Single-Password Authentication (Legacy)

This form works when `requirepass` is set in `redis.conf`:

```redis
AUTH mypassword
```

```text
OK
```

### Wrong password

```redis
AUTH wrongpassword
```

```text
(error) WRONGPASS invalid username-password pair or user is disabled.
```

### No authentication configured

```redis
AUTH anypassword
```

```text
(error) ERR AUTH <password> called without any password configured for the default user. Are you sure your configuration is correct?
```

## Username and Password Authentication (Redis 6.0+)

With ACL users configured:

```redis
ACL SETUSER alice on >s3cr3t ~cache:* +@read
```

Authenticate as `alice`:

```redis
AUTH alice s3cr3t
```

```text
OK
```

Verify:

```redis
ACL WHOAMI
```

```text
"alice"
```

### Authenticate as the default user with two-argument form

```redis
AUTH default mypassword
```

```text
OK
```

## Using AUTH in redis-cli

### Inline flag

```bash
redis-cli -a mypassword PING
```

```text
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
PONG
```

### URI format with password only

```bash
redis-cli -u redis://:mypassword@127.0.0.1:6379 PING
```

### URI format with username and password

```bash
redis-cli -u redis://alice:s3cr3t@127.0.0.1:6379 PING
```

## Using AUTH in Application Code

### Python (redis-py)

```python
import redis

# Single password
r = redis.Redis(host='localhost', port=6379, password='mypassword')

# Username + password (Redis 6.0+)
r = redis.Redis(host='localhost', port=6379, username='alice', password='s3cr3t')

r.ping()
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');

// Single password
const redis = new Redis({ host: 'localhost', port: 6379, password: 'mypassword' });

// Username + password
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  username: 'alice',
  password: 's3cr3t',
});
```

## Re-authenticating an Existing Connection

`AUTH` can be called multiple times on the same connection to switch users:

```redis
AUTH alice s3cr3t
ACL WHOAMI
```

```text
"alice"
```

```redis
AUTH admin adminpass
ACL WHOAMI
```

```text
"admin"
```

## AUTH in RESP3 and Hello

With the `HELLO` command (Redis 6.0+), authentication can be combined with protocol negotiation:

```redis
HELLO 3 AUTH username password
```

## Security Considerations

- Do not pass passwords as command-line arguments in scripts; use environment variables or configuration files.
- Rate-limit authentication attempts at the network level. Redis processes `AUTH` very fast, enabling rapid brute-force attacks.
- Use strong, randomly generated passwords at least 32 characters long.

## Summary

`AUTH` authenticates a Redis connection using either a password alone (single-argument form, matching `requirepass`) or a username and password (two-argument form, matching ACL rules in Redis 6.0+). A successful call returns `OK` and the connection can then issue commands within the user's permissions. Failed authentication returns `WRONGPASS`. Always authenticate over encrypted connections (TLS) to prevent credential interception.
