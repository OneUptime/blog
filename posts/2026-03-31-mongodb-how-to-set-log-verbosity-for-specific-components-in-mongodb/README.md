# How to Set Log Verbosity for Specific Components in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Verbosity, Diagnostic, Configuration

Description: Learn how to set and adjust log verbosity levels for specific MongoDB components at runtime and in configuration to enable targeted diagnostic logging.

---

## Introduction

MongoDB has a granular logging system that lets you set verbosity levels per component - such as queries, replication, storage, or network. Rather than enabling verbose logging globally (which produces enormous output), you can target specific subsystems. Verbosity levels range from 0 (default, informational messages including warnings and errors) to 5 (most verbose debug output).

## Log Verbosity Levels

```text
0 - Informational (default) - Info, warning, and error messages
1 - Debug level 1 - Basic debug messages
2 - Debug level 2 - More detailed debug messages
3 - Debug level 3 - Very detailed debug messages
4 - Debug level 4 - Highly detailed debug messages
5 - Debug level 5 - Maximum verbosity
```

## Setting Verbosity at Runtime

Use `db.adminCommand()` with `setParameter` to change verbosity without restarting MongoDB:

```javascript
// Set global verbosity to level 1
db.adminCommand({ setParameter: 1, logLevel: 1 });

// Set verbosity for a specific component
db.adminCommand({
  setParameter: 1,
  "logComponentVerbosity": {
    query: { verbosity: 2 },
    replication: { verbosity: 1 }
  }
});
```

## Key MongoDB Log Components

```text
accessControl    - Authentication and authorization events
command          - Database command execution
control          - Startup, shutdown, and configuration
geo              - Geospatial index parsing
index            - Index creation and deletion
network          - Network connections and operations
query            - Query planning and execution
replication      - Replica set events
replication.heartbeats - Heartbeat messages
replication.rollback   - Rollback events
sharding         - Sharding events
storage          - Storage layer events
storage.journal  - Journaling events
write            - Write operations
```

## Setting Verbosity in mongod.conf

Configure verbosity in the configuration file for persistent settings:

```yaml
systemLog:
  verbosity: 0
  component:
    query:
      verbosity: 2
    replication:
      verbosity: 1
      heartbeats:
        verbosity: 0
    storage:
      verbosity: 1
      journal:
        verbosity: 0
    network:
      verbosity: 0
    write:
      verbosity: 1
```

Restart mongod to apply:

```bash
sudo systemctl restart mongod
```

## Checking Current Verbosity Settings

```javascript
db.adminCommand({ getParameter: 1, logComponentVerbosity: 1 });
```

Sample output:

```javascript
{
  "logComponentVerbosity": {
    "verbosity": 0,
    "accessControl": { "verbosity": -1 },
    "command": { "verbosity": -1 },
    "query": { "verbosity": 2 },
    "replication": {
      "verbosity": 1,
      "heartbeats": { "verbosity": 0 }
    },
    "storage": { "verbosity": 1 }
  }
}
```

A value of `-1` means the component inherits from the global level.

## Temporarily Enabling Debug Logging for Queries

When debugging slow or incorrect queries, enable query component verbosity:

```javascript
// Enable query debug logging
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: { query: { verbosity: 3 } }
});

// Run your query
db.orders.find({ status: "pending" }).sort({ createdAt: -1 }).limit(10);

// Disable after investigation
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: { query: { verbosity: 0 } }
});
```

## Enabling Replication Verbosity

For troubleshooting replica set sync or election issues:

```javascript
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: {
    replication: {
      verbosity: 2,
      heartbeats: { verbosity: 1 },
      rollback: { verbosity: 2 }
    }
  }
});
```

## Reading Logs to Find Component-Tagged Messages

MongoDB log entries include a component tag:

```text
{"t":{"$date":"2026-03-31T10:00:00.000Z"},"s":"D2","c":"QUERY","id":20917,
 "ctx":"conn1","msg":"Plan executor killing query","attr":{"error":{"code":50,"codeName":"MaxTimeMSExpired"}}}
```

The `"c":"QUERY"` field identifies the component. Filter logs:

```bash
grep '"c":"QUERY"' /var/log/mongodb/mongod.log | tail -50
```

## Summary

MongoDB's per-component verbosity system lets you surgically enable debug logging for specific subsystems without flooding logs with unrelated output. Use `setParameter` with `logComponentVerbosity` for runtime adjustments during troubleshooting, and persist settings in `mongod.conf` for long-term diagnostic monitoring. Always reset verbosity to 0 after troubleshooting to avoid performance degradation from excessive logging.
