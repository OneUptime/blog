# How to Configure OpenTelemetry Collector for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenTelemetry, Observability, Tracing, Metric, Log

Description: Configure the OpenTelemetry Collector to listen on IPv6 interfaces, receive telemetry from IPv6 sources, and export to IPv6-addressed backends like Jaeger, Prometheus, and Loki.

## Introduction

The OpenTelemetry Collector is a vendor-agnostic agent for receiving, processing, and exporting telemetry data (traces, metrics, logs). It supports IPv6 by binding receivers to `[::]:port` and connecting exporters to IPv6 endpoints. This guide covers receiver IPv6 binding, processor IPv6 attribute enrichment, and exporter IPv6 configuration.

## Step 1: Receiver Configuration on IPv6

```yaml
# /etc/otelcol/config.yaml

receivers:
  # OTLP receiver - all interfaces (IPv4 and IPv6)
  otlp:
    protocols:
      grpc:
        endpoint: "[::]:4317"
      http:
        endpoint: "[::]:4318"

  # Prometheus receiver for scraping IPv6 targets
  prometheus:
    config:
      scrape_configs:
        - job_name: ipv6-targets
          scrape_interval: 15s
          static_configs:
            - targets:
                - "[2001:db8::10]:9100"    # node_exporter on IPv6
                - "[2001:db8::11]:8080"    # app metrics on IPv6

  # Syslog receiver on IPv6
  syslog:
    tcp:
      listen_address: "[::]:5140"
    protocol: rfc5424

  # Jaeger receiver on IPv6
  jaeger:
    protocols:
      thrift_http:
        endpoint: "[::]:14268"
      grpc:
        endpoint: "[::]:14250"
```

## Step 2: Processors for IPv6 Attribute Enrichment

```yaml
processors:
  # Batch processor (standard, not IPv6-specific)
  batch:
    timeout: 10s
    send_batch_size: 1000

  # Attributes processor: normalize IPv6 source addresses
  attributes/normalize_ipv6:
    actions:
      - key: client.address
        action: update
        # Note: full normalization requires a custom processor or transform
      - key: ip.version
        action: insert
        value: "ipv6"

  # Resource processor: add IPv6 network context
  resource:
    attributes:
      - key: network.type
        action: insert
        value: "ipv6"

  # Transform processor: extract ip_version from client.address
  transform/add_ip_version:
    log_statements:
      - context: log
        statements:
          - set(attributes["ip_version"],
              "ipv6") where IsMatch(attributes["client.address"], ".*:.*")
          - set(attributes["ip_version"],
              "ipv4") where not IsMatch(attributes["client.address"], ".*:.*")
    trace_statements:
      - context: span
        statements:
          - set(attributes["ip_version"],
              "ipv6") where IsMatch(attributes["net.peer.ip"], ".*:.*")
```

## Step 3: Exporter Configuration for IPv6 Backends

```yaml
exporters:
  # OTLP exporter to IPv6 backend
  otlp:
    endpoint: "[2001:db8::20]:4317"
    tls:
      insecure: true

  # OTLP/HTTP to IPv6 backend
  otlphttp:
    endpoint: "http://[2001:db8::20]:4318"

  # OTLP exporter to Jaeger over IPv6 (Jaeger v1.35+ accepts OTLP natively;
  # the standalone jaeger exporter was removed from collector-contrib)
  otlp/jaeger:
    endpoint: "[2001:db8::30]:4317"
    tls:
      insecure: true

  # Prometheus exporter (pull-based, bind on IPv6)
  prometheus:
    endpoint: "[::]:8888"

  # OTLP/HTTP to Loki over IPv6 (Loki v3+ accepts OTLP at /otlp;
  # the standalone loki exporter is deprecated)
  otlphttp/loki:
    endpoint: "http://[2001:db8::40]:3100/otlp"

  # Elasticsearch exporter over IPv6
  elasticsearch:
    endpoint: "http://[2001:db8::10]:9200"
    index: "otel-logs"
```

## Step 4: Full Pipeline Configuration

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp, jaeger]
      processors: [batch, transform/add_ip_version]
      exporters: [otlp, otlp/jaeger]

    metrics:
      receivers: [otlp, prometheus]
      processors: [batch]
      exporters: [prometheus, otlphttp]

    logs:
      receivers: [otlp, syslog]
      processors: [batch, transform/add_ip_version, resource]
      exporters: [otlphttp/loki, elasticsearch]

  telemetry:
    logs:
      level: info
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: "::"
                port: 8888
```

## Step 5: Deploy as Docker Container with IPv6

```bash
# Run OTel Collector with IPv6 access

docker run -d \
  --name otelcol \
  --network host \
  -v /etc/otelcol/config.yaml:/etc/otelcol/config.yaml:ro \
  otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol/config.yaml

# Verify it listens on IPv6
ss -tlnp | grep -E "4317|4318|8888"
```

## Conclusion

The OpenTelemetry Collector supports IPv6 by specifying `[::]:port` endpoint addresses in receivers for all-interface IPv6 binding, and IPv6 bracket-notation addresses in exporters for connecting to IPv6 backends. The transform processor enables adding `ip_version` attributes to telemetry data for downstream filtering. When deploying in Kubernetes dual-stack clusters, the Collector automatically gets IPv6 pod addresses and can communicate with other pods over IPv6 without additional configuration.
