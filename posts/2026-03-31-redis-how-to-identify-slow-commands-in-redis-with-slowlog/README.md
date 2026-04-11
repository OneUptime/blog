# How to Identify Slow Commands in Redis with SLOWLOG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, SLOWLOG, Debugging, Monitoring

Description: Learn how to configure and use the Redis SLOWLOG to identify slow commands, analyze execution times, and fix performance bottlenecks in production.

---

## What Is the Redis SLOWLOG

The Redis SLOWLOG records commands that exceeded a configurable execution time threshold. It is stored in memory as a circular buffer (FIFO queue) and is one of the most useful tools for diagnosing performance problems without impacting production performance.

Unlike the MONITOR command (which affects performance), SLOWLOG has negligible overhead because it only records commands after they complete.

## Configuring SLOWLOG

Set the threshold in microseconds. Commands taking longer than this will be logged:
```bash
# Log commands taking longer than 10ms (10000 microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000

# Log everything (useful for short-term debugging)
redis-cli CONFIG SET slowlog-log-slower-than 0

# Disable slowlog
redis-cli CONFIG SET slowlog-log-slower-than -1
```

Set the maximum number of entries to keep:
```bash
redis-cli CONFIG SET slowlog-max-len 256
```

Persist these settings in `redis.conf`:
```text
slowlog-log-slower-than 10000
slowlog-max-len 256
```

## Reading the SLOWLOG

Get the most recent 10 slow entries:
```bash
redis-cli SLOWLOG GET 10
```

Sample output:
```text
1) 1) (integer) 42          # Entry ID
   2) (integer) 1711900800  # Unix timestamp
   3) (integer) 14523       # Execution time in microseconds
   4) 1) "KEYS"             # Command
      2) "user:*"           # Arguments
   5) "127.0.0.1:54321"     # Client address
   6) "myapp"               # Client name

2) 1) (integer) 41
   2) (integer) 1711900750
   3) (integer) 8901
   4) 1) "SMEMBERS"
      2) "all_users"
   5) "10.0.1.5:45678"
   6) "background-worker"
```

Get the total number of slow log entries recorded:
```bash
redis-cli SLOWLOG LEN
```

Reset (clear) the slowlog:
```bash
redis-cli SLOWLOG RESET
```

## Analyzing SLOWLOG Output

The third field is the execution time in **microseconds**. Key conversions:
- 1,000 us = 1 ms
- 10,000 us = 10 ms
- 100,000 us = 100 ms

Common slow commands and their fixes:

| Command | Why It's Slow | Fix |
|---------|---------------|-----|
| `KEYS pattern` | Scans entire keyspace | Use `SCAN` |
| `SMEMBERS key` | Returns all set members | Use `SSCAN` |
| `HGETALL key` | Returns all hash fields | Use `HSCAN` or fetch specific fields |
| `LRANGE 0 -1` | Returns all list elements | Paginate with fixed ranges |
| `SORT key` | Sorts large lists/sets | Add `LIMIT` or pre-sort on write |
| `DEBUG SLEEP` | Intentional sleep | Never run in production |

## Scripting SLOWLOG Analysis

Parse the slowlog programmatically with Python:
```python
import redis
from collections import Counter
from datetime import datetime

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

entries = r.slowlog_get(100)
command_counts = Counter()
command_times = {}

for entry in entries:
    parts = entry['command'].split()
    cmd = parts[0].upper()
    duration_ms = entry['duration'] / 1000
    command_counts[cmd] += 1
    command_times.setdefault(cmd, []).append(duration_ms)

    ts = datetime.fromtimestamp(entry['start_time'])
    args = ' '.join(parts[:3])
    print(f"[{ts}] {args} - {duration_ms:.1f}ms (client: {entry.get('client_address', 'N/A')})")

print("\n--- Summary by Command ---")
for cmd, count in command_counts.most_common():
    avg_ms = sum(command_times[cmd]) / len(command_times[cmd])
    max_ms = max(command_times[cmd])
    print(f"{cmd}: {count} slow calls, avg {avg_ms:.1f}ms, max {max_ms:.1f}ms")
```

## Periodic SLOWLOG Collection Script

Collect slowlog entries on a schedule and persist to a file for trend analysis:
```bash
#!/bin/bash
LOG_DIR=/var/log/redis
DATE=$(date +%Y%m%d_%H%M%S)
THRESHOLD=5  # only export if there are significant entries

count=$(redis-cli SLOWLOG LEN)
if [ "$count" -gt "$THRESHOLD" ]; then
    redis-cli SLOWLOG GET 50 > "${LOG_DIR}/slowlog_${DATE}.txt"
    redis-cli SLOWLOG RESET
    echo "Exported ${count} slowlog entries"
fi
```

Run it every 5 minutes via cron:
```text
*/5 * * * * /usr/local/bin/collect_slowlog.sh
```

## Setting Up Alerting on SLOWLOG Length

Use a simple monitoring script to alert when slowlog accumulates too many entries:
```python
import redis
import smtplib
from email.mime.text import MIMEText

def check_slowlog_alert(threshold=20):
    r = redis.StrictRedis(host='localhost', port=6379)
    length = r.slowlog_len()

    if length > threshold:
        entries = r.slowlog_get(10)
        worst = max(entries, key=lambda e: e['duration'])
        worst_cmd = worst['command'].split()[0]
        worst_ms = worst['duration'] / 1000

        msg = MIMEText(
            f"Redis SLOWLOG has {length} entries.\n"
            f"Worst command: {worst_cmd} ({worst_ms:.1f}ms)\n"
        )
        msg['Subject'] = f'Redis SLOWLOG Alert: {length} entries'
        msg['From'] = 'alerts@example.com'
        msg['To'] = 'team@example.com'

        with smtplib.SMTP('smtp.example.com') as server:
            server.send_message(msg)

check_slowlog_alert()
```

## Tips for Production SLOWLOG Usage

- Set `slowlog-log-slower-than` to 10,000 microseconds (10ms) as a starting point
- Lower to 1,000 microseconds during active debugging sessions
- Keep `slowlog-max-len` at 256 to avoid memory overhead
- Export and reset the slowlog periodically so you don't lose historical data
- Always check the client address in slow entries - it tells you which application is running the slow command

## Summary

The Redis SLOWLOG is a low-overhead tool for capturing commands that exceed a configurable time threshold. By setting an appropriate threshold, periodically exporting entries, and analyzing which commands appear most frequently, you can quickly identify and fix performance bottlenecks. The most common culprits are KEYS, SMEMBERS on large sets, and LRANGE without limits.
