# How to Scale Redis with Connection Proxies (Twemproxy)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Twemproxy, Proxy, Sharding, Scalability

Description: Use Twemproxy (nutcracker) as a Redis connection proxy to multiplex thousands of client connections and transparently shard data across multiple Redis instances.

---

Twemproxy (also called nutcracker) is a fast, lightweight proxy for Redis and Memcached. It sits between your application and Redis nodes, handling connection multiplexing and automatic key sharding without any changes to your application code.

## Why Use Twemproxy

- Reduces connection overhead: Twemproxy maintains a small pool of connections to Redis while serving thousands of application connections
- Transparent sharding: your app connects to one endpoint; Twemproxy routes keys to the correct backend
- Consistent hashing by default: adding/removing backends remaps minimal keys

## Installing Twemproxy

```bash
# Ubuntu/Debian
sudo apt-get install -y autoconf automake libtool build-essential

git clone https://github.com/twitter/twemproxy.git
cd twemproxy
autoreconf -fvi
./configure
make
sudo make install
```

## Configuration File

Create `/etc/twemproxy/nutcracker.yml`:

```text
redis_pool:
  listen: 0.0.0.0:22121
  hash: fnv1a_64
  hash_tag: "{}"
  distribution: ketama
  auto_eject_hosts: true
  redis: true
  server_retry_timeout: 30000
  server_failure_limit: 3
  servers:
    - 127.0.0.1:6379:1 redis-shard-0
    - 127.0.0.1:6380:1 redis-shard-1
    - 127.0.0.1:6381:1 redis-shard-2
```

Key settings:
- `distribution: ketama` - consistent hashing to minimize remapping on topology changes
- `auto_eject_hosts: true` - automatically remove failing backends
- `server_failure_limit: 3` - eject after 3 consecutive failures

## Starting Twemproxy

```bash
nutcracker -c /etc/twemproxy/nutcracker.yml -d -o /var/log/nutcracker.log
```

Verify it is running:

```bash
redis-cli -p 22121 PING
# Expected: PONG
```

## Connecting Your Application

Your application connects to Twemproxy as if it were a single Redis instance:

```python
import redis

# Connect to Twemproxy, not directly to Redis
client = redis.Redis(host="localhost", port=22121, decode_responses=True)

client.set("user:42:name", "Alice")
value = client.get("user:42:name")
print(value)  # Alice
```

## Enabling the Stats Endpoint

Twemproxy exposes a stats port for monitoring. The stats port and interval are configured via command-line flags (default port is 22222):

```bash
nutcracker -c /etc/twemproxy/nutcracker.yml -s 22222 -i 30000
```

Query stats:

```bash
curl -s http://localhost:22222 | python3 -m json.tool | grep -E "requests|connections|errors"
```

## Limitations to Know

Twemproxy supports multi-key commands like MGET and MSET through command fragmentation - it splits them across backends and reassembles the results (note that MSET is not atomic across shards). However, commands that operate across keys like RENAME, SDIFF, SINTER, SUNION, and ZUNIONSTORE are not supported unless all keys reside on the same backend. Use hash tags `{prefix}` to colocate related keys:

```python
# Both keys go to the same shard because of the hash tag
client.set("{user:42}:name", "Alice")
client.set("{user:42}:email", "alice@example.com")
```

Note: Twemproxy does not support Redis Cluster mode, Pub/Sub, or SUBSCRIBE commands.

## Summary

Twemproxy provides transparent Redis sharding and connection multiplexing with minimal application changes. It is well-suited for high-connection-count workloads where you want to reduce the connection pressure on your Redis backends. Its consistent hashing (ketama) distribution minimizes cache churn when backends are added or removed, making it a practical proxy for stable, read-heavy deployments.
