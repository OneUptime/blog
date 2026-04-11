# How to Debug Redis with CLIENT LIST

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLIENT LIST, Debugging, Connection Management, Performance, Monitoring

Description: Use Redis CLIENT LIST command to inspect active connections, identify blocked or idle clients, track memory usage per connection, and diagnose connection leaks.

---

## What Is CLIENT LIST?

`CLIENT LIST` returns a line-by-line description of every client currently connected to Redis. Each line contains dozens of fields describing the connection state, the last command executed, memory usage, and more.

It is invaluable for diagnosing:
- Connection leaks (too many connections from one host)
- Blocked clients (BLPOP, WAIT)
- Clients running expensive commands
- Memory usage per connection
- Idle connections that should be closed

## Basic Usage

```bash
# List all connected clients
redis-cli CLIENT LIST

# Filter by type (normal, master, replica, pubsub)
redis-cli CLIENT LIST TYPE normal

# Get info about the current client connection
redis-cli CLIENT INFO
```

Sample output:

```text
id=5 addr=127.0.0.1:54321 laddr=127.0.0.1:6379 fd=12 name=worker-1 age=120 idle=0 flags=N db=0 sub=0 psub=0 multi=-1 watch=0 qbuf=0 qbuf-free=40954 argv-mem=10 multi-mem=0 tot-mem=61466 rbs=16384 rbp=0 obl=0 oll=0 omem=0 events=r cmd=get user=appuser library-name= library-ver= resp=2
```

## Key Fields Explained

| Field | Meaning |
|-------|---------|
| `id` | Unique client ID |
| `addr` | Client IP:port |
| `fd` | File descriptor |
| `name` | Client name (set with CLIENT SETNAME) |
| `age` | Connection age in seconds |
| `idle` | Seconds since last command |
| `flags` | Client state flags (N=normal, b=blocked, S=slave) |
| `db` | Currently selected database |
| `sub` | Number of channel subscriptions |
| `cmd` | Last executed command |
| `tot-mem` | Total memory used by this client |
| `omem` | Output buffer memory |
| `multi` | Commands queued in MULTI transaction (-1 = none) |

## Naming Clients for Better Debugging

Set meaningful names in your application to make CLIENT LIST output more readable:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Set a meaningful name for this connection
r.client_setname('api-server-worker-3')

# Verify
print(r.client_getname())  # 'api-server-worker-3'
```

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  connectionName: 'api-server-worker-3',  // auto-set on connect
});
```

## Detecting Connection Leaks

```python
import redis
import collections

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def detect_connection_leaks(max_per_host=50):
    client_list = r.client_list()
    connections_by_host = collections.Counter()

    for client in client_list:
        addr = client.get('addr', '')
        host = addr.rsplit(':', 1)[0] if ':' in addr else addr
        connections_by_host[host] += 1

    print(f"Total connections: {len(client_list)}")
    print("\nConnections per host:")
    for host, count in connections_by_host.most_common(10):
        status = " - POSSIBLE LEAK" if count > max_per_host else ""
        print(f"  {host}: {count}{status}")

detect_connection_leaks()
```

## Finding Blocked Clients

Blocked clients (waiting on BLPOP, BRPOP, WAIT, etc.) are indicated by the `b` flag:

```bash
# Show only blocked clients
redis-cli CLIENT LIST | grep "flags=.*b"
```

```python
def find_blocked_clients():
    clients = r.client_list()
    blocked = [c for c in clients if 'b' in c.get('flags', '')]

    if blocked:
        print(f"Found {len(blocked)} blocked client(s):")
        for c in blocked:
            print(f"  ID={c['id']} addr={c['addr']} idle={c['idle']}s cmd={c['cmd']}")
    else:
        print("No blocked clients")
```

## Finding High-Memory Clients

```python
def find_high_memory_clients(threshold_kb=100):
    clients = r.client_list()
    high_mem = [
        c for c in clients
        if int(c.get('tot-mem', 0)) > threshold_kb * 1024
    ]

    high_mem.sort(key=lambda c: int(c.get('tot-mem', 0)), reverse=True)
    print(f"Clients using >{threshold_kb}KB memory:")
    for c in high_mem:
        mem_kb = int(c.get('tot-mem', 0)) / 1024
        print(f"  ID={c['id']} name={c.get('name','')} mem={mem_kb:.1f}KB cmd={c['cmd']}")
```

## Killing Problematic Connections

```bash
# Kill a specific client by ID
redis-cli CLIENT KILL ID 42

# Kill all clients from a specific address
redis-cli CLIENT KILL ADDR 10.0.0.5:54321

# Kill all clients connected for more than 300 seconds
redis-cli CLIENT KILL MAXAGE 300
```

```python
def kill_idle_clients(idle_threshold_seconds=600):
    clients = r.client_list()
    killed = 0

    for c in clients:
        if int(c.get('idle', 0)) > idle_threshold_seconds:
            try:
                r.client_kill_filter(_id=int(c['id']))
                print(f"Killed idle client {c['id']} (idle {c['idle']}s from {c['addr']})")
                killed += 1
            except Exception as e:
                print(f"Could not kill client {c['id']}: {e}")

    print(f"Killed {killed} idle client(s)")
```

## Summary

`CLIENT LIST` gives you a real-time view of every connection to your Redis server. Use it regularly in production to detect connection leaks, identify blocked or idle clients, and investigate memory usage per connection. Set meaningful client names in your application code so the output is immediately actionable. Combined with `CLIENT KILL`, you can surgically remove problematic connections without restarting Redis.
