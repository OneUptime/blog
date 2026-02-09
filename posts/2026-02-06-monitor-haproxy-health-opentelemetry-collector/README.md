# How to Monitor HAProxy Load Balancer Health with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, HAProxy, Load Balancer, Metrics, Infrastructure, Observability

Description: Learn how to monitor HAProxy load balancer health metrics using the OpenTelemetry Collector to track backend availability, request rates, and error ratios.

---

HAProxy is one of the most widely deployed load balancers and reverse proxies in production infrastructure. It sits in front of your web servers, API gateways, and microservices, distributing traffic and absorbing failures. When HAProxy has problems, everything behind it has problems. That makes monitoring HAProxy critical for maintaining service availability.

The OpenTelemetry Collector includes an HAProxy receiver in its contrib distribution that connects to HAProxy's built-in stats interface and converts those statistics into OpenTelemetry metrics. This lets you monitor your load balancer health through the same pipeline you use for application telemetry.

## How HAProxy Exposes Metrics

HAProxy has a built-in statistics page and a CSV endpoint that expose detailed information about frontends, backends, and individual servers. The stats interface shows request rates, error counts, connection stats, health check results, queue depths, and response times. This data is available over HTTP or through a Unix socket.

The HAProxy receiver in the OpenTelemetry Collector connects to this stats endpoint, parses the CSV output, and translates it into structured OpenTelemetry metrics.

```mermaid
graph LR
    A[HAProxy Stats] -->|CSV over HTTP/Socket| B[HAProxy Receiver]
    B -->|Frontend Metrics| C[OTel Pipeline]
    B -->|Backend Metrics| C
    B -->|Server Metrics| C
    C --> D[Processors]
    D --> E[Exporters]
    E --> F[OneUptime / Backend]
```

## Prerequisites

Before configuring the Collector, you need to enable the HAProxy stats interface. Add the following to your HAProxy configuration if it is not already present.

```
# In haproxy.cfg
# Enable the stats page on port 8404
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s
    # Optional: require authentication
    stats auth admin:your_secure_password
```

Reload HAProxy to apply the changes.

```bash
# Test the config first
haproxy -c -f /etc/haproxy/haproxy.cfg

# Reload without dropping connections
sudo systemctl reload haproxy

# Verify stats are accessible
curl -s "http://localhost:8404/stats;csv"
```

The CSV endpoint should return a large block of comma-separated data with columns like pxname, svname, scur, smax, and so on. If you see that output, the stats interface is working.

You also need the Collector contrib distribution, as the HAProxy receiver is not in the core build.

## Basic Configuration

Here is a straightforward configuration that collects HAProxy metrics and exports them.

```yaml
# Receivers section
receivers:
  # HAProxy receiver connects to the stats endpoint
  haproxy:
    # HTTP endpoint for HAProxy stats CSV
    endpoint: http://localhost:8404/stats?stats;csv
    # How often to scrape metrics
    collection_interval: 15s

# Processors
processors:
  # Batch metrics before export
  batch:
    timeout: 10s
    send_batch_size: 200

# Exporters
exporters:
  # Send to OneUptime via OTLP
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# Service pipelines
service:
  pipelines:
    metrics:
      receivers: [haproxy]
      processors: [batch]
      exporters: [otlphttp]
```

This minimal setup connects to HAProxy stats and starts shipping metrics. The receiver automatically collects all available metrics from frontends, backends, and individual servers.

## Understanding HAProxy Metrics

The receiver collects metrics across three scopes: frontends, backends, and servers. Understanding what each scope tells you is key to effective monitoring.

**Frontend metrics** describe traffic arriving at HAProxy. These include total connections, current sessions, request rates, and bytes in/out. Frontends are the entry points where clients connect.

**Backend metrics** describe the pool of servers behind a frontend. These include queue depth, connection errors, response times, and retry counts. Backends represent your application server groups.

**Server metrics** describe individual servers within a backend. These include health check status, current sessions, response times, and error counts for each specific server.

## Production Configuration with Authentication

For production deployments, your stats endpoint should require authentication. Here is a configuration that handles that along with additional processing.

```yaml
receivers:
  haproxy:
    # Stats endpoint with authentication
    endpoint: http://admin:${HAPROXY_STATS_PASSWORD}@localhost:8404/stats?stats;csv
    collection_interval: 15s
    # Timeout for stats requests
    timeout: 10s

    # Enable all metric categories
    metrics:
      haproxy.connections.rate:
        enabled: true
      haproxy.requests.rate:
        enabled: true
      haproxy.requests.total:
        enabled: true
      haproxy.bytes.input:
        enabled: true
      haproxy.bytes.output:
        enabled: true
      haproxy.connections.errors:
        enabled: true
      haproxy.requests.errors:
        enabled: true
      haproxy.responses.errors:
        enabled: true
      haproxy.server.check.status:
        enabled: true
      haproxy.sessions.current:
        enabled: true
      haproxy.requests.queued.current:
        enabled: true
      haproxy.requests.denied:
        enabled: true
      haproxy.responses.denied:
        enabled: true

processors:
  # Add resource attributes
  resourcedetection:
    detectors: [system, env]
    timeout: 5s

  # Tag metrics with environment info
  attributes/haproxy:
    actions:
      - key: service.name
        value: "haproxy"
        action: insert
      - key: deployment.environment
        value: "production"
        action: insert
      - key: haproxy.cluster
        value: "web-lb"
        action: insert

  # Batch for efficiency
  batch:
    timeout: 10s
    send_batch_size: 500

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    compression: gzip
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    metrics:
      receivers: [haproxy]
      processors: [resourcedetection, attributes/haproxy, batch]
      exporters: [otlphttp]
```

The resource detection processor automatically adds hostname and OS information. The attributes processor tags all HAProxy metrics with the service name and environment, which makes filtering and dashboarding much easier.

## Monitoring Multiple HAProxy Instances

If you run HAProxy in a high-availability pair or across multiple tiers, you can monitor all instances from a single Collector.

```yaml
receivers:
  # Primary load balancer
  haproxy/primary:
    endpoint: http://admin:${HAPROXY_STATS_PASSWORD}@lb-primary.internal:8404/stats?stats;csv
    collection_interval: 15s
    timeout: 10s

  # Secondary load balancer (standby)
  haproxy/secondary:
    endpoint: http://admin:${HAPROXY_STATS_PASSWORD}@lb-secondary.internal:8404/stats?stats;csv
    collection_interval: 15s
    timeout: 10s

processors:
  # Label the primary
  attributes/primary:
    actions:
      - key: haproxy.instance
        value: "lb-primary"
        action: insert
      - key: haproxy.role
        value: "active"
        action: insert

  # Label the secondary
  attributes/secondary:
    actions:
      - key: haproxy.instance
        value: "lb-secondary"
        action: insert
      - key: haproxy.role
        value: "standby"
        action: insert

  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics/primary:
      receivers: [haproxy/primary]
      processors: [attributes/primary, batch]
      exporters: [otlphttp]

    metrics/secondary:
      receivers: [haproxy/secondary]
      processors: [attributes/secondary, batch]
      exporters: [otlphttp]
```

Each HAProxy instance gets its own receiver and pipeline with distinct labels. This lets you compare active vs standby health, detect failover events, and make sure both nodes are configured consistently.

## Collecting HAProxy Logs

Beyond metrics, HAProxy produces valuable access and error logs. You can collect these with the filelog receiver and ship them through the same pipeline.

```yaml
receivers:
  # HAProxy metrics
  haproxy:
    endpoint: http://admin:${HAPROXY_STATS_PASSWORD}@localhost:8404/stats?stats;csv
    collection_interval: 15s

  # HAProxy access logs
  filelog/haproxy:
    include:
      - /var/log/haproxy.log
    start_at: end
    # Parse the standard HAProxy log format
    operators:
      - type: regex_parser
        regex: '(?P<client_ip>\S+):(?P<client_port>\d+)\s+\[(?P<timestamp>[^\]]+)\]\s+(?P<frontend>\S+)\s+(?P<backend>\S+)/(?P<server>\S+)\s+(?P<tq>\d+)/(?P<tw>\d+)/(?P<tc>\d+)/(?P<tr>\d+)/(?P<tt>\d+)\s+(?P<status_code>\d+)\s+(?P<bytes_read>\d+)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%d/%b/%Y:%H:%M:%S.%f"

processors:
  # Add service context to logs
  attributes/logs:
    actions:
      - key: service.name
        value: "haproxy"
        action: insert
      - key: log.source
        value: "haproxy-access"
        action: insert

  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    metrics:
      receivers: [haproxy]
      processors: [batch]
      exporters: [otlphttp]

    logs:
      receivers: [filelog/haproxy]
      processors: [attributes/logs, batch]
      exporters: [otlphttp]
```

The regex parser extracts structured fields from HAProxy log lines, including client IP, backend and server names, timing breakdown (queue time, connect time, response time, total time), HTTP status code, and bytes transferred. These structured fields make it easy to query and filter in your backend.

## Key Metrics to Watch

Not all HAProxy metrics carry the same weight. Here are the ones to prioritize in your dashboards and alerts.

**Backend server health.** The `haproxy.server.check.status` metric tells you whether each backend server is up, down, or in maintenance. Alert immediately when a server goes down.

**Request error rate.** The `haproxy.requests.errors` and `haproxy.responses.errors` metrics show connection failures and bad responses. A sudden spike usually means a backend is unhealthy.

**Queue depth.** The `haproxy.requests.queued.current` metric indicates requests waiting for a free server. A growing queue means your backends cannot keep up with demand.

**Session count.** Track `haproxy.sessions.current` against your configured session limits. Approaching the limit means traffic is growing beyond your capacity.

**Connection rate.** The `haproxy.connections.rate` metric shows how fast new connections arrive. Use this for capacity planning and to detect traffic anomalies.

**Denied requests.** The `haproxy.requests.denied` metric counts requests blocked by ACLs. A spike could indicate an attack or a misconfigured rule blocking legitimate traffic.

## Troubleshooting

If the receiver is not collecting metrics, check these items.

First, verify the stats endpoint is accessible from the Collector host.

```bash
# Test without auth
curl -s http://localhost:8404/stats?stats;csv | head -5

# Test with auth
curl -s http://admin:password@localhost:8404/stats?stats;csv | head -5
```

Second, make sure the URL in the receiver configuration includes the `?stats;csv` query string. Without it, HAProxy returns the HTML stats page instead of the CSV data the receiver expects.

Third, check that HAProxy is not rate-limiting the stats endpoint. Under heavy load, HAProxy might delay stats responses.

Fourth, enable debug logging on the Collector.

```yaml
service:
  telemetry:
    logs:
      level: debug
```

Look for errors related to HTTP connection failures, authentication issues, or CSV parsing problems.

## Summary

HAProxy is a critical piece of infrastructure that deserves thorough monitoring. The OpenTelemetry Collector HAProxy receiver gives you frontend, backend, and server-level metrics through your existing telemetry pipeline. Pair it with log collection using the filelog receiver and you get both high-level health indicators and detailed request-level data.

Focus your alerting on backend health checks, error rates, and queue depth for the fastest detection of problems. Use attributes to label instances and environments so you can slice and dice the data in your dashboards.

OneUptime provides native OpenTelemetry ingestion with built-in dashboarding and alerting, making it a natural fit for HAProxy observability alongside your application metrics and traces.
