# How to Connect to Redis for the First Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection, Beginner, CLI, Client

Description: Learn how to connect to Redis for the first time using redis-cli and popular language clients - a beginner guide to your first Redis connection.

---

Once Redis is installed, the next step is connecting to it. This guide shows how to connect using the built-in CLI and from popular programming languages.

## Connecting with redis-cli

The simplest way to connect is with the built-in command-line tool:

```bash
# Connect to local Redis (default host and port)
redis-cli

# Connect to a specific host and port
redis-cli -h 127.0.0.1 -p 6379

# Connect to a remote server with password
redis-cli -h redis.myapp.com -p 6379 -a mypassword

# Connect with username and password (ACL)
redis-cli -h redis.myapp.com --user alice -a mypassword

# Test connection immediately
redis-cli ping
# PONG

# Run a command without entering interactive mode
redis-cli GET mykey
```

## Inside the redis-cli Shell

Once connected, you get an interactive prompt:

```bash
127.0.0.1:6379> PING
PONG

127.0.0.1:6379> SET name "Redis Learner"
OK

127.0.0.1:6379> GET name
"Redis Learner"

127.0.0.1:6379> DEL name
(integer) 1

# Quit the CLI
127.0.0.1:6379> QUIT
```

## Connecting from Python

```bash
pip install redis
```

```python
import redis

# Connect to local Redis
r = redis.Redis(host='127.0.0.1', port=6379, decode_responses=True)

# Test connection
r.ping()  # raises exception if it fails

# Basic set and get
r.set('name', 'Alice')
print(r.get('name'))  # Alice

# Connect with password
r = redis.Redis(host='redis.myapp.com', port=6379, password='secret', decode_responses=True)
```

## Connecting from Node.js

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');

// Connect to local Redis
const redis = new Redis();

// Connect to remote with auth
const remoteRedis = new Redis({
  host: 'redis.myapp.com',
  port: 6379,
  password: 'secret',
});

// Test connection
redis.ping().then(result => console.log(result)); // PONG

// Basic set and get
async function main() {
  await redis.set('name', 'Alice');
  const name = await redis.get('name');
  console.log(name); // Alice
}
main();
```

## Connecting from Go

```bash
go get github.com/redis/go-redis/v9
```

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr:     "127.0.0.1:6379",
        Password: "",
        DB:       0,
    })

    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Println(pong) // PONG

    rdb.Set(ctx, "name", "Alice", 0)
    val, _ := rdb.Get(ctx, "name").Result()
    fmt.Println(val) // Alice
}
```

## Connecting via Connection URL

Many clients support a Redis URL format:

```text
redis://127.0.0.1:6379
redis://user:password@redis.myapp.com:6379/0
rediss://user:password@redis.myapp.com:6380/0   (TLS)
```

```python
# Python
r = redis.from_url("redis://:password@redis.myapp.com:6379/0")
```

```javascript
// Node.js ioredis
const redis = new Redis("redis://:password@redis.myapp.com:6379/0");
```

## Troubleshooting Connection Issues

```bash
# Is Redis running?
redis-cli ping
# If you get "Could not connect", start Redis:
brew services start redis    # macOS
sudo systemctl start redis   # Linux

# Is the port open?
telnet 127.0.0.1 6379

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

## Summary

Redis connections start with redis-cli for local testing. In applications, use the official client for your language: redis-py for Python, ioredis or node-redis for Node.js, go-redis for Go. All clients support connection URLs for simple configuration. If connection fails, verify Redis is running with `redis-cli ping`.
