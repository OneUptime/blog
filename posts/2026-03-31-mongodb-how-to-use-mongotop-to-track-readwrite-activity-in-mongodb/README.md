# How to Use mongotop to Track Read/Write Activity in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Performance, Database Tools

Description: Learn how to use mongotop to monitor per-collection read and write activity in MongoDB, helping identify which collections are consuming the most I/O.

---

## Overview

`mongotop` is a command-line utility that tracks and displays how much time MongoDB spends reading and writing data at the collection level. Similar to the Unix `top` command, it provides a continuously refreshing view of the most active collections. This makes it easy to identify which collections are hotspots during performance issues.

## Installation

`mongotop` is part of the MongoDB Database Tools package:

```bash
# Verify installation
mongotop --version
```

## Basic Usage

```bash
# Connect to local MongoDB, refresh every 1 second
mongotop

# Specify refresh interval (seconds)
mongotop 5

# With authentication
mongotop --username admin --password secret --authenticationDatabase admin

# Using a connection URI
mongotop --uri "mongodb://admin:secret@localhost:27017/admin"
```

## Understanding the Output

```text
                    ns    total    read    write    2026-03-31T10:00:01Z
       mydb.orders  345ms   230ms    115ms
   mydb.inventory    12ms     8ms      4ms
      mydb.users     5ms     5ms      0ms
  mydb.audit_log     3ms     0ms      3ms
   local.oplog.rs     1ms     0ms      1ms
```

Column meanings:
- `ns` - namespace (database.collection)
- `total` - total time spent on reads and writes in the interval
- `read` - time spent performing read operations
- `write` - time spent performing write operations
- timestamp - when this sample was taken

The times represent the cumulative time spent in lock/read/write operations during the interval period. High values indicate that collection is seeing heavy activity.

## Common Usage Patterns

```bash
# Refresh every 3 seconds
mongotop 3

# Show a specific number of samples then exit
mongotop --rowcount 20 5

# Connect to a replica set
mongotop --host "rs0/mongo1:27017,mongo2:27017"
```

## The --locks Flag

> **Note:** The `--locks` flag only works when connected to MongoDB 2.6 or earlier. On MongoDB 3.0 and newer, it returns an error because per-database lock timing data is no longer reported by the server.

The `--locks` flag reports time spent waiting for locks rather than I/O time:

```bash
mongotop --locks
```

```text
                    ns    total    read    write
       mydb.orders   45ms    12ms     33ms
   mydb.inventory     2ms     1ms      1ms
```

This view is useful when diagnosing lock contention - high write lock times suggest write-heavy workloads that may be blocking readers.

## JSON Output for Automation

```bash
# Output in JSON format
mongotop --json 5

# Sample output (one JSON document per line)
# {"totals":{"mydb.orders":{"total":{"time":345,"count":5},"read":{"time":230,"count":3},"write":{"time":115,"count":2}},...},"time":"2026-03-31T10:00:01Z"}
```

Process with a shell pipeline:

```bash
mongotop --json 5 | python3 -c "
import sys, json

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        totals = data.get('totals', {})
        for ns, metrics in sorted(totals.items(), key=lambda x: x[0]):
            total = metrics.get('total', {}).get('time', 0)
            print(f'{ns:50s} total={total}ms')
    except json.JSONDecodeError:
        pass
"
```

## Identifying Hot Collections

Use mongotop to find which collections are bottlenecks:

```bash
# Run for 30 seconds and collect data
mongotop --json --rowcount 30 1 > mongotop_data.json

# Analyze with Python to find the busiest collections
python3 << 'EOF'
import json
from collections import defaultdict

totals = defaultdict(int)

with open('mongotop_data.json') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            for ns, metrics in data.get('totals', {}).items():
                total_ms = metrics.get('total', {}).get('time', 0)
                totals[ns] += total_ms
        except (json.JSONDecodeError, ValueError):
            pass

print("Busiest collections over 30 samples:")
for ns, total in sorted(totals.items(), key=lambda x: -x[1])[:10]:
    print(f"  {ns}: {total}ms total")
EOF
```

## Comparing with mongostat

While `mongostat` shows operation counts per second across the whole server, `mongotop` shows time distribution per collection. Use them together:

```bash
# Terminal 1 - overall server stats
mongostat 5

# Terminal 2 - per-collection activity
mongotop 5
```

This combination reveals both what operations are happening and which collections they affect.

## Summary

`mongotop` gives per-collection visibility into read and write activity in MongoDB, making it easy to identify which collections are consuming the most I/O time. By tracking time spent on reads versus writes, you can determine whether performance issues are read-heavy or write-heavy and focus optimization efforts on the right collections. The `--locks` flag adds lock wait time analysis, useful for diagnosing contention issues.
