# How to View Logs and Metrics with the Atlas CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, Monitoring, Log

Description: Learn how to download cluster logs and query performance metrics from MongoDB Atlas directly from the command line using the Atlas CLI.

---

## Why Use the CLI for Logs and Metrics?

The Atlas portal provides charts and log viewers, but the CLI is better for automated alerting scripts, log aggregation pipelines, and quick debugging sessions on the terminal. You can pipe output to standard tools like `jq`, `grep`, and `awk`.

## Listing Cluster Hosts

Logs are retrieved per host. First, identify the hosts in your cluster:

```bash
atlas clusters describe myCluster --output json | jq '.connectionStrings.standardSrv'
atlas processes list
```

## Downloading MongoDB Logs

Download compressed log files from a specific host:

```bash
atlas logs download <HOSTNAME> mongodb.gz \
  --out /tmp/mongodb.gz
```

Decompress and search the logs:

```bash
gzip -d /tmp/mongodb.gz
grep "SLOW_QUERY" /tmp/mongodb
```

Available log types:
- `mongodb.gz` - main mongod process log
- `mongos.gz` - for sharded clusters
- `mongodb-audit-log.gz` - audit log

## Filtering Logs by Time Range

Download only logs from a specific time window:

```bash
atlas logs download <HOSTNAME> mongodb.gz \
  --start 1711900800 \
  --end 1711904400 \
  --out /tmp/recent.gz
```

The `--start` and `--end` values are Unix timestamps.

## Viewing Process Metrics

Retrieve real-time process metrics for a host:

```bash
atlas metrics processes <HOSTNAME>:27017 \
  --granularity PT1M \
  --period P1D
```

Common granularity values: `PT1M` (1 minute), `PT5M` (5 minutes), `PT1H` (1 hour).
Common period values: `PT1H` (last hour), `P1D` (last day), `P7D` (last 7 days).

## Filtering Specific Metrics

Focus on the metrics you care about:

```bash
atlas metrics processes <HOSTNAME>:27017 \
  --granularity PT5M \
  --period P1D \
  --type CONNECTIONS,OPCOUNTER_CMD,QUERY_EXECUTOR_SCANNED_OBJECTS
```

Key metric types for performance monitoring:

```text
CONNECTIONS             - active client connections
OPCOUNTER_INSERT        - insert operations per second
OPCOUNTER_QUERY         - query operations per second
QUERY_TARGETING_RATIO   - scanned objects to returned objects ratio
MEMORY_RESIDENT         - resident memory in MB
DISK_PARTITION_IOPS_READ
DISK_PARTITION_IOPS_WRITE
```

## Viewing Disk Metrics

Monitor disk I/O to detect storage bottlenecks:

```bash
atlas metrics disks list <HOSTNAME>:27017 --output json
```

## Viewing Database-Level Metrics

Check stats for a specific database:

```bash
atlas metrics databases describe <HOSTNAME>:27017 myDatabase \
  --granularity PT5M \
  --period PT1H
```

## Scripting a Quick Health Check

A simple script to flag high query targeting ratios:

```bash
#!/bin/bash
RATIO=$(atlas metrics processes "$HOSTNAME:27017" \
  --granularity PT5M \
  --period PT1H \
  --type QUERY_TARGETING_RATIO \
  --output json | jq '[.measurements[0].dataPoints[].value // 0] | max')

if (( $(echo "$RATIO > 1000" | bc -l) )); then
  echo "WARNING: High query targeting ratio: $RATIO"
fi
```

## Listing Active Alerts

Review any active performance or availability alerts:

```bash
atlas alerts list
atlas alerts list --status OPEN --output json
```

## Summary

The Atlas CLI provides direct access to cluster logs and metrics without portal login. Use `atlas logs download` for log analysis, `atlas metrics processes` for performance data, and pipe JSON output to `jq` for flexible filtering. Combining these commands in scripts makes operational health checks easy to automate.
