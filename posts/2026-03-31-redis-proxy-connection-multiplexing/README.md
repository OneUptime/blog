# How to Build a Redis Proxy for Connection Multiplexing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Proxy, Connection Pooling

Description: Learn how to build and configure a Redis proxy for connection multiplexing using Twemproxy, Envoy, and a custom Python proxy to reduce connection overhead at scale.

---

Redis has a single-threaded connection handler. With hundreds of application instances each maintaining their own connection pool, you can exhaust Redis's connection limit. A proxy sits between clients and Redis, multiplexing thousands of client connections into a small pool of server connections.

## Why Connection Multiplexing

- Redis default max connections: 10,000 (`maxclients`)
- Each connection uses ~20 KB of memory
- 500 app pods x 20 connections = 10,000 connections
- A proxy reduces server-side connections to 50-100

## Option 1: Twemproxy (nutcracker)

Twemproxy is a lightweight Redis proxy with connection multiplexing and sharding.

```bash
# Install Twemproxy
sudo apt install nutcracker -y
```

```yaml
# /etc/nutcracker/nutcracker.yml
redis_pool:
  listen: 127.0.0.1:22121
  hash: fnv1a_64
  distribution: ketama
  auto_eject_hosts: true
  redis: true
  server_retry_timeout: 2000
  server_failure_limit: 1
  servers:
    - 127.0.0.1:6379:1
```

```bash
nutcracker -c /etc/nutcracker/nutcracker.yml -d
redis-cli -p 22121 set foo bar
redis-cli -p 22121 get foo
```

## Option 2: Envoy Proxy with Redis Filter

Envoy supports a Redis protocol filter for routing and observability:

```yaml
# envoy.yaml
static_resources:
  listeners:
    - name: redis_listener
      address:
        socket_address: { address: 0.0.0.0, port_value: 6380 }
      filter_chains:
        - filters:
            - name: envoy.filters.network.redis_proxy
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.redis_proxy.v3.RedisProxy
                stat_prefix: redis
                settings:
                  op_timeout: 5s
                prefix_routes:
                  catch_all_route:
                    cluster: redis_cluster
  clusters:
    - name: redis_cluster
      type: STATIC
      connect_timeout: 1s
      load_assignment:
        cluster_name: redis_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address: { address: 127.0.0.1, port_value: 6379 }
```

## Option 3: Minimal Python Multiplexing Proxy

```python
import asyncio
import redis.asyncio as aioredis

PROXY_HOST = '127.0.0.1'
PROXY_PORT = 6381
REDIS_HOST = '127.0.0.1'
REDIS_PORT = 6379

# Shared connection pool - all clients multiplex over these connections
pool = aioredis.ConnectionPool.from_url(
    f"redis://{REDIS_HOST}:{REDIS_PORT}",
    max_connections=20,
    decode_responses=False
)

def parse_resp(data: bytes):
    """Parse a RESP protocol message into command arguments."""
    lines = data.split(b"\r\n")
    if not lines[0].startswith(b"*"):
        # Inline command (e.g., PING)
        return data.strip().split()
    count = int(lines[0][1:])
    args, idx = [], 1
    for _ in range(count):
        idx += 1  # skip $<length>
        args.append(lines[idx])
        idx += 1
    return args

def encode_resp(value):
    """Encode a Python value as a RESP protocol response."""
    if value is None:
        return b"$-1\r\n"
    if isinstance(value, bool):
        return b"+OK\r\n" if value else b"$-1\r\n"
    if isinstance(value, int):
        return b":" + str(value).encode() + b"\r\n"
    if isinstance(value, bytes):
        return b"$" + str(len(value)).encode() + b"\r\n" + value + b"\r\n"
    if isinstance(value, list):
        parts = [b"*" + str(len(value)).encode() + b"\r\n"]
        for item in value:
            parts.append(encode_resp(item))
        return b"".join(parts)
    return b"+" + str(value).encode() + b"\r\n"

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    redis_client = aioredis.Redis(connection_pool=pool)
    try:
        while True:
            data = await reader.read(4096)
            if not data:
                break
            # Parse the RESP command and forward to Redis via shared pool
            args = parse_resp(data)
            if not args:
                continue
            try:
                result = await redis_client.execute_command(*args)
                writer.write(encode_resp(result))
            except Exception as e:
                writer.write(b"-ERR " + str(e).encode() + b"\r\n")
            await writer.drain()
    finally:
        writer.close()
        await redis_client.aclose()

async def main():
    server = await asyncio.start_server(handle_client, PROXY_HOST, PROXY_PORT)
    print(f"Proxy listening on {PROXY_HOST}:{PROXY_PORT}")
    async with server:
        await server.serve_forever()

asyncio.run(main())
```

## Monitor Connections

```bash
# Check current Redis connections
redis-cli INFO clients | grep connected_clients

# Watch connection count in real time
watch -n1 "redis-cli INFO clients | grep connected_clients"

# List all connected clients
redis-cli CLIENT LIST
```

## Configure Redis Max Connections

```bash
redis-cli CONFIG SET maxclients 1000
redis-cli CONFIG GET maxclients
```

## Summary

Connection multiplexing reduces Redis server-side connection count by routing many client connections through a small proxy pool. Twemproxy is a battle-tested option for simple sharding and multiplexing. Envoy provides protocol-aware routing with rich observability. For production deployments with hundreds of application pods, a proxy layer is essential to avoid exhausting Redis's connection limit.
