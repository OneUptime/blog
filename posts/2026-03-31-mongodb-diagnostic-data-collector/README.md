# How to Use the MongoDB Diagnostic Data Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Diagnostic, Monitoring

Description: Learn how to use the MongoDB Diagnostic Data Collector (FTDC) to capture operational metrics for performance analysis and support troubleshooting.

---

The MongoDB Diagnostic Data Collector (FTDC) continuously captures operational metrics and stores them in compressed binary files. MongoDB Support uses these files to diagnose performance problems without needing direct access to your database.

## What FTDC Collects

FTDC collects a snapshot of `serverStatus` and other system metrics every second by default. Collected data includes:

- Memory and CPU usage
- Lock statistics
- Replication state
- WiredTiger cache metrics
- Network counters

## Default FTDC Location

FTDC data is stored in the `diagnostic.data` subdirectory inside your `dbPath`:

```bash
ls /var/lib/mongodb/diagnostic.data/
```

Example output:

```text
metrics.2026-03-31T00-00-00Z-00000
metrics.2026-03-30T12-00-00Z-00000
metrics.interim
```

## FTDC Configuration in mongod.conf

FTDC is enabled by default. You can tune it in `mongod.conf`:

```yaml
setParameter:
  diagnosticDataCollectionEnabled: true
  diagnosticDataCollectionPeriodMillis: 1000
  diagnosticDataCollectionFileSizeMB: 10
  diagnosticDataCollectionDirectorySizeMB: 200
```

Key parameters:
- `diagnosticDataCollectionEnabled` - enable or disable FTDC
- `diagnosticDataCollectionPeriodMillis` - collection interval (default: 1000ms)
- `diagnosticDataCollectionFileSizeMB` - max size of each FTDC file (default: 10 MB)
- `diagnosticDataCollectionDirectorySizeMB` - total directory size cap (default: 200 MB)

## Enabling or Disabling FTDC at Runtime

You can toggle FTDC without restarting:

```javascript
// Disable FTDC
db.adminCommand({ setParameter: 1, diagnosticDataCollectionEnabled: false })

// Re-enable FTDC
db.adminCommand({ setParameter: 1, diagnosticDataCollectionEnabled: true })
```

## Changing Collection Parameters at Runtime

```javascript
// Increase the directory size cap
db.adminCommand({
  setParameter: 1,
  diagnosticDataCollectionDirectorySizeMB: 500
})

// Change collection period to 2 seconds
db.adminCommand({
  setParameter: 1,
  diagnosticDataCollectionPeriodMillis: 2000
})
```

## Reading FTDC Data

FTDC files are binary and cannot be read directly. MongoDB Atlas and MongoDB Support provide tooling for analysis. For self-hosted deployments, you can use the open-source `pyftdc` Python library:

```bash
pip install pyftdc
```

```python
from pyftdc import FTDCParser

parser = FTDCParser()
data = parser.parse("/var/lib/mongodb/diagnostic.data/metrics.2026-03-31T00-00-00Z-00000")
for metric in data:
    print(metric)
```

## Sharing FTDC Data with Support

When opening a MongoDB support ticket, include the `diagnostic.data` directory:

```bash
tar -czf diagnostic_data.tar.gz /var/lib/mongodb/diagnostic.data/
```

FTDC files contain no user data - only server metrics - so they are safe to share externally.

## Summary

MongoDB FTDC is a lightweight, always-on diagnostic tool that stores compressed operational metrics. It is enabled by default with sensible limits, and its parameters can be tuned at runtime. When troubleshooting performance issues, sharing the `diagnostic.data` directory gives MongoDB Support the context needed to identify root causes quickly.
