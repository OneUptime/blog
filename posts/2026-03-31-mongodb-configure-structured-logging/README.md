# How to Configure Structured Logging in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Logging, Structured Log, JSON, Observability

Description: Learn how to enable and configure MongoDB's structured JSON log format to simplify log parsing, aggregation, and integration with observability platforms.

---

## What Is Structured Logging in MongoDB?

MongoDB 4.4 introduced structured JSON log output as the default log format. Every log line is a valid JSON object containing standardized fields like `t` (timestamp), `s` (severity), `c` (component), `id` (message identifier), `ctx` (context/thread), and `msg` (message template) with `attr` holding additional attributes.

Structured logs are machine-readable by default, making them easy to ship to Elasticsearch, Datadog, Splunk, or any JSON-aware log aggregator.

## Enabling JSON Log Format

In `mongod.conf`, set the log format to `json`:

```yaml
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
  logRotate: reopen
  verbosity: 0
  component:
    command:
      verbosity: 1
    query:
      verbosity: 1
```

MongoDB 4.4+ uses JSON format by default. There is no configuration option to switch between log formats - structured JSON is the only format in 4.4 and later. Versions before 4.4 use a plaintext log format and do not support structured JSON logging.

## Understanding a Structured Log Entry

A typical log line looks like:

```json
{
  "t": { "$date": "2026-03-31T10:23:45.123+00:00" },
  "s": "I",
  "c": "COMMAND",
  "id": 51803,
  "ctx": "conn1234",
  "msg": "Slow query",
  "attr": {
    "type": "command",
    "ns": "mydb.orders",
    "command": { "find": "orders", "filter": { "status": "pending" } },
    "durationMillis": 1523
  }
}
```

Key fields:
- `s`: severity (D=Debug, I=Info, W=Warning, E=Error, F=Fatal)
- `c`: component (COMMAND, QUERY, REPL, NETWORK, STORAGE, etc.)
- `id`: stable message identifier across MongoDB versions
- `attr`: structured attributes specific to the message

## Parsing Structured Logs with jq

Query logs directly from the command line using `jq`:

```bash
# Show all slow queries (COMMAND component, duration > 100ms)
cat /var/log/mongodb/mongod.log | \
  jq -c 'select(.c == "COMMAND" and .attr.durationMillis > 100) | {ts: .t, ns: .attr.ns, ms: .attr.durationMillis}'

# Count log entries by severity
cat /var/log/mongodb/mongod.log | \
  jq -r '.s' | sort | uniq -c | sort -rn

# Find all errors in the last hour
cat /var/log/mongodb/mongod.log | \
  jq -c 'select(.s == "E")'
```

## Shipping Logs to a Central Aggregator

Configure Filebeat to ship MongoDB logs to Elasticsearch:

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/mongodb/mongod.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: mongodb
      env: production
    fields_under_root: true

output.elasticsearch:
  hosts: ["https://elasticsearch:9200"]
  index: "mongodb-logs-%{+yyyy.MM.dd}"
```

Because each log line is already valid JSON, Filebeat parses it with zero additional transformation.

## Setting Per-Component Verbosity at Runtime

Adjust log detail for specific components without restarting:

```javascript
// Enable debug logging for the replication component
db.setLogLevel(2, "repl");

// Increase query logging verbosity
db.setLogLevel(1, "query");

// Reset to default
db.setLogLevel(0, "query");
```

These changes take effect immediately and persist until the next restart.

## Summary

MongoDB 4.4+ emits structured JSON logs by default, with each entry containing stable fields for timestamp, severity, component, and message attributes. Configure the format and per-component verbosity in `mongod.conf` or at runtime with `setLogLevel`. Use `jq` for ad hoc log analysis and ship to Elasticsearch or Datadog via Filebeat for centralized monitoring. Structured logging dramatically reduces the time needed to correlate slow queries, replication lag, and errors in production.
