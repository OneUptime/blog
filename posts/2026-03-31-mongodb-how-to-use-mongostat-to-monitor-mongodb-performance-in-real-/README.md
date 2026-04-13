# How to Use mongostat to Monitor MongoDB Performance in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongostat, Monitoring, Performance

Description: Learn how to use mongostat for real-time MongoDB performance monitoring, interpreting key metrics, setting thresholds, and integrating with alerting systems.

---

## Overview

`mongostat` is a command-line tool that provides a continuous stream of MongoDB server statistics, refreshing at configurable intervals. It is modeled after the Unix `vmstat` command and gives you an instant view of operations per second, cache utilization, connection counts, and more. This guide focuses on using mongostat effectively for performance monitoring and alerting.

## Starting mongostat

```bash
# Basic usage - refresh every 1 second
mongostat

# Custom interval (5 seconds)
mongostat 5

# With authentication
mongostat --uri "mongodb://admin:secret@localhost:27017/admin"

# Limit output to a specific number of rows then exit
mongostat --rowcount 60 1   # 60 samples, 1 second apart = 1 minute of data
```

## Reading the Output

```text
insert query update delete getmore command dirty  used flushes vsize   res qrw arw net_in net_out conn
    *0    *0     *0     *0       0     2|0  0.0% 50.1%       0 1.57G 1.02G 0|0 0|0   158b   62.4k   10
     5   123      8      1       0    45|0  0.1% 50.3%       0 1.57G 1.02G 0|0 0|0 15.2k  234.5k   12
    12   456     22      3       2    89|0  0.2% 51.0%       0 1.57G 1.03G 0|0 1|0 42.1k  512.3k   14
```

Column guide:
- `insert/query/update/delete` - operations per second; `*0` means zero operations
- `getmore` - cursor getMore operations per second
- `command` - commands per second as `local|replicated`
- `dirty` - percentage of WiredTiger cache with dirty (unwritten) pages
- `used` - percentage of WiredTiger cache currently used
- `flushes` - WiredTiger checkpoint flushes per interval
- `vsize` - virtual memory in use
- `res` - resident (physical) memory in use
- `qrw` - queued read|write operations (indicates lock contention)
- `arw` - active read|write operations
- `net_in/net_out` - network traffic per interval
- `conn` - current open connections

## Performance Thresholds to Watch

### WiredTiger Cache

```text
dirty > 20%  - Cache cannot flush dirty pages fast enough
used > 95%   - Cache is nearly full; eviction pressure likely
```

```bash
# Monitor and alert when dirty exceeds 20%
mongostat --json 1 | python3 -c "
import sys, json

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        for host, metrics in data.items():
            dirty_str = metrics.get('dirty', '0%')
            dirty = float(dirty_str.replace('%', ''))
            if dirty > 20:
                print(f'ALERT: WiredTiger dirty cache {dirty}% on {host}')
    except (json.JSONDecodeError, ValueError):
        pass
"
```

### Lock Queues

```text
qrw > 0      - Some operations are queued waiting for locks
qrw > 10     - Significant lock contention
```

### Connection Count

```text
conn near maxIncomingConnections - Connection pool exhaustion risk
```

## Monitoring a Replica Set

```bash
# Use --discover to show all replica set members
mongostat --discover --host "rs0/mongo1:27017"

# Monitor specific hosts
mongostat --host "mongo1:27017,mongo2:27017,mongo3:27017"
```

Output includes one row per host per interval, with `host`, `set`, and `repl` columns identifying each member and its role, letting you compare primary vs secondary activity.

## Capturing and Analyzing mongostat Output

```bash
# Capture 5 minutes of data to a file
mongostat --rowcount 300 1 > /tmp/mongostat-$(date +%Y%m%d-%H%M%S).txt

# Analyze with awk - find max operations per second
awk 'NR > 1 { if ($1+0 > max) max=$1+0 } END { print "Max inserts/sec:", max }'   /tmp/mongostat-output.txt
```

## JSON Output for Automated Monitoring

```bash
# Get JSON output for programmatic processing
mongostat --json 5 | python3 -c "
import sys, json, datetime

thresholds = {
    'conn': 1000,
    'dirty_pct': 20.0,
}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        ts = datetime.datetime.now().isoformat()
        
        for host, m in data.items():
            conn = int(m.get('conn', 0))
            dirty = float(m.get('dirty', '0%').replace('%', ''))
            
            if conn > thresholds['conn']:
                print(f'[{ts}] WARN: connections={conn} on {host}')
            
            if dirty > thresholds['dirty_pct']:
                print(f'[{ts}] WARN: dirty cache={dirty}% on {host}')
                
    except (json.JSONDecodeError, ValueError, KeyError):
        pass
"
```

## Integrating with Prometheus/Grafana

While mongostat is excellent for interactive use, for long-term monitoring integrate with a metrics system:

```bash
# Export mongostat to Prometheus format using a wrapper
# Or use the official MongoDB Exporter for Prometheus:
# https://github.com/percona/mongodb_exporter

# Install MongoDB Exporter
docker run -d   -p 9216:9216   -e MONGODB_URI="mongodb://admin:secret@localhost:27017"   percona/mongodb_exporter:latest

# Scrape from Prometheus at localhost:9216/metrics
```

## Comparing mongostat with serverStatus

| Feature | mongostat | serverStatus |
|---------|-----------|--------------|
| Interface | CLI, streaming | mongosh command |
| Refresh | Automatic interval | Manual re-run |
| Granularity | Server-level | Server + component |
| Best for | Quick checks, incident response | Detailed analysis |

## Summary

`mongostat` provides fast, real-time visibility into MongoDB performance through a continuously updating terminal display. Key metrics to watch are the WiredTiger dirty cache percentage (keep below 20%), queue depth for reads and writes (should be 0 in normal operation), and connection count. Use `--json` output to integrate mongostat into automated monitoring pipelines, and `--discover` to monitor all members of a replica set simultaneously.
