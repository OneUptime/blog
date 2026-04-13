# How to Use mongotop to Track Collection-Level Activity in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongotop, Monitoring, Performance

Description: Learn how to use mongotop to monitor per-collection read and write time in MongoDB, identify hot collections, and integrate results into performance analysis workflows.

---

## Overview

`mongotop` tracks how much time MongoDB spends reading and writing data at the collection level. While `mongostat` shows overall server metrics, `mongotop` breaks down activity by collection, helping you identify which specific collections are consuming the most I/O time. This makes it the right tool for tracing performance problems to their source collection.

## Starting mongotop

```bash
# Default: refresh every 1 second
mongotop

# Custom interval (10 seconds)
mongotop 10

# With authentication
mongotop --uri "mongodb://admin:secret@localhost:27017/admin"

# Show 20 samples then exit
mongotop --rowcount 20 5
```

## Understanding the Output

```text
                    ns    total    read    write    2026-03-31T10:00:00Z
       mydb.orders   345ms   230ms    115ms
   mydb.inventory    12ms     8ms      4ms
      mydb.users     5ms     5ms      0ms
  mydb.audit_log     3ms     0ms      3ms
  admin.system.roles  0ms     0ms      0ms
```

Column meanings:
- `ns` - namespace: database.collection
- `total` - total time in milliseconds spent on this collection in the interval
- `read` - time spent on read operations
- `write` - time spent on write operations
- timestamp - when this sample was taken

Collections are sorted by total time (highest first), so the busiest collection always appears at the top.

## Identifying Hot Collections

```bash
# Run for 60 seconds to identify consistently busy collections
mongotop --rowcount 60 1 | tee /tmp/mongotop-60sec.txt

# Find collections that appear in the top 3 most frequently
awk 'NR > 1 && NF >= 4 { count[$1]++ } END { for (ns in count) print count[ns], ns }'   /tmp/mongotop-60sec.txt | sort -rn | head -10
```

## The --locks Flag

> **Note:** The `--locks` flag only works with MongoDB 2.6 and earlier. On MongoDB 3.0 and later, it fails with "server does not support reporting lock information." Use the `db.serverStatus()` command or the `top` admin command for lock and per-collection timing information on modern MongoDB versions.

Use `--locks` to see lock wait times instead of I/O times (MongoDB 2.6 and earlier only):

```bash
mongotop --locks
```

```text
                    ns    total    read    write
       mydb.orders   45ms    12ms     33ms
   mydb.inventory     2ms     1ms      1ms
```

High write lock times indicate a write-heavy collection that may be causing read latency for other operations.

## JSON Output for Automation

```bash
# Get JSON output
mongotop --json 5

# Sample JSON output format:
# {"totals":{"mydb.orders":{"total":{"time":345,"count":1},"read":{"time":230,"count":1},"write":{"time":115,"count":1}}},"time":"2026-03-31T10:00:00Z"}
```

## Analyzing mongotop Data with Python

```python
#!/usr/bin/env python3
# analyze-mongotop.py - run with: mongotop --json 1 | python3 analyze-mongotop.py

import sys
import json
from collections import defaultdict

totals = defaultdict(lambda: {'read': 0, 'write': 0, 'total': 0, 'count': 0})
sample_count = 0

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    
    try:
        data = json.loads(line)
        sample_count += 1
        
        collections = data.get('totals', {})
        for ns, metrics in collections.items():
            totals[ns]['read'] += metrics.get('read', {}).get('time', 0)
            totals[ns]['write'] += metrics.get('write', {}).get('time', 0)
            totals[ns]['total'] += metrics.get('total', {}).get('time', 0)
            totals[ns]['count'] += 1
            
    except (json.JSONDecodeError, ValueError, KeyError):
        pass

# Print summary
print(f"\nAnalysis over {sample_count} samples:")
print(f"{'Namespace':<50} {'Avg Read':>10} {'Avg Write':>11} {'Avg Total':>11}")
print("-" * 85)

sorted_ns = sorted(totals.items(), key=lambda x: -x[1]['total'])
for ns, data in sorted_ns[:15]:
    count = data['count'] or 1
    avg_read = data['read'] / count
    avg_write = data['write'] / count
    avg_total = data['total'] / count
    print(f"{ns:<50} {avg_read:>9.1f}ms {avg_write:>10.1f}ms {avg_total:>10.1f}ms")
```

## Correlating mongotop with Query Explain Plans

When mongotop reveals a hot collection, investigate with explain:

```javascript
// 1. mongotop shows mydb.orders is the busiest collection
// 2. Find the slow queries in currentOp
db.currentOp({ ns: "mydb.orders", secs_running: { $gt: 1 } })

// 3. Run explain on the suspected query
db.orders.find({ status: "pending", customerId: "CUST-123" })
  .explain("executionStats")

// 4. Check if index is being used
// Look for COLLSCAN in planSummary - indicates missing index
// Look for totalDocsExamined vs nReturned ratio

// 5. Create appropriate index if needed
db.orders.createIndex({ customerId: 1, status: 1 })
```

## Comparing Primary vs Secondary Activity

```bash
# Terminal 1 - monitor primary
mongotop --uri "mongodb://admin:secret@mongo1:27017/admin" 5

# Terminal 2 - monitor a secondary
mongotop --uri "mongodb://admin:secret@mongo2:27017/admin" 5
```

If a secondary shows unexpectedly high write activity, it may be replication lag or background index builds.

## Combining mongotop with mongostat

Use both tools together for complete observability:

```bash
# Split terminal or use tmux
# Left pane - server-level stats
mongostat 5

# Right pane - collection-level breakdown
mongotop 5
```

When mongostat shows high overall query rate, use mongotop to identify which collection is responsible.

## Summary

`mongotop` tracks per-collection I/O time in MongoDB, making it easy to identify which collections are consuming the most read and write time. The output automatically sorts by total time, putting the busiest collections first. Use `--locks` to see lock wait times, and `--json` for integration with monitoring scripts. When a hot collection is identified, correlate with `currentOp` and `explain()` to find the specific queries driving the load and determine if additional indexes would help.
