# How to Configure the Filelog Receiver to Parse PostgreSQL Slow Query Logs with Duration Extraction

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PostgreSQL, Slow Queries, Log Parsing, Filelog Receiver

Description: Parse PostgreSQL slow query logs with the OpenTelemetry filelog receiver and extract query duration for performance monitoring.

PostgreSQL can log slow queries when you set `log_min_duration_statement` in your configuration. These logs are invaluable for finding performance bottlenecks, but they are only useful if you can parse them, extract durations, and set up alerts. The filelog receiver can turn these into structured OpenTelemetry logs.

## PostgreSQL Log Configuration

First, configure PostgreSQL to log slow queries. In `postgresql.conf`:

```ini
# Log queries that take longer than 500ms
log_min_duration_statement = 500

# Use a parseable log format
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
```

This produces log lines like:

```
2026-02-06 14:23:45.123 UTC [12345]: [1-1] user=webapp,db=production,app=myapp,client=172.16.0.5 LOG:  duration: 2345.678 ms  statement: SELECT u.*, p.* FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.email LIKE '%@example.com' ORDER BY u.created_at DESC LIMIT 100
```

## Multiline Handling

SQL queries can span multiple lines, so we need multiline grouping:

```yaml
receivers:
  filelog/postgresql:
    include:
      - /var/log/postgresql/postgresql-*.log
    start_at: end
    multiline:
      # New log entries start with a timestamp
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
```

## Parsing the Log Format

```yaml
receivers:
  filelog/postgresql:
    include:
      - /var/log/postgresql/postgresql-*.log
    start_at: end
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
    operators:
      # Step 1: Parse the log line prefix and message
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+) \[(?P<pid>\d+)\]: \[\d+-\d+\] user=(?P<db_user>[^,]*),db=(?P<db_name>[^,]*),app=(?P<app_name>[^,]*),client=(?P<client_addr>[^\s]*) (?P<level>\w+):\s+(?P<message>[\s\S]*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%d %H:%M:%S.%L %Z"
        severity:
          parse_from: attributes.level
          mapping:
            fatal: ["PANIC", "FATAL"]
            error: "ERROR"
            warn: "WARNING"
            info: ["LOG", "INFO", "NOTICE"]
            debug: ["DEBUG", "DEBUG1", "DEBUG2"]

      # Step 2: Extract duration from the message
      - type: regex_parser
        parse_from: attributes.message
        regex: 'duration: (?P<duration_ms>[0-9.]+) ms\s+statement: (?P<sql_statement>[\s\S]*)'
        on_error: send
        preserve_to: attributes.message

      # Step 3: Map to semantic conventions
      - type: move
        from: attributes.db_user
        to: attributes["db.user"]
      - type: move
        from: attributes.db_name
        to: attributes["db.name"]
      - type: move
        from: attributes.client_addr
        to: attributes["client.address"]
      - type: move
        from: attributes.duration_ms
        to: attributes["db.operation.duration_ms"]
        if: 'attributes.duration_ms != nil'
      - type: move
        from: attributes.sql_statement
        to: attributes["db.statement"]
        if: 'attributes.sql_statement != nil'
      - type: move
        from: attributes.message
        to: body

      # Clean up
      - type: remove
        field: attributes.timestamp
      - type: remove
        field: attributes.level
      - type: remove
        field: attributes.pid
```

## Complete Collector Configuration

```yaml
receivers:
  filelog/postgresql:
    include:
      - /var/log/postgresql/postgresql-*.log
    start_at: end
    multiline:
      line_start_pattern: '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \w+) \[(?P<pid>\d+)\]: \[\d+-\d+\] user=(?P<db_user>[^,]*),db=(?P<db_name>[^,]*),app=(?P<app_name>[^,]*),client=(?P<client_addr>[^\s]*) (?P<level>\w+):\s+(?P<message>[\s\S]*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%d %H:%M:%S.%L %Z"
      - type: regex_parser
        parse_from: attributes.message
        regex: 'duration: (?P<duration_ms>[0-9.]+) ms\s+statement: (?P<sql_statement>[\s\S]*)'
        on_error: send
        preserve_to: attributes.message
      - type: move
        from: attributes.db_user
        to: attributes["db.user"]
      - type: move
        from: attributes.db_name
        to: attributes["db.name"]
      - type: move
        from: attributes.duration_ms
        to: attributes["db.operation.duration_ms"]
        if: 'attributes.duration_ms != nil'
      - type: move
        from: attributes.sql_statement
        to: attributes["db.statement"]
        if: 'attributes.sql_statement != nil'
      - type: move
        from: attributes.message
        to: body

processors:
  resource:
    attributes:
      - key: service.name
        value: "postgresql"
        action: upsert

  # Redact any PII that might appear in SQL statements
  transform/redact-sql:
    log_statements:
      - context: log
        statements:
          - replace_pattern(attributes["db.statement"], "'[^']*@[^']*'", "'[EMAIL]'") where attributes["db.statement"] != nil

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog/postgresql]
      processors: [resource, transform/redact-sql, batch]
      exporters: [otlp]
```

## Filtering for Slow Queries Only

If PostgreSQL logs all queries (not just slow ones), you can filter at the Collector level:

```yaml
processors:
  filter/slow-queries-only:
    logs:
      log_record:
        - 'not IsMatch(body, "duration:")'
```

This drops log records that do not contain a duration field, keeping only the slow query entries.

## Creating Metrics from Slow Query Logs

You can use the count connector to generate metrics from slow query logs:

```yaml
connectors:
  count:
    logs:
      postgresql.slow_queries:
        description: "Number of slow queries"
        attributes:
          - key: db.name
          - key: db.user

service:
  pipelines:
    logs/input:
      receivers: [filelog/postgresql]
      processors: [resource]
      exporters: [count, otlp]
    metrics/derived:
      receivers: [count]
      exporters: [otlp]
```

This gives you a `postgresql.slow_queries` metric broken down by database and user, which is great for dashboards and alerting.

Parsing PostgreSQL slow query logs gives you visibility into database performance without needing to modify your application. Combined with the duration extraction, you can alert when queries exceed thresholds and track query performance trends over time.
