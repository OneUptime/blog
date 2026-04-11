# How to Use AUTH in Redis to Authenticate Client Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Authentication, ACL, Command

Description: Learn how to use the AUTH command in Redis to authenticate client connections using passwords or ACL usernames, securing your Redis server from unauthorized access.

---

## What Is AUTH in Redis

`AUTH` authenticates a client connection to a Redis server. Without authentication, any client that can reach the Redis port has full access. `AUTH` supports both the legacy password-only mode and the modern ACL-based username+password mode introduced in Redis 6.0.

```text
AUTH password
AUTH username password
```

## Two Forms of AUTH

**Legacy mode (password only):**
```bash
AUTH mysecretpassword
```

This authenticates against the `requirepass` setting and the `default` user.

**ACL mode (username + password):**
```bash
AUTH alice alicepassword
```

This authenticates as a specific ACL user with their associated permissions.

## Setting Up Password Authentication

In `redis.conf`:
```text
requirepass mysecretpassword
```

Or at runtime:
```bash
CONFIG SET requirepass mysecretpassword
```

Then authenticate:
```bash
AUTH mysecretpassword
# OK

# Without auth:
SET key value
# NOAUTH Authentication required
```

## Setting Up ACL Users

```bash
# Create a user with a password
ACL SETUSER alice on >alicepassword ~user:* +@read +@write
ACL SETUSER readonly on >readpass ~* +@read

# Authenticate as alice
AUTH alice alicepassword
# OK

ACL WHOAMI
# "alice"
```

## Practical Example in Python

```python
import redis

# Password-only auth (legacy)
client = redis.Redis(
    host='localhost',
    port=6379,
    password='mysecretpassword',
    decode_responses=True
)

# Verify authentication
try:
    pong = client.ping()
    print(f"Connected: {pong}")
except redis.AuthenticationError as e:
    print(f"Auth failed: {e}")

# ACL user auth
acl_client = redis.Redis(
    host='localhost',
    port=6379,
    username='alice',
    password='alicepassword',
    decode_responses=True
)

user = acl_client.acl_whoami()
print(f"Authenticated as: {user}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

async function main() {
  // Password-only auth
  const client = createClient({
    socket: { host: 'localhost', port: 6379 },
    password: 'mysecretpassword'
  });

  await client.connect();
  console.log('Connected with password auth');

  // ACL user auth
  const aclClient = createClient({
    socket: { host: 'localhost', port: 6379 },
    username: 'alice',
    password: 'alicepassword'
  });

  await aclClient.connect();
  const user = await aclClient.aclWhoAmI();
  console.log(`Authenticated as: ${user}`);
}

main().catch(console.error);
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Password-only auth
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "mysecretpassword",
    })

    if err := rdb.Ping(ctx).Err(); err != nil {
        panic(err)
    }
    fmt.Println("Connected with password auth")

    // ACL user auth
    aclRdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Username: "alice",
        Password: "alicepassword",
    })

    user, err := aclRdb.ACLWhoAmI(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Authenticated as: %s\n", user)
}
```

## AUTH on Existing Connections

You can switch users on an existing connection by calling `AUTH` again:

```bash
# Connect as default
AUTH default defaultpassword

# Switch to another user
AUTH alice alicepassword

ACL WHOAMI
# "alice"
```

This is useful for testing different permission levels on the same connection.

## Connection String Authentication

```bash
# redis-cli with password
redis-cli -a mysecretpassword PING

# redis-cli with username and password
redis-cli -u redis://alice:alicepassword@localhost:6379 PING

# Using URL format in applications
redis://alice:alicepassword@localhost:6379/0
```

## Handling Authentication Errors

```python
import redis

def connect_with_retry(host, port, username, password, max_retries=3):
    for attempt in range(max_retries):
        try:
            client = redis.Redis(
                host=host,
                port=port,
                username=username,
                password=password,
                decode_responses=True,
                socket_connect_timeout=5
            )
            client.ping()
            print(f"Connected as '{client.acl_whoami()}'")
            return client
        except redis.AuthenticationError:
            print(f"Authentication failed (attempt {attempt + 1})")
        except redis.ConnectionError as e:
            print(f"Connection error: {e}")

    raise RuntimeError("Failed to connect after retries")

client = connect_with_retry('localhost', 6379, 'alice', 'alicepassword')
```

## AUTH with TLS

For secure connections, combine `AUTH` with TLS:

```python
import redis

client = redis.Redis(
    host='redis.example.com',
    port=6380,
    username='alice',
    password='alicepassword',
    ssl=True,
    ssl_certfile='/path/to/client.crt',
    ssl_keyfile='/path/to/client.key',
    ssl_ca_certs='/path/to/ca.crt',
    decode_responses=True
)

client.ping()
print("Authenticated over TLS")
```

## Security Best Practices

- Use strong, randomly generated passwords (32+ characters)
- Use ACL users instead of the shared `requirepass` approach
- Grant least-privilege permissions per user
- Store passwords in environment variables or secrets managers, not in code
- Enable TLS for connections over untrusted networks
- Regularly rotate passwords using `ACL SETUSER`

## Summary

`AUTH` authenticates Redis client connections using either a password alone (legacy mode) or a username and password (ACL mode). Use ACL-based authentication for fine-grained access control where different application components get different permissions. Always combine authentication with TLS in production and store credentials securely.
