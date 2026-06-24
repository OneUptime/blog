# How to Use the MongoDB Log Parser for Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Log, mtools, Parser, Troubleshooting

Description: Learn how to use mtools and custom log parsing techniques to analyze MongoDB logs and quickly identify slow queries, connection spikes, and error patterns.

---

## Why a Log Parser Saves Time

Raw MongoDB log files can grow to gigabytes. Scanning them manually is impractical. Purpose-built log parsers transform hours of grep-and-awk work into seconds by aggregating slow queries, counting errors by type, and plotting operation latency over time.

## Installing mtools

`mtools` is the most widely-used MongoDB log analysis toolkit:

```bash
pip install mtools[all]

# Verify installation
mloginfo --version
mplotqueries --version
```

## mloginfo: Summary Statistics

Get a quick summary of a log file:

```bash
# Overall summary: date range, unique connections, restarts
mloginfo /var/log/mongodb/mongod.log

# Slow query summary grouped by query pattern
mloginfo /var/log/mongodb/mongod.log --queries

# Connection count statistics
mloginfo /var/log/mongodb/mongod.log --connections

# Restart events
mloginfo /var/log/mongodb/mongod.log --restarts
```

Sample `--queries` output:

```text
namespace           operation  pattern                          count  min (ms)  max (ms)  95%-ile (ms)  sum (ms)  mean (ms)
mydb.orders         query      {"status": 1}                    1523    12        5211      1843          356382    234
mydb.events         query      {"userId": 1, "createdAt": 1}    892     4         890       412           59764     67
```

The `pattern` column normalizes query values to `1`, making it easy to spot the same slow query run with different values.

## mlogfilter: Extracting Targeted Entries

```bash
# Show only slow queries above 500ms in the last 2 hours
mlogfilter /var/log/mongodb/mongod.log \
  --slow 500 \
  --from "2026-03-31 08:00" \
  --to "2026-03-31 10:00"

# Filter by namespace
mlogfilter /var/log/mongodb/mongod.log \
  --namespace mydb.orders

# Filter by operation type (one operation per invocation:
# query, insert, update, delete, command, or getmore)
mlogfilter /var/log/mongodb/mongod.log \
  --operation query

# Filter by thread/connection
mlogfilter /var/log/mongodb/mongod.log \
  --thread conn1234
```

## Writing a Custom Log Parser

For JSON-format logs, a small Python script handles targeted analysis:

```python
import json
from collections import defaultdict

slow_by_ns = defaultdict(list)

with open('/var/log/mongodb/mongod.log') as f:
    for line in f:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        ms = entry.get('attr', {}).get('durationMillis', 0)
        if ms > 200 and entry.get('c') == 'COMMAND':
            ns = entry['attr'].get('ns', 'unknown')
            slow_by_ns[ns].append(ms)

print("Top slow namespaces:")
for ns, times in sorted(slow_by_ns.items(), key=lambda x: -sum(x[1]))[:10]:
    avg = sum(times) / len(times)
    print(f"  {ns}: count={len(times)}, avg={avg:.0f}ms, max={max(times)}ms")
```

## Identifying Error Patterns

```bash
# Count errors by message ID (stable across MongoDB versions)
grep '"s":"E"' /var/log/mongodb/mongod.log | \
  python3 -c "
import sys, json
from collections import Counter
c = Counter()
for line in sys.stdin:
    try:
        d = json.loads(line)
        c[d.get('id', 'unknown')] += 1
    except: pass
for id, n in c.most_common(10):
    print(n, 'id:', id)
"
```

Look up error message IDs in the MongoDB documentation for explanations and remediation steps.

## mplotqueries: Visualizing Latency Over Time

Generate a timeline chart of query latency:

```bash
# Requires matplotlib
mplotqueries /var/log/mongodb/mongod.log --type scatter --output-file latency.png
```

This generates a scatter plot with time on the x-axis and operation duration on the y-axis, making latency spikes visually obvious.

## Summary

`mloginfo` gives instant summaries of slow query patterns, connection counts, and restarts. `mlogfilter` narrows log output to the time window and namespace you care about. For JSON-format logs (MongoDB 4.4+), a simple Python script handles any custom analysis. Combine these tools to cut post-incident investigation time from hours to minutes.
