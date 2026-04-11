# How to Monitor Redis Slow Log Trends Over Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SLOWLOG, Monitoring, Performance, Trend

Description: Learn how to collect, store, and analyze Redis SLOWLOG data over time to identify recurring slow commands and performance degradation patterns.

---

## Why Trend Analysis Matters

A single SLOWLOG snapshot shows you current slow commands, but it doesn't tell you whether the problem is getting worse, whether it's periodic, or which commands are consistently slow vs. occasionally slow. Trend analysis over time reveals patterns that point-in-time snapshots miss.

## The Challenge with SLOWLOG

Redis SLOWLOG is a circular buffer in memory. Once it fills to `slowlog-max-len` entries, the oldest entries are discarded. If you don't export regularly, you lose historical data.

Strategy:
1. Set a low threshold (e.g., 10ms) to capture meaningful slow operations
2. Export the slowlog every minute
3. Store in a persistent time-series store (Prometheus, InfluxDB, PostgreSQL)
4. Reset after export

## Setting Up the Collector

```python
import redis
import psycopg2
import time
import json
from datetime import datetime

# Connect to Redis and PostgreSQL
r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)
pg = psycopg2.connect("host=localhost dbname=metrics user=postgres password=secret")

# Create table if not exists
with pg.cursor() as cur:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS redis_slowlog (
            id BIGSERIAL PRIMARY KEY,
            redis_entry_id BIGINT,
            timestamp TIMESTAMPTZ NOT NULL,
            duration_us BIGINT NOT NULL,
            command TEXT NOT NULL,
            args TEXT,
            client_addr TEXT,
            client_name TEXT,
            collected_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_slowlog_ts ON redis_slowlog(timestamp)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_slowlog_cmd ON redis_slowlog(command)")
    pg.commit()

last_seen_id = None

def collect_slowlog():
    global last_seen_id

    entries = r.slowlog_get(128)
    if not entries:
        return 0

    new_entries = 0
    cursor = pg.cursor()

    for entry in entries:
        entry_id = entry['id']
        if last_seen_id is not None and entry_id <= last_seen_id:
            continue

        ts = datetime.fromtimestamp(entry['start_time'])
        duration_us = entry['duration']
        command_parts = entry['command'].split()
        command = command_parts[0].upper() if command_parts else 'UNKNOWN'
        args = json.dumps(command_parts[1:4])  # first 3 args
        client_addr = entry.get('client_address', '')
        client_name = entry.get('client_name', '')

        cursor.execute("""
            INSERT INTO redis_slowlog (redis_entry_id, timestamp, duration_us, command, args, client_addr, client_name)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (entry_id, ts, duration_us, command, args, client_addr, client_name))
        new_entries += 1

    if entries:
        last_seen_id = entries[0]['id']

    pg.commit()
    cursor.close()
    return new_entries

# Run every 30 seconds
print("Starting slowlog collector...")
while True:
    try:
        count = collect_slowlog()
        if count > 0:
            print(f"{datetime.now()}: Collected {count} new slowlog entries")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(30)
```

## Querying Trends in PostgreSQL

Top slow commands in the last 24 hours:
```sql
SELECT
    command,
    COUNT(*) as occurrences,
    AVG(duration_us) / 1000.0 as avg_ms,
    MAX(duration_us) / 1000.0 as max_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_us) / 1000.0 as p95_ms
FROM redis_slowlog
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY command
ORDER BY occurrences DESC;
```

Slow command rate per hour:
```sql
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    command,
    COUNT(*) as count,
    AVG(duration_us) / 1000.0 as avg_ms
FROM redis_slowlog
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY hour, command
ORDER BY hour DESC, count DESC;
```

Clients generating the most slow queries:
```sql
SELECT
    client_addr,
    client_name,
    COUNT(*) as slow_query_count,
    AVG(duration_us) / 1000.0 as avg_ms
FROM redis_slowlog
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY client_addr, client_name
ORDER BY slow_query_count DESC
LIMIT 20;
```

## Forwarding to Prometheus

If you use Prometheus, redis_exporter exposes a `redis_slowlog_length` metric. Create a recording rule to track the rate:

```yaml
# prometheus/rules/redis.yml
groups:
  - name: redis_slowlog
    interval: 1m
    rules:
      - record: redis:slowlog_entries:rate5m
        expr: rate(redis_slowlog_last_id[5m])

      - alert: RedisSlowlogGrowing
        expr: redis_slowlog_length > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis slowlog has {{ $value }} entries - slow commands detected"
```

## Grafana Dashboard for Slow Log Trends

Create a time series panel with:
```text
# Slowlog entry rate
rate(redis_slowlog_last_id[5m]) * 60
```

And a table panel querying PostgreSQL (via Grafana PostgreSQL datasource):
```sql
SELECT
    $__timeGroup(timestamp, $__interval) as time,
    command,
    COUNT(*) as count
FROM redis_slowlog
WHERE $__timeFilter(timestamp)
GROUP BY time, command
ORDER BY time
```

## Alerting on Sustained Slow Commands

Set up an alert when the slow command rate exceeds a threshold over a sustained period:
```python
import redis
import smtplib
from email.mime.text import MIMEText
from collections import Counter
import time

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def get_slowlog_summary(minutes=5):
    entries = r.slowlog_get(200)
    cutoff = time.time() - (minutes * 60)
    recent = [e for e in entries if e['start_time'] >= cutoff]

    if not recent:
        return None

    counts = Counter(e['command'].split()[0].upper() for e in recent)
    return {
        'count': len(recent),
        'top_commands': counts.most_common(5),
        'max_duration_ms': max(e['duration'] for e in recent) / 1000
    }

summary = get_slowlog_summary(minutes=5)
if summary and summary['count'] > 20:
    print(f"ALERT: {summary['count']} slow commands in last 5 minutes")
    print(f"Top commands: {summary['top_commands']}")
    print(f"Max duration: {summary['max_duration_ms']:.1f}ms")
```

## Summary

Monitoring Redis SLOWLOG trends requires periodic export to a persistent store since the in-memory circular buffer loses historical data. Collect slowlog entries every 30-60 seconds, store in PostgreSQL or InfluxDB, and query for hourly trends, top offending commands, and client sources. Use Grafana to visualize the trend over time and alert when the slow command rate spikes above your baseline.
