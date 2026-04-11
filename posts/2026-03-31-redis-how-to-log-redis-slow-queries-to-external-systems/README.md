# How to Log Redis Slow Queries to External Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Slow Log, Performance, Elasticsearch, Logging, Monitoring

Description: Export Redis slow log entries to external systems like Elasticsearch, Datadog, or a time-series database to monitor and alert on slow commands over time.

---

## The Redis Slow Log

Redis has a built-in slow log that records commands that exceed a configurable execution time threshold. It is stored in memory and holds a fixed number of recent entries.

### Configure the Slow Log

```bash
# Set threshold in microseconds (10ms = 10000 microseconds)
redis-cli CONFIG SET slowlog-log-slower-than 10000

# Set maximum number of entries to keep
redis-cli CONFIG SET slowlog-max-len 1000

# Or in redis.conf
# slowlog-log-slower-than 10000
# slowlog-max-len 1000
```

### View the Slow Log

```bash
# Show all slow log entries
redis-cli SLOWLOG GET

# Show last 10 entries
redis-cli SLOWLOG GET 10

# Count total entries
redis-cli SLOWLOG LEN

# Reset the slow log
redis-cli SLOWLOG RESET
```

A slow log entry looks like:

```text
1) 1) (integer) 42           # Entry ID
   2) (integer) 1743417600   # Unix timestamp
   3) (integer) 15234        # Execution time (microseconds)
   4) 1) "KEYS"              # Command
      2) "*"                 # Arguments
   5) "10.0.0.5:54321"       # Client address
   6) "myapp"                # Client name
```

## Exporting Slow Log to Elasticsearch

### Python Script to Poll and Ship

```python
import redis
import json
import time
from elasticsearch import Elasticsearch

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
es = Elasticsearch(['http://elasticsearch-host:9200'])

INDEX_NAME = 'redis-slowlog'
POLL_INTERVAL = 30  # seconds
last_id = -1

def get_new_slowlog_entries():
    global last_id
    entries = r.slowlog_get(100)
    new_entries = []
    for entry in entries:
        if entry['id'] > last_id:
            new_entries.append(entry)
    if new_entries:
        last_id = new_entries[0]['id']
    return new_entries

def ship_to_elasticsearch(entries):
    for entry in entries:
        doc = {
            '@timestamp': time.strftime(
                '%Y-%m-%dT%H:%M:%S.000Z',
                time.gmtime(entry['start_time'])
            ),
            'redis_slowlog_id': entry['id'],
            'duration_us': entry['duration'],
            'duration_ms': entry['duration'] / 1000,
            'command': ' '.join(str(a) for a in entry['command'])[:500],
            'client_addr': entry.get('client_address', ''),
            'client_name': entry.get('client_name', ''),
            'redis_host': r.connection_pool.connection_kwargs['host']
        }
        es.index(index=INDEX_NAME, body=doc)

while True:
    entries = get_new_slowlog_entries()
    if entries:
        ship_to_elasticsearch(entries)
        print(f"Shipped {len(entries)} slow log entries")
    time.sleep(POLL_INTERVAL)
```

### Elasticsearch Index Mapping

```bash
curl -X PUT "http://elasticsearch-host:9200/redis-slowlog" \
  -H "Content-Type: application/json" \
  -d '{
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "redis_slowlog_id": {"type": "long"},
        "duration_us": {"type": "long"},
        "duration_ms": {"type": "float"},
        "command": {"type": "text"},
        "client_addr": {"type": "keyword"},
        "client_name": {"type": "keyword"},
        "redis_host": {"type": "keyword"}
      }
    }
  }'
```

## Shipping Slow Logs to Datadog

```python
from datadog import initialize, statsd
import redis
import json
import time

initialize(api_key='YOUR_DATADOG_API_KEY')
r = redis.Redis()

last_id = -1

def poll_and_ship():
    global last_id
    entries = r.slowlog_get(100)
    for entry in entries:
        if entry['id'] <= last_id:
            continue
        # Send as a timing metric
        command_name = str(entry['command'][0]).upper() if entry['command'] else 'UNKNOWN'
        statsd.histogram(
            'redis.slowlog.duration',
            entry['duration'] / 1000,  # ms
            tags=[
                f'command:{command_name}',
                f'redis_host:localhost',
                f'client:{entry.get("client_address", "unknown")}'
            ]
        )
        # Also send as a log event
        print(json.dumps({
            'command': ' '.join(str(a) for a in entry['command'])[:200],
            'duration_ms': entry['duration'] / 1000,
            'client': entry.get('client_address', '')
        }))
    if entries:
        last_id = entries[0]['id']
```

## Telegraf Configuration for Slow Log Metrics

Telegraf's Redis input plugin collects slow log metrics automatically:

```toml
[[inputs.redis]]
  servers = ["tcp://localhost:6379"]
  # Telegraf automatically reads slowlog_length as a metric
```

Key metrics:
- `redis_slowlog_length` - current number of entries in slow log
- When combined with rate, shows how many slow queries occurred per interval

## Prometheus and Grafana Integration

redis_exporter exposes slow log metrics. Useful Grafana panel query:

```text
# Rate of slow log entries (new entries per minute)
rate(redis_slowlog_length[5m]) * 60
```

Create an alert for slow query spikes:

```yaml
- alert: RedisSlowQueriesIncreasing
  expr: increase(redis_slowlog_length[5m]) > 10
  for: 0m
  labels:
    severity: warning
  annotations:
    summary: "Redis slow log has {{ $value }} new entries in 5 minutes"
```

## Forwarding via Filebeat and Redis Log File

Configure Redis to log slow queries to a file by combining a custom log parser with Redis's standard log:

```python
#!/usr/bin/env python3
"""
redis-slowlog-exporter: polls Redis SLOWLOG and writes to a JSON log file
Run as a sidecar or systemd service alongside Redis
"""
import redis
import json
import time
import logging

logging.basicConfig(
    filename='/var/log/redis/slowlog.json',
    level=logging.INFO,
    format='%(message)s'
)

r = redis.Redis(host='localhost', port=6379)
last_id = -1

while True:
    try:
        entries = r.slowlog_get(50)
        for entry in reversed(entries):  # Process oldest first
            if entry['id'] <= last_id:
                continue
            record = {
                'timestamp': entry['start_time'],
                'id': entry['id'],
                'duration_us': entry['duration'],
                'command': ' '.join(str(a) for a in entry['command'])[:500],
                'client': entry.get('client_address', '')
            }
            logging.info(json.dumps(record))
        if entries:
            last_id = entries[0]['id']
    except redis.exceptions.ConnectionError as e:
        logging.error(f"Connection error: {e}")
    time.sleep(30)
```

Deploy as a systemd service and use Filebeat to ship `/var/log/redis/slowlog.json` to Elasticsearch or Splunk.

## Summary

Export Redis slow log entries to external systems by writing a polling script that calls `SLOWLOG GET`, tracks the last seen entry ID to avoid duplicates, and ships each entry to Elasticsearch, Datadog, or a log file processed by Filebeat. Set `slowlog-log-slower-than` to 10000 microseconds (10ms) as a starting point, monitor the slow log rate with Prometheus alerts, and investigate any command that appears repeatedly in the slow log.
