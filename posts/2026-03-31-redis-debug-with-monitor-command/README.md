# How to Debug Redis with MONITOR Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Monitor, Observability, Troubleshooting

Description: Use the Redis MONITOR command to stream all commands in real time for debugging unexpected behavior, tracing client activity, and identifying problematic queries.

---

`MONITOR` streams every command processed by Redis to your terminal in real time. It is the most direct way to see exactly what your application is sending to Redis - useful for debugging unexpected data changes, tracing which client is generating load, or verifying caching logic.

## Basic MONITOR Usage

```bash
redis-cli MONITOR
```

Output streams immediately:

```text
1743427200.123456 [0 127.0.0.1:52341] "SET" "user:42:name" "Alice"
1743427200.124001 [0 127.0.0.1:52341] "GET" "user:42:session"
1743427200.125023 [0 10.0.1.15:44821] "HSET" "cart:99" "item_id" "1234" "qty" "2"
1743427200.126100 [0 10.0.1.15:44821] "EXPIRE" "cart:99" "3600"
```

Each line shows: `timestamp [db client_ip:port] "COMMAND" "arg1" "arg2" ...`

## Filtering MONITOR Output

MONITOR produces a lot of noise in production. Filter with grep:

```bash
# Only watch SET commands
redis-cli MONITOR | grep '"SET"'

# Watch commands from a specific client IP
redis-cli MONITOR | grep "10.0.1.15"

# Watch for a specific key pattern
redis-cli MONITOR | grep '"user:42'

# Watch for slow pattern: multi-arg commands like HSET with many fields
redis-cli MONITOR | awk 'NF > 8'
```

## Counting Commands per Second

```bash
redis-cli MONITOR | pv -l -r > /dev/null
```

This shows the live command rate using `pv`. Install with `sudo apt-get install pv`.

## Recording a Session for Analysis

Capture MONITOR output to a file for offline analysis:

```bash
timeout 60 redis-cli MONITOR > /tmp/redis-monitor-$(date +%s).log
```

Analyze the capture:

```bash
# Top 10 most frequent commands
awk '{print $4}' /tmp/redis-monitor-*.log | sort | uniq -c | sort -rn | head -10

# Top 10 most accessed keys
awk '{print $5}' /tmp/redis-monitor-*.log | tr -d '"' | sort | uniq -c | sort -rn | head -10

# Commands by client IP
awk '{print $3}' /tmp/redis-monitor-*.log | tr -d '[]' | cut -d: -f1 | sort | uniq -c | sort -rn
```

## Using MONITOR in Python

```python
import redis
import time

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

def monitor_redis(duration_seconds=30):
    monitor = client.monitor()
    start = time.time()
    command_counts = {}

    with monitor:
        for command in monitor.listen():
            if time.time() - start > duration_seconds:
                break

            cmd = command.get("command", "").upper()
            command_counts[cmd] = command_counts.get(cmd, 0) + 1
            print(f"{command['time']:.3f} [{command['db']}] {command['command']}")

    print("\nCommand summary:")
    for cmd, count in sorted(command_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {cmd}: {count}")

monitor_redis(10)
```

## Performance Warning

MONITOR has a significant performance impact. Every command is replicated to all MONITOR clients. In high-throughput production environments:

- Use for no longer than a few minutes
- Run during off-peak hours if possible
- Limit the number of simultaneous MONITOR connections to 1

Check the current MONITOR load:

```bash
redis-cli INFO clients | grep monitor_clients
```

## Safer Alternative: Keyspace Notifications

For production tracing without MONITOR's overhead, use keyspace notifications:

```bash
redis-cli CONFIG SET notify-keyspace-events KEA
redis-cli SUBSCRIBE '__keyevent@0__:set'
```

This notifies you when SET commands occur without streaming all command arguments.

## Summary

MONITOR is the most powerful Redis debugging tool for understanding real-time client behavior. Filter its output with grep and awk to focus on specific clients, keys, or command types. For extended production tracing, capture output to a file and analyze offline. Always limit MONITOR session duration and use keyspace notifications for lower-overhead ongoing observability.
