# How to Capture and Analyze Diagnostic Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Diagnostic, FTDC, Performance, Troubleshooting

Description: Learn how to use MongoDB's Full-Time Diagnostic Data Capture (FTDC) and diagnostic commands to collect and analyze performance data for troubleshooting.

---

## What Is FTDC?

MongoDB's Full-Time Diagnostic Data Capture (FTDC) continuously records operational statistics to compressed binary files stored under `dbPath/diagnostic.data/`. It captures hundreds of metrics every second with minimal overhead - typically less than 1% CPU and around 1 MB per hour of data.

FTDC data is invaluable for post-incident analysis because it provides a high-resolution timeline of what MongoDB was doing before, during, and after a problem.

## Locating FTDC Files

```bash
# Default location
ls -lh /var/lib/mongodb/diagnostic.data/

# Or query mongod for the path
mongosh --eval "db.adminCommand({getCmdLineOpts:1}).parsed.storage.dbPath"
```

Files named `metrics.YYYYMMDDTHHMMSSZ` are full diagnostic snapshots. The `metrics.interim` file contains the most recent data not yet flushed to a full file.

## Enabling and Configuring FTDC

FTDC is enabled by default. Configure collection interval and max size:

```javascript
// Check current FTDC settings
db.adminCommand({
  getParameter: 1,
  diagnosticDataCollectionEnabled: 1,
  diagnosticDataCollectionPeriodMillis: 1,
  diagnosticDataCollectionDirectorySizeMB: 1
});

// Adjust capture interval (default 1 second) and max directory size
db.adminCommand({
  setParameter: 1,
  diagnosticDataCollectionEnabled: true,
  diagnosticDataCollectionPeriodMillis: 1000,
  diagnosticDataCollectionDirectorySizeMB: 200
});
```

## Reading FTDC Data with ftdc-utils

The `ftdc-utils` Python library parses FTDC binary files:

```bash
pip install ftdc-utils
```

```python
import ftdc

# Read an FTDC file and extract metrics
for chunk in ftdc.read_file('/var/lib/mongodb/diagnostic.data/metrics.2026031200T000000Z'):
    for metric_name, values in chunk.items():
        if 'bytesInCache' in metric_name:
            print(f"{metric_name}: {values[-1]}")
```

## Using the getDiagnosticData Command

For a point-in-time diagnostic snapshot including all `serverStatus` and `replSetGetStatus` data:

```javascript
const diag = db.adminCommand({ getDiagnosticData: 1 });
printjson(diag.data);
```

This is useful for capturing a snapshot to share with MongoDB Support.

## Generating a Support Diagnostic Archive

When opening a MongoDB support case, collect all diagnostic data:

```bash
# Capture a point-in-time snapshot of server status and current operations
mongosh --eval "printjson(db.adminCommand({serverStatus: 1}))" > /tmp/diag_$(date +%Y%m%d)_serverStatus.json
mongosh --eval "printjson(db.adminCommand({currentOp: 1}))" > /tmp/diag_$(date +%Y%m%d)_currentOp.json

# Copy diagnostic.data directory and bundle everything
mkdir -p /tmp/diag_$(date +%Y%m%d)
cp -r /var/lib/mongodb/diagnostic.data/ /tmp/diag_$(date +%Y%m%d)/
cp /tmp/diag_$(date +%Y%m%d)_*.json /tmp/diag_$(date +%Y%m%d)/
tar czf /tmp/mongodb_diag_$(date +%Y%m%d).tar.gz /tmp/diag_$(date +%Y%m%d)/
```

## Analyzing Key Metrics from FTDC

Focus on these FTDC metrics during post-incident analysis:

```text
Metric Path                                          | Meaning
-----------------------------------------------------|---------------------
serverStatus.wiredTiger.cache.bytes in cache         | Cache utilization
serverStatus.wiredTiger.cache.pages evicted by application threads | Cache pressure
serverStatus.opcounters.insert/update/delete/query   | Operation rates
serverStatus.connections.current                     | Connection count
serverStatus.metrics.repl.buffer.sizeBytes            | Replication buffer
serverStatus.mem.resident                            | RSS memory
```

Spike in evictions correlated with latency spikes is a classic cache pressure signature.

## Summary

MongoDB FTDC continuously captures rich performance metrics to `diagnostic.data/` with near-zero overhead. Use `getDiagnosticData` for live snapshots, `ftdc-utils` to parse historical files for post-incident analysis, and the `setParameter` command to tune collection frequency and file size. When escalating issues to MongoDB Support, always include the `diagnostic.data` directory - it provides the timeline evidence needed to diagnose complex production problems.
