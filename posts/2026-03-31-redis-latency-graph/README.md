# How to Use LATENCY GRAPH in Redis to Visualize Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Latency, Monitoring, Performance, Visualization

Description: Learn how to use LATENCY GRAPH in Redis to render an ASCII time-series chart of latency spikes directly in your terminal for quick visual diagnostics.

---

## Introduction

`LATENCY GRAPH` renders an ASCII bar chart of the latency history for a named event, directly in the Redis CLI. It is the fastest way to visually assess whether latency spikes are isolated or part of a recurring pattern, without needing an external dashboard.

## Prerequisites

Latency monitoring must be active:

```redis
CONFIG SET latency-monitor-threshold 10
```

At least a few samples must have been recorded. If the history is empty, `LATENCY GRAPH` returns an empty reply.

## Basic Syntax

```redis
LATENCY GRAPH event-name
```

## Example Output

```yaml
127.0.0.1:6379> LATENCY GRAPH command

command - high 156 ms, low 12 ms (all time high 156 ms)
--------------------------------------------------------------------------------
#
# #
# ##
####

15s 11s 8s 3s
```

Each column represents one recorded latency spike. The height of the column is proportional to the latency value. The rightmost column is the most recent sample. The time labels at the bottom show how long ago each sample was recorded.

## How the Chart Is Constructed

```mermaid
flowchart TD
    A["LATENCY HISTORY samples\n(up to 160 entries)"] --> B["Scale all values\nto chart height (4 rows)"]
    B --> C["Render ASCII columns\nright = newest"]
    C --> D["Print header:\nevent - high, low, all time high"]
    D --> E["Print time labels\nbelow each column"]
```

## Reading the Chart

- **Tall columns** on the right side indicate a recent worsening trend.
- **Isolated tall columns** suggest one-off spikes (likely a slow command or snapshot).
- **Uniformly tall columns** indicate a systemic bottleneck (disk, network, or CPU).
- **Gaps** between columns represent periods with no spikes above the threshold.

## Checking AOF Latency

```redis
127.0.0.1:6379> LATENCY GRAPH aof-fsync-always
```

If you see columns growing taller over time, the disk is becoming saturated.

## Checking All Events in a Loop

```bash
#!/bin/bash
# Print graph for each active event
redis-cli LATENCY LATEST | awk '{print $1}' | while read event; do
  echo "=== $event ==="
  redis-cli LATENCY GRAPH "$event"
  echo ""
done
```

## Comparing LATENCY Commands

```mermaid
flowchart LR
    A["LATENCY LATEST"] -- "Tabular\nall events" --> B["Spot check"]
    C["LATENCY HISTORY event"] -- "Raw time series\none event" --> D["Export/CSV"]
    E["LATENCY GRAPH event"] -- "ASCII chart\none event" --> F["Visual trend"]
    G["LATENCY DOCTOR"] -- "Text diagnosis\nrecommendations" --> H["Automated advice"]
```

## Resetting Data Before a New Test

```redis
LATENCY RESET command
```

Then reproduce the issue, and run `LATENCY GRAPH command` again to see only the new samples.

## Summary

`LATENCY GRAPH event-name` produces an instant ASCII visualization of the recorded latency history for a single Redis event. Taller bars indicate higher latency spikes; newer spikes appear on the right. Use it alongside `LATENCY LATEST` for a summary and `LATENCY HISTORY` for raw data export. It requires no external tools - just run it directly in `redis-cli`.
