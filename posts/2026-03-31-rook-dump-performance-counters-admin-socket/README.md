# How to Dump Performance Counters via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Performance, Metric, Monitoring

Description: Dump and interpret performance counters from Ceph daemons via the admin socket to diagnose bottlenecks, measure throughput, and monitor daemon health in real time.

---

## Overview

Every Ceph daemon maintains internal performance counters that track operations, latency, throughput, and error rates. The admin socket exposes these counters via `perf dump`. Unlike Prometheus metrics, perf counters provide immediate, precise snapshot data directly from the daemon's memory.

## Dumping Performance Counters

```bash
# Dump all perf counters for an OSD
ceph daemon osd.0 perf dump

# Dump counters for RGW
ceph daemon rgw.myzone perf dump

# Dump counters for MON
ceph daemon mon.$(hostname) perf dump

# Pretty-print the JSON output
ceph daemon osd.0 perf dump | python3 -m json.tool
```

## Understanding Counter Types

Ceph perf counters have two types:

- **PERFCOUNTER_U64** - a simple counter that only increases (e.g., total ops)
- **PERFCOUNTER_LONGRUNAVG** - tracks average latency with count and sum fields

```bash
# View the schema to understand each counter's type
ceph daemon osd.0 perf schema | python3 -m json.tool | head -60
```

## Key OSD Performance Counters

```bash
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
osd = data.get('osd', {})
print('op_r:', osd.get('op_r', 'N/A'), '(read ops)')
print('op_w:', osd.get('op_w', 'N/A'), '(write ops)')
print('op_r_latency:', osd.get('op_r_latency', {}).get('avgcount', 'N/A'), 'avg count')
print('op_w_latency:', osd.get('op_w_latency', {}).get('avgcount', 'N/A'), 'avg count')
"
```

## Key RGW Performance Counters

```bash
ceph daemon rgw.myzone perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
rgw = data.get('rgw', {})
keys = ['get', 'put', 'delete', 'get_b', 'put_b', 'qlen', 'qactive']
for k in keys:
    v = rgw.get(k, 'N/A')
    print(f'{k}: {v}')
"
```

## Resetting Counters for Clean Measurements

```bash
# Reset all counters for a clean measurement window
ceph daemon osd.0 perf reset all

# Reset specific counter group
ceph daemon osd.0 perf reset osd
```

## Monitoring Throughput Over Time

Use a loop to calculate rate of change:

```bash
#!/bin/bash
# Calculate OSD write throughput over 10 seconds
DAEMON="osd.0"

get_ops() {
    ceph daemon $DAEMON perf dump | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('osd',{}).get('op_w',0))"
}

START=$(get_ops)
sleep 10
END=$(get_ops)
RATE=$(( (END - START) / 10 ))
echo "Write ops/sec: $RATE"
```

## Histogram Counters

Some counters track latency histograms:

```bash
# View latency histogram schema
ceph daemon osd.0 perf histogram schema | python3 -m json.tool

# Dump histogram data
ceph daemon osd.0 perf histogram dump | python3 -m json.tool
```

## Summary

The admin socket `perf dump` command provides immediate access to a Ceph daemon's internal performance metrics. Key metrics include operation counts, latency averages, and throughput bytes for OSDs, and request rates, queue lengths, and D3N cache statistics for RGW. Use `perf reset` to establish clean measurement windows, and loop over perf dump to calculate rates of change for throughput monitoring.
