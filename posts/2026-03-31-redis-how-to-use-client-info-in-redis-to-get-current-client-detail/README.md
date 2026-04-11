# How to Use CLIENT INFO in Redis to Get Current Client Details

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Monitoring, Command, Debugging

Description: Learn how to use CLIENT INFO in Redis to retrieve detailed information about the current client connection including flags, memory usage, and connection state.

---

## What Is CLIENT INFO

`CLIENT INFO` returns detailed information about the current client connection in the same format as `CLIENT LIST`, but only for the connection that issued the command. This is useful for inspecting your own connection's state, flags, memory usage, and name without filtering through all connected clients.

```text
CLIENT INFO
```

Available since Redis 6.2.0.

## Basic Usage

```bash
CLIENT INFO
```

Returns a single line with fields about the current connection:

```text
id=5 addr=127.0.0.1:54321 laddr=127.0.0.1:6379 fd=8 name=my-app age=42 idle=0 flags=N db=0 sub=0 psub=0 ssub=0 multi=-1 watch=0 qbuf=26 qbuf-free=20448 argv-mem=10 multi-mem=0 tot-mem=22298 rbs=16384 rbp=0 obl=0 oll=0 omem=0 events=r cmd=client|info user=default library-name= library-ver= resp=2
```

## Key Fields Explained

| Field | Description |
|-------|-------------|
| `id` | Unique client ID |
| `addr` | Client IP address and port |
| `name` | Client name set via `CLIENT SETNAME` |
| `age` | Seconds since connection was established |
| `idle` | Seconds since last command |
| `flags` | Client state flags |
| `db` | Current database index |
| `sub` | Number of channel subscriptions |
| `psub` | Number of pattern subscriptions |
| `multi` | Number of commands in MULTI queue (-1 if not in transaction) |
| `tot-mem` | Total memory consumed by this client |
| `cmd` | Last command executed |
| `user` | Current ACL username |
| `resp` | RESP protocol version |

## Client Flags Reference

| Flag | Meaning |
|------|---------|
| `N` | No specific flag set |
| `T` | CLIENT NO-TOUCH is set |
| `S` | Replica/slave connection |
| `M` | Master connection |
| `x` | In MULTI/EXEC block |
| `b` | Waiting for blocked command |
| `P` | Pub/Sub subscriber |

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set a name for this client
client.client_setname('my-python-app')

# Get current client info
info = client.client_info()
print("Current client details:")
for key, value in info.items():
    print(f"  {key}: {value}")
```

## Parsing CLIENT INFO Output

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def parse_client_info():
    """Parse CLIENT INFO into a structured dict."""
    raw = client.execute_command('CLIENT', 'INFO')

    # Parse key=value pairs
    result = {}
    for field in raw.strip().split():
        if '=' in field:
            key, _, value = field.partition('=')
            result[key] = value

    return result

info = parse_client_info()
print(f"Client ID: {info.get('id')}")
print(f"Address: {info.get('addr')}")
print(f"Current DB: {info.get('db')}")
print(f"Memory: {info.get('tot-mem')} bytes")
print(f"Last command: {info.get('cmd')}")
print(f"ACL user: {info.get('user')}")
print(f"RESP version: {info.get('resp')}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

async function main() {
  const client = createClient();
  await client.connect();

  // Name this client
  await client.clientSetName('my-node-app');

  // Get client info
  const info = await client.clientInfo();
  console.log('Client info:');
  console.log(info);

  await client.disconnect();
}

main();
```

## Monitoring Memory Usage

Use `CLIENT INFO` to check how much memory your connection is consuming:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_my_memory_usage():
    raw = client.execute_command('CLIENT', 'INFO')
    fields = dict(f.split('=', 1) for f in raw.strip().split() if '=' in f)
    tot_mem = int(fields.get('tot-mem', 0))
    return {
        'total_bytes': tot_mem,
        'total_kb': round(tot_mem / 1024, 2),
        'output_buffer': int(fields.get('omem', 0)),
        'query_buffer': int(fields.get('qbuf', 0)),
    }

mem = get_my_memory_usage()
print(f"My connection uses {mem['total_kb']} KB")
print(f"Output buffer: {mem['output_buffer']} bytes")
print(f"Query buffer: {mem['query_buffer']} bytes")
```

## Checking Subscription State

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# CLIENT INFO includes subscription counters for the current connection
raw = client.execute_command('CLIENT', 'INFO')
fields = dict(f.split('=', 1) for f in raw.strip().split() if '=' in f)
print(f"Channel subscriptions: {fields.get('sub', 0)}")
print(f"Pattern subscriptions: {fields.get('psub', 0)}")
print(f"Shard subscriptions: {fields.get('ssub', 0)}")

# Note: once a connection enters Pub/Sub mode, only subscription
# commands are allowed. Use CLIENT LIST from another connection
# to inspect a subscribing client's state.
```

## CLIENT INFO vs CLIENT LIST

| Feature | CLIENT INFO | CLIENT LIST |
|---------|-------------|-------------|
| Scope | Current client only | All clients |
| Format | Single line | Multi-line |
| Filters | None | ID, TYPE, USER |
| Permission needed | Any user | Usually admin |

Use `CLIENT INFO` when you want info about your own connection. Use `CLIENT LIST` for a server-wide view of all connections.

## Debug Connection Issues

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def debug_connection():
    """Print diagnostic info about the current connection."""
    raw = client.execute_command('CLIENT', 'INFO')
    fields = dict(f.split('=', 1) for f in raw.strip().split() if '=' in f)

    print("=== Connection Diagnostics ===")
    print(f"Client ID:    {fields.get('id')}")
    print(f"Address:      {fields.get('addr')}")
    print(f"Database:     {fields.get('db')}")
    print(f"Idle seconds: {fields.get('idle')}")
    print(f"Flags:        {fields.get('flags')}")
    print(f"ACL User:     {fields.get('user')}")
    print(f"Memory:       {fields.get('tot-mem')} bytes")
    print(f"Last cmd:     {fields.get('cmd')}")
    print(f"RESP version: {fields.get('resp')}")

debug_connection()
```

## Summary

`CLIENT INFO` returns detailed information about the current connection only, including its ID, memory usage, subscription counts, flags, and ACL user. It is the targeted alternative to `CLIENT LIST` when you only need details about your own connection. Use it for debugging connection state, monitoring memory consumption per client, and verifying authentication and subscription status.
