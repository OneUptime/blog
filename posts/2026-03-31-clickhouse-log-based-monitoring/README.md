# How to Set Up Log-Based Monitoring for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Monitoring, Logging, Alerting, Observability

Description: Learn how to configure ClickHouse text logs, ship them to a log aggregation system, and build alerts on error patterns and performance anomalies.

---

ClickHouse writes structured text logs that contain rich information about errors, slow queries, replication events, and background operations. Setting up log-based monitoring adds a complementary layer to metrics-based observability.

## Configuring ClickHouse Log Levels

ClickHouse log settings live in `config.xml`:

```xml
<logger>
    <level>information</level>
    <log>/var/log/clickhouse-server/clickhouse-server.log</log>
    <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
    <size>1000M</size>
    <count>10</count>
    <compress>true</compress>
</logger>
```

For debugging, set `<level>debug</level>` temporarily. In production, `information` is the right balance between detail and volume.

## Log Format and Structure

ClickHouse logs follow this format:

```text
2026.03.31 12:00:01.123456 [ 1234 ] {query-id} <Information> executeQuery: ...
```

Components: timestamp, thread ID (brackets), query ID (braces), log level, component, and message.

## Shipping Logs with Fluent Bit

Configure Fluent Bit to tail ClickHouse logs and forward to your aggregation stack:

```ini
[INPUT]
    Name              tail
    Path              /var/log/clickhouse-server/clickhouse-server.log
    Tag               clickhouse.server
    Multiline         On
    Parser_Firstline  clickhouse_log

[FILTER]
    Name    grep
    Match   clickhouse.*
    Regex   log  (Error|Warning|Exception)

[OUTPUT]
    Name   loki
    Match  clickhouse.*
    Host   loki
    Port   3100
    Labels job=clickhouse
```

## Parsing ClickHouse Logs with Vector

Vector can parse and route ClickHouse logs efficiently:

```toml
[sources.clickhouse_log]
type = "file"
include = ["/var/log/clickhouse-server/*.log"]

[transforms.parse_clickhouse]
type = "remap"
inputs = ["clickhouse_log"]
source = '''
. = parse_regex!(.message, r'^(?P<timestamp>\S+ \S+) \[ (?P<thread>\d+) \] \{(?P<query_id>[^}]*)\} <(?P<level>\w+)> (?P<message>.+)$')
'''

[sinks.loki]
type = "loki"
inputs = ["parse_clickhouse"]
endpoint = "http://loki:3100"
```

## Key Log Patterns to Alert On

Create alerts for these log patterns:

```bash
# Exception errors
grep -c "DB::Exception" /var/log/clickhouse-server/clickhouse-server.err.log

# Out of memory
grep "Memory limit exceeded" /var/log/clickhouse-server/clickhouse-server.log

# Too many parts
grep "Too many parts" /var/log/clickhouse-server/clickhouse-server.log

# Replication errors
grep "Replication" /var/log/clickhouse-server/clickhouse-server.err.log
```

## LogQL Queries for Grafana/Loki

If using Loki, query ClickHouse logs with LogQL:

```logql
# Count errors per minute
sum by (level) (rate({job="clickhouse"} |= "Exception" [1m]))

# Find out-of-memory events
{job="clickhouse"} |= "Memory limit exceeded"

# Track slow merge warnings
{job="clickhouse"} |= "Merge" |= "taking too long"
```

## Correlating Logs with Query IDs

Every ClickHouse query gets a unique query ID. Use it to correlate log lines with `system.query_log` entries:

```sql
SELECT *
FROM system.query_log
WHERE initial_query_id = '12345678-1234-1234-1234-123456789012'
ORDER BY event_time;
```

## Summary

Log-based monitoring for ClickHouse gives you visibility into errors, slow operations, and replication events that metrics alone miss. Configure appropriate log levels, ship logs with Fluent Bit or Vector, and alert on exception rates and out-of-memory patterns. Correlate log lines with query IDs in `system.query_log` for complete query-level debugging.
