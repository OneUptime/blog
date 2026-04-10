# How to Use RESP3 with the HELLO Command in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP3, Protocol, Client

Description: Learn how to use the Redis HELLO command to negotiate RESP3, inspect server capabilities, and enable modern protocol features in your client.

---

The `HELLO` command, introduced in Redis 6.0, lets clients negotiate the protocol version and authenticate in a single round trip. It is the gateway to using RESP3 and accessing server capability metadata.

## Basic HELLO Syntax

```bash
HELLO [protover [AUTH username password] [SETNAME clientname]]
```

Running `HELLO` without arguments returns current connection info:

```bash
127.0.0.1:6379> HELLO
 1) "server"
 2) "redis"
 3) "version"
 4) "7.2.0"
 5) "proto"
 6) (integer) 2
 7) "id"
 8) (integer) 12
 9) "mode"
10) "standalone"
11) "role"
12) "master"
13) "modules"
14) (empty array)
```

## Switching to RESP3

Send `HELLO 3` to upgrade the connection to RESP3:

```bash
127.0.0.1:6379> HELLO 3
1# "server" => "redis"
2# "version" => "7.2.0"
3# "proto" => (integer) 3
4# "id" => (integer) 12
5# "mode" => "standalone"
6# "role" => "master"
7# "modules" => (empty array)
```

Notice the response is now a map (`#` prefix), not an array - RESP3 is active.

## Using HELLO in Client Libraries

**Python (redis-py):**

```python
import redis

# Protocol 3 is set at connection time
r = redis.Redis(
    host="localhost",
    port=6379,
    protocol=3,
    decode_responses=True
)

# Verify protocol version
info = r.execute_command("HELLO")
print(info["proto"])  # 3
```

**Node.js (node-redis):**

```javascript
import { createClient } from "redis";

const client = createClient({
  url: "redis://localhost:6379",
  RESP: 3,
});

await client.connect();

const info = await client.HELLO();
console.log("Protocol:", info.proto); // 3
```

## Combining Auth and Protocol Upgrade

HELLO supports inline authentication, saving a round trip compared to sending AUTH and HELLO as separate commands:

```bash
# Upgrade to RESP3 and authenticate in one command
HELLO 3 AUTH default mypassword SETNAME my-app-worker
```

In Python:

```python
r = redis.Redis(
    host="localhost",
    port=6379,
    password="mypassword",
    protocol=3,
    client_name="my-app-worker"
)
```

## Reverting to RESP2

You can downgrade back to RESP2 on an existing connection:

```bash
HELLO 2
```

This is useful for testing compatibility or working with tooling that expects RESP2 responses.

## Checking Protocol Support Before Upgrading

If you are connecting to an older Redis that might not support RESP3, check the version first:

```python
import redis

def connect_with_best_protocol(host, port):
    r = redis.Redis(host=host, port=port)
    info = r.info("server")
    major = int(info["redis_version"].split(".")[0])

    if major >= 6:
        return redis.Redis(host=host, port=port, protocol=3)
    return r

client = connect_with_best_protocol("localhost", 6379)
```

## What Changes After HELLO 3

After upgrading with `HELLO 3`:

- `HGETALL` returns a dict directly, not a flat list
- `SMEMBERS` returns a set, not a list
- `CONFIG GET` returns a dict
- Server push messages (Pub/Sub, invalidations) use the push type `>`
- Boolean responses (e.g., from `SISMEMBER`) return Python `True`/`False` not `1`/`0`

## Summary

The `HELLO` command is the correct way to negotiate RESP3 in Redis 6.0+. It combines protocol upgrade, authentication, and client naming in one round trip. Modern client libraries expose this through a `protocol=3` parameter at connection time, making the upgrade transparent. After switching, you get native maps, sets, and push messages with no other code changes required.
