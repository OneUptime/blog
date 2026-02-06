# How to Route Cloudflare Tunnel Access Logs to the OpenTelemetry Collector for Centralized Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cloudflare Tunnel, Access Logs, Observability

Description: Route Cloudflare Tunnel (cloudflared) access logs to the OpenTelemetry Collector for centralized log collection and observability.

Cloudflare Tunnel (cloudflared) creates secure connections between your origin servers and the Cloudflare network. The tunnel daemon generates access logs for every request it proxies. By routing these logs to the OpenTelemetry Collector, you get centralized visibility into tunnel traffic alongside your application telemetry.

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

```
2026-02-06T10:30:00Z INF Request connection connIndex=0 ip=198.41.200.10 location=DFW
2026-02-06T10:30:01Z INF  GET  https://app.example.com/api/users 200 origin=http://localhost:8080 originTime=45ms
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
      - type: regex_parser
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
      - type: regex_parser
        regex: '(?P<method>GET|POST|PUT|DELETE|PATCH)\s+(?P<url>https?://\S+)\s+(?P<status>\d+)\s+origin=(?P<origin>\S+)\s+originTime=(?P<origin_time>\S+)'
        parse_from: body
        if: 'body matches "GET|POST|PUT|DELETE|PATCH"'

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
    command: tunnel --config /etc/cloudflared/config.yml run
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
  - type: regex_parser
    regex: 'Request connection connIndex=(?P<conn_index>\d+) ip=(?P<edge_ip>\S+) location=(?P<edge_location>\w+)'
    parse_from: body
    if: 'body contains "Request connection"'

  # Extract disconnection events
  - type: regex_parser
    regex: 'Unregistered tunnel connection connIndex=(?P<conn_index>\d+)'
    parse_from: body
    if: 'body contains "Unregistered tunnel"'
```

These events tell you when tunnel connections are established or dropped, which is important for monitoring tunnel stability.

## Collecting cloudflared Metrics

cloudflared exposes Prometheus metrics that you can scrape:

```bash
# Enable metrics endpoint
cloudflared tunnel --metrics localhost:2000 run my-tunnel
```

```yaml
receivers:
  prometheus/cloudflared:
    config:
      scrape_configs:
        - job_name: cloudflared
          scrape_interval: 15s
          static_configs:
            - targets: ["localhost:2000"]
```

Key metrics include:
- `cloudflared_tunnel_request_per_second`: Request throughput
- `cloudflared_tunnel_response_by_code`: Response codes from origin
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
  condition: rate(cloudflared_tunnel_request_errors) > 10
  severity: warning
```

## Summary

Cloudflare Tunnel logs provide visibility into tunnel connections, proxied requests, and origin errors. The OpenTelemetry Collector's filelog receiver parses these logs into structured records with HTTP attributes and connection metadata. Combine log collection with Prometheus metric scraping for full tunnel observability. Run the Collector as a Docker sidecar alongside cloudflared, sharing a log volume for seamless collection.
