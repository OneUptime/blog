# How to Set Up HTTP Endpoint Health Checks Using the OpenTelemetry HTTP Check Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HTTP Health Checks, Synthetic Monitoring, Receiver

Description: Configure the OpenTelemetry HTTP Check receiver to continuously monitor endpoint availability and response times from your collector.

Synthetic monitoring tells you whether your services are reachable before your users tell you they are not. The OpenTelemetry Collector's `httpcheck` receiver lets you run HTTP health checks directly from the collector, producing standard OpenTelemetry metrics that feed into your existing dashboards and alerting pipeline.

No extra agents, no third-party synthetic monitoring tools, no separate data pipeline. Just another receiver in your collector config.

## Installing the HTTP Check Receiver

The `httpcheck` receiver is part of the OpenTelemetry Collector Contrib distribution. If you are using the core distribution, you will need to switch to Contrib or build a custom collector that includes it.

Verify the receiver is available in your collector build:

```bash
# Check if the httpcheck receiver is included in your collector binary.
# This lists all supported components.
otelcol-contrib components | grep httpcheck
```

## Basic Configuration

Here is a straightforward setup that checks three HTTP endpoints every 60 seconds:

```yaml
# collector-httpcheck.yaml
# Configure the httpcheck receiver to probe three endpoints.
# Each target produces metrics for response time, status code,
# and availability that feed into the metrics pipeline.

receivers:
  httpcheck:
    targets:
      - endpoint: "https://api.example.com/health"
        method: GET
      - endpoint: "https://web.example.com/"
        method: GET
      - endpoint: "https://auth.example.com/status"
        method: GET
    collection_interval: 60s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [httpcheck]
      processors: [batch]
      exporters: [otlp]
```

This generates metrics like `httpcheck.duration`, `httpcheck.status`, and `httpcheck.error` for each target endpoint.

## Advanced Configuration with Headers and TLS

Real-world health checks often need authentication headers, custom TLS settings, or specific request bodies. Here is a more complete configuration:

```yaml
# collector-httpcheck-advanced.yaml
# Advanced httpcheck configuration with authentication, custom headers,
# TLS verification, and timeout settings per target.

receivers:
  httpcheck:
    targets:
      # Public-facing API with bearer token auth
      - endpoint: "https://api.example.com/v2/health"
        method: GET
        headers:
          Authorization: "Bearer ${env:API_HEALTH_TOKEN}"
          Accept: "application/json"

      # Internal service with mutual TLS
      - endpoint: "https://internal-service.corp:8443/ready"
        method: GET
        tls:
          ca_file: "/etc/ssl/certs/internal-ca.pem"
          cert_file: "/etc/ssl/certs/client.pem"
          key_file: "/etc/ssl/private/client-key.pem"

      # Service that requires a POST with a body
      - endpoint: "https://graphql.example.com/health"
        method: POST
        headers:
          Content-Type: "application/json"
        body: '{"query": "{ health { status } }"}'

    collection_interval: 30s

processors:
  # Add resource attributes to identify the check source
  resource:
    attributes:
      - key: monitor.source
        value: "otel-collector-synthetic"
        action: upsert
      - key: monitor.region
        value: "${env:MONITOR_REGION}"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.example.com:4317"

service:
  pipelines:
    metrics:
      receivers: [httpcheck]
      processors: [resource, batch]
      exporters: [otlp]
```

Using environment variables for secrets (like `${env:API_HEALTH_TOKEN}`) keeps credentials out of the config file. The resource processor adds metadata about where the check ran, which is useful when you run checks from multiple regions.

## Understanding the Metrics

The `httpcheck` receiver produces these metrics:

- `httpcheck.duration` - response time in milliseconds
- `httpcheck.status` - HTTP status code returned (as a gauge)
- `httpcheck.error` - count of check errors (connection refused, timeout, DNS failure)

Each metric includes attributes like `http.url`, `http.method`, and `http.status_code` that you can use for filtering and grouping.

## Building Alerts on HTTP Check Metrics

With the metrics flowing into your backend, you can build alerts using standard PromQL or whatever query language your backend supports:

```yaml
# httpcheck-alerts.yaml
# Alert rules based on HTTP check receiver metrics.
# These detect both hard failures and latency degradation.

groups:
  - name: http-endpoint-health
    rules:
      # Alert when an endpoint returns a non-2xx status
      - alert: EndpointUnhealthy
        expr: httpcheck_status < 200 or httpcheck_status >= 300
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Endpoint {{ $labels.http_url }} returning status {{ $value }}"

      # Alert when response time exceeds 2 seconds
      - alert: EndpointSlowResponse
        expr: httpcheck_duration > 2000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Endpoint {{ $labels.http_url }} response time {{ $value }}ms"

      # Alert when checks are producing errors (connection failures)
      - alert: EndpointCheckError
        expr: rate(httpcheck_error_total[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "HTTP check errors for {{ $labels.http_url }}"
```

## Running Checks from Multiple Locations

For a complete picture of endpoint availability, run the same checks from collectors deployed in different regions. Use the resource processor to tag each check with its source location:

```yaml
# multi-region-check.yaml
# Deploy this config in each region with a different MONITOR_REGION env var.
# This gives you per-region availability data for each endpoint.

processors:
  resource:
    attributes:
      - key: check.region
        value: "${env:MONITOR_REGION}"
        action: upsert
      - key: check.collector_id
        value: "${env:HOSTNAME}"
        action: upsert
```

Then in your dashboards, group by `check.region` to see availability from each vantage point. An endpoint that is reachable from us-east-1 but not from eu-west-1 tells a very different story than one that is down everywhere.

## Comparing with Dedicated Synthetic Monitoring

The `httpcheck` receiver is not a replacement for full synthetic monitoring platforms that offer browser-based checks, multi-step transactions, and screenshot capture. It handles straightforward HTTP availability and latency monitoring, which covers the majority of health check use cases.

The big advantage is integration. Your HTTP check data flows through the same pipeline as your application metrics, traces, and logs. Correlating a spike in endpoint latency with a deployment event or a change in downstream service performance becomes trivial when all the data lives in the same backend.

Start with the `httpcheck` receiver for your critical endpoints. If you find yourself needing browser automation or complex multi-step checks, those are valid reasons to look at dedicated tools. But for "is this endpoint up and responding quickly," the collector has you covered.
