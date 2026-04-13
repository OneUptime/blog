# How to Use mongostat for Real-Time MongoDB Statistics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Performance, Database Tools

Description: Learn how to use the mongostat command-line tool to view real-time MongoDB performance statistics including operations per second, connections, and memory usage.

---

## Overview

`mongostat` is a command-line utility included with MongoDB that provides a continuous stream of real-time performance statistics. Similar to the Unix `vmstat` command, it refreshes at configurable intervals and displays metrics like operations per second, active connections, memory usage, and network traffic. It is invaluable for quick performance checks and spotting anomalies during incident response.

## Installation

`mongostat` is included with the MongoDB Database Tools package. Verify it is installed:

```bash
mongostat --version
```

If not available, install MongoDB Database Tools from https://www.mongodb.com/try/download/database-tools.

## Basic Usage

```bash
# Connect to local MongoDB and display stats every 1 second
mongostat

# Specify connection options
mongostat --host localhost --port 27017

# With authentication
mongostat --username admin --password secret --authenticationDatabase admin

# Using a URI
mongostat --uri "mongodb://admin:secret@localhost:27017/admin"
```

## Understanding the Output

A typical mongostat output looks like:

```text
insert query update delete getmore command dirty  used flushes vsize   res qrw arw net_in net_out conn                time
    *0    *0     *0     *0       0     2|0  0.0% 50.1%       0 1.57G 1.02G 0|0 0|0   158b    62.4k   10 Mar 31 10:00:01.000
     5   123      8      1       0    45|0  0.1% 50.3%       0 1.57G 1.02G 0|0 0|0  15.2k   234.5k   10 Mar 31 10:00:02.000
```

Column meanings:
- `insert/query/update/delete` - operations per second for each type
- `getmore` - getMore operations per second (cursor iteration)
- `command` - commands per second (shown as `local|replicated`)
- `dirty` - percentage of WiredTiger cache that is dirty (modified, not yet flushed)
- `used` - percentage of WiredTiger cache currently in use
- `flushes` - WiredTiger checkpoints per interval
- `vsize` - virtual memory size of the process
- `res` - resident (physical) memory used
- `qrw` - queued read and write operations (r|w format)
- `arw` - active read and write operations (r|w format)
- `net_in/net_out` - network bytes received/sent per interval
- `conn` - number of open connections
- `time` - timestamp of the sample

## Common Usage Patterns

```bash
# Refresh every 5 seconds
mongostat 5

# Show only 10 samples then exit
mongostat --rowcount 10

# Connect to a replica set
mongostat --host "rs0/mongo1:27017,mongo2:27017,mongo3:27017"

# Show stats for all replica set members
mongostat --discover --host "rs0/mongo1:27017"

# Output to a file for later analysis
mongostat 5 --rowcount 100 > mongostat_output.txt
```

## Discovering Replica Set Members

The `--discover` flag automatically connects to all members of a replica set and shows stats for each:

```bash
mongostat --discover --host "rs0/mongo1:27017"
```

Output shows a row per host with additional `set` and `repl` columns:

```text
         host insert query update delete getmore command dirty  used flushes  vsize   res qrw arw net_in net_out conn set repl                time
mongo1:27017      5   123      8      1       0    45|0  0.1% 50.3%       0  1.57G 1.02G 0|0 0|0  15.2k  234.5k   10 rs0  PRI Mar 31 10:00:02.000
mongo2:27017      0     3      0      0       0     2|0  0.0% 50.1%       0  1.57G 1.02G 0|0 0|0   158b   62.4k    9 rs0  SEC Mar 31 10:00:02.000
mongo3:27017      0     2      0      0       0     2|0  0.0% 50.1%       0  1.57G 1.02G 0|0 0|0   158b   62.4k    9 rs0  SEC Mar 31 10:00:02.000
```

## Interpreting Key Metrics

### High dirty percentage

If `dirty` consistently exceeds 20%, the WiredTiger cache cannot flush dirty pages fast enough. This may indicate insufficient cache size or heavy write load.

```bash
# Monitor specifically for dirty cache issues
mongostat 1 | awk 'NR==1 || $7+0 > 20 {print}'
```

### High queue values

If `qrw` shows non-zero values regularly, there is lock contention. Investigate with `currentOp`:

```javascript
db.currentOp({ waitingForLock: true })
```

### Connection growth

If `conn` keeps increasing, check for connection leaks in application code.

## Filtering Output Fields

Use `--columns` to show only specific fields:

```bash
# Show only operation counts and connections
mongostat --columns "insert,query,update,delete,conn"
```

## Using mongostat with JSON Output

```bash
# Output in JSON format for programmatic processing
mongostat --json

# Parse with Python
mongostat --json | python3 -c '
import sys, json
for line in sys.stdin:
    try:
        data = json.loads(line)
        for host, metrics in data.items():
            print("{}: queries={}, conn={}".format(host, metrics["query"], metrics["conn"]))
    except json.JSONDecodeError:
        pass
'
```

## Summary

`mongostat` provides an instant view into MongoDB's real-time operational state, making it the go-to tool for quick performance checks and incident triage. By monitoring operations per second, cache utilization, queue depths, and connection counts, you can quickly identify whether MongoDB is experiencing write pressure, lock contention, or connection pool exhaustion. The `--discover` flag makes it especially useful for monitoring all members of a replica set simultaneously.
