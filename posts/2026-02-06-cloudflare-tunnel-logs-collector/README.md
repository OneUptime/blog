# How to Route Cloudflare Tunnel Access Logs to the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cloudflare Tunnel, Access Logs, Observability

Description: Route Cloudflare Tunnel (cloudflared) access logs to the OpenTelemetry Collector for centralized log collection and observability.

Cloudflare Tunnel (cloudflared) creates secure connections between your origin servers and the Cloudflare network. The tunnel daemon records activity between `cloudflared`, the Cloudflare network, and your origin server. At `debug` log level, it can include request details such as the request URL and method. By routing these logs to the OpenTelemetry Collector, you get centralized visibility into tunnel traffic alongside your application telemetry.

## How cloudflared Logging Works

The `cloudflared` daemon writes logs to stdout/stderr or to a file. You can configure the log level and output destination:

```bash
# Run cloudflared with file-based logging

cloudflared tunnel --loglevel info \
  --logfile /var/log/cloudflared/tunnel.log \
  run my-tunnel
```

Or configure it in the config file:

```yaml
# /etc/cloudflared/config.yml
tunnel: my-tunnel-id
credentials-file: /etc/cloudflared/credentials.json
loglevel: info
logfile: /var/log/cloudflared/tunnel.log

ingress:
  - hostname: app.example.com
    service: http://localhost:8080
  - service: http_status:404
```

## cloudflared Log Format

cloudflared logs look like this:

```text
2026-02-06T10:30:00Z INF Registered tunnel connection connIndex=0 connection=2dafc029-273d-4b94-905b-da28be28c49d event=0 ip=198.41.200.10 location=DFW protocol=quic
2026-02-06T10:30:01Z DBG GET http://localhost:8080/api/users HTTP/2.0 connIndex=0 content-length=-1 event=1
2026-02-06T10:30:02Z ERR  error proxying request to origin error="connection refused" connIndex=0
```

## Collector Configuration for cloudflared Logs

```yaml
# otel-collector-config.yaml
receivers:
  filelog/cloudflared:
    include:
      - /var/log/cloudflared/tunnel.log
    start_at: end
    operators:
      # Parse the timestamp and log level
      - id: parse_header
        type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(?P<level>\w+)\s+(?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: '%Y-%m-%dT%H:%M:%SZ'
        severity:
          parse_from: attributes.level
          mapping:
            debug: DBG
            info: INF
            warn: WRN
            error: ERR
            fatal: FTL

      # Move message to body
      - type: move
        from: attributes.message
        to: body

      # Extract HTTP request details from request logs
      - id: parse_request
        type: regex_parser
        regex: '^(?P<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(?P<url>https?://\S+)\s+(?P<protocol>HTTP/\S+)\s+connIndex=(?P<conn_index>\d+)\s+content-length=(?P<content_length>-?\d+)\s+event=(?P<event>\d+)'
        parse_from: body
        if: 'body matches "^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\\s"'

      # Add a source label
      - type: add
        field: attributes["log.source"]
        value: "cloudflared"

processors:
  batch:
    timeout: 5s
    send_batch_size: 200

  resource:
    attributes:
      - key: service.name
        value: cloudflare-tunnel
        action: upsert
      - key: cloud.provider
        value: cloudflare
        action: upsert

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [filelog/cloudflared]
      processors: [resource, batch]
      exporters: [otlp]
```

## Running as a Docker Sidecar

Run both cloudflared and the Collector in Docker Compose:

```yaml
version: "3.8"

services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml --metrics 0.0.0.0:2000 run
    volumes:
      - ./cloudflared-config.yml:/etc/cloudflared/config.yml
      - ./credentials.json:/etc/cloudflared/credentials.json
      - tunnel-logs:/var/log/cloudflared
    restart: unless-stopped

  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
      - tunnel-logs:/var/log/cloudflared:ro
    ports:
      - "4317:4317"
    restart: unless-stopped

  # Your application
  app:
    image: myorg/app:latest
    ports:
      - "8080:8080"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=my-app

volumes:
  tunnel-logs:
```

## Parsing Connection Events

cloudflared logs connection events that indicate tunnel health:

```yaml
operators:
  # ... existing operators ...

  # Extract connection events
  - id: parse_registered_connection
    type: regex_parser
    regex: 'Registered tunnel connection connIndex=(?P<conn_index>\d+) connection=(?P<connection_id>\S+) event=(?P<event>\d+) ip=(?P<edge_ip>\S+) location=(?P<edge_location>\w+) protocol=(?P<protocol>\S+)'
    parse_from: body
    if: 'body contains "Registered tunnel connection"'

  # Extract disconnection events
  - id: parse_unregistered_connection
    type: regex_parser
    regex: 'Unregistered tunnel connection connIndex=(?P<conn_index>\d+)'
    parse_from: body
    if: 'body contains "Unregistered tunnel"'
```

These events tell you when tunnel connections are established or dropped, which is important for monitoring tunnel stability.

## Collecting cloudflared Metrics

cloudflared exposes Prometheus metrics that you can scrape:

```bash
# Enable metrics endpoint
cloudflared tunnel --metrics 0.0.0.0:2000 run my-tunnel
```

In the Docker Compose setup above, scrape the `cloudflared` service name:

```yaml
receivers:
  prometheus/cloudflared:
    config:
      scrape_configs:
        - job_name: cloudflared
          scrape_interval: 15s
          static_configs:
            - targets: ["cloudflared:2000"]
```

Key metrics include:
- `cloudflared_tunnel_total_requests`: Total requests proxied through all tunnels
- `cloudflared_tunnel_concurrent_requests_per_tunnel`: Concurrent requests proxied through each tunnel
- `cloudflared_tunnel_request_errors`: Proxy errors
- `cloudflared_tunnel_server_locations`: Connected edge locations

## Alerting on Tunnel Issues

Set up alerts for common tunnel problems:

```yaml
# Alert on tunnel disconnections
- alert: TunnelDisconnection
  condition: log contains "Unregistered tunnel connection"
  severity: warning

# Alert on origin errors
- alert: OriginConnectionRefused
  condition: log contains "connection refused"
  severity: critical

# Alert on high error rate (from metrics)
- alert: HighErrorRate
  condition: rate(cloudflared_tunnel_request_errors[5m]) > 10
  severity: warning
```

## Summary

Cloudflare Tunnel logs provide visibility into tunnel connections, proxied requests, and origin errors. The OpenTelemetry Collector's filelog receiver parses these logs into structured records with HTTP attributes and connection metadata. Combine log collection with Prometheus metric scraping for full tunnel observability. Run the Collector as a Docker sidecar alongside cloudflared, sharing a log volume for seamless collection.
