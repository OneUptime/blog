# How to Collect Caddy Structured Access Logs as OpenTelemetry Logs via the Collector Filelog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Caddy, Access Logs, Filelog Receiver

Description: Collect Caddy's structured JSON access logs and convert them into OpenTelemetry log records using the Collector filelog receiver pipeline.

Caddy Server writes structured access logs in JSON format by default. Each log entry contains the request method, URI, status code, response size, and timing information. The OpenTelemetry Collector's filelog receiver can tail these log files and convert them into proper OpenTelemetry log records for centralized analysis.

## Configuring Caddy Access Logs

Enable structured access logging in your Caddyfile:

```
# Caddyfile
{
    log {
        output file /var/log/caddy/access.log {
            roll_size 100mb
            roll_keep 5
            roll_keep_for 720h
        }
        format json
        level INFO
    }
}

:80 {
    log
    reverse_proxy backend:8080
}
```

A Caddy JSON access log entry looks like this:

```json
{
  "level": "info",
  "ts": 1707206400.123,
  "logger": "http.log.access.log0",
  "msg": "handled request",
  "request": {
    "remote_ip": "10.0.0.5",
    "remote_port": "54321",
    "proto": "HTTP/2.0",
    "method": "GET",
    "host": "example.com",
    "uri": "/api/users",
    "headers": {
      "User-Agent": ["curl/8.1"]
    }
  },
  "user_id": "",
  "duration": 0.045,
  "size": 1234,
  "status": 200,
  "resp_headers": {
    "Content-Type": ["application/json"]
  }
}
```

## Collector Configuration

Configure the filelog receiver to parse Caddy's JSON access logs:

```yaml
# otel-collector-config.yaml
receivers:
  filelog/caddy:
    include:
      - /var/log/caddy/access.log
    start_at: end
    operators:
      # Parse the JSON log entry
      - type: json_parser
        # Caddy uses Unix timestamp with decimal
        timestamp:
          parse_from: attributes.ts
          layout_type: epoch
          layout: s.ns

      # Set the severity from the level field
      - type: severity_parser
        parse_from: attributes.level

      # Flatten nested request fields into top-level attributes
      - type: move
        from: attributes.request.method
        to: attributes["http.method"]

      - type: move
        from: attributes.request.uri
        to: attributes["http.url"]

      - type: move
        from: attributes.request.remote_ip
        to: attributes["net.peer.ip"]

      - type: move
        from: attributes.request.host
        to: attributes["http.host"]

      - type: move
        from: attributes.status
        to: attributes["http.status_code"]

      - type: move
        from: attributes.duration
        to: attributes["http.duration_seconds"]

      - type: move
        from: attributes.size
        to: attributes["http.response_content_length"]

      # Set the log body to the message
      - type: move
        from: attributes.msg
        to: body

processors:
  batch:
    timeout: 5s
    send_batch_size: 500

  resource:
    attributes:
      - key: service.name
        value: caddy
        action: upsert
      - key: service.type
        value: reverse-proxy
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/caddy]
      processors: [resource, batch]
      exporters: [otlp]
```

## Adding Trace Correlation

When Caddy has tracing enabled, you can include the trace ID in the access log and correlate logs with traces. Caddy includes the trace ID in its log output when the `tracing` directive is active:

```
{
    tracing {
        span "caddy"
    }
    log {
        output file /var/log/caddy/access.log
        format json
    }
}

:80 {
    tracing
    log
    reverse_proxy backend:8080
}
```

The log entry will include `tracing_span` and `tracing_trace` fields. Parse them in the Collector:

```yaml
operators:
  - type: json_parser
    timestamp:
      parse_from: attributes.ts
      layout_type: epoch
      layout: s.ns

  # Extract trace context from the log entry
  - type: trace_parser
    trace_id:
      parse_from: attributes.tracing_trace
    span_id:
      parse_from: attributes.tracing_span
```

This links each access log entry to its corresponding trace, allowing you to jump from a log record directly to the trace in your observability UI.

## Docker Compose Setup

```yaml
version: "3.8"

services:
  caddy:
    image: caddy:latest
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-logs:/var/log/caddy
    ports:
      - "80:80"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
      - caddy-logs:/var/log/caddy:ro
    ports:
      - "4317:4317"

volumes:
  caddy-logs:
```

The shared volume `caddy-logs` allows the Collector to read Caddy's access logs without running in the same container.

## Filtering Logs

You may not want every access log entry. Filter out health check endpoints and static assets:

```yaml
operators:
  - type: json_parser
    timestamp:
      parse_from: attributes.ts
      layout_type: epoch
      layout: s.ns

  # Drop health check requests
  - type: filter
    expr: 'attributes.request.uri == "/health" or attributes.request.uri == "/ready"'

  # Drop static asset requests
  - type: filter
    expr: 'attributes.request.uri matches "\\.(css|js|png|jpg|ico)$"'
```

## Parsing Response Times for Alerting

Caddy logs include the `duration` field in seconds. Use the transform processor to create alerts on slow responses:

```yaml
processors:
  transform:
    log_statements:
      - context: log
        statements:
          # Flag slow requests (over 2 seconds)
          - set(attributes["slow_request"], "true") where attributes["http.duration_seconds"] > 2.0
```

## Summary

Caddy's structured JSON access logs pair naturally with the OpenTelemetry Collector's filelog receiver. Parse the JSON format, extract HTTP attributes into standard fields, and optionally correlate logs with traces using Caddy's built-in trace ID logging. Share the log directory between containers using Docker volumes, and filter out noise from health checks and static assets.
