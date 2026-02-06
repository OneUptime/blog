# How to Implement Multi-Region OpenTelemetry Collector Deployments with Active-Active Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Multi-Region, Failover, High Availability

Description: Deploy OpenTelemetry Collectors across multiple regions with active-active failover to maintain observability during regional outages.

Running OpenTelemetry Collectors in a single region means a regional outage takes out both your applications and your ability to observe the failure. Multi-region active-active deployments solve this by ensuring telemetry collection continues even when an entire region goes offline. This post covers the architecture and configuration for a production-grade multi-region OTel Collector setup.

## Active-Active vs Active-Passive

In an active-passive setup, one region handles all traffic while the other sits idle. In active-active, both regions process telemetry simultaneously. Active-active is better for OTel because:

- No failover delay when a region goes down
- Both regions share the load during normal operation
- You get regional redundancy of telemetry data by default
- No wasted infrastructure sitting idle

## Architecture Overview

Each region runs its own Collector fleet and telemetry backend. Applications in each region send data to the local Collector first, but the Collectors also forward data cross-region for redundancy. A global load balancer routes external queries to the nearest healthy backend.

## Regional Collector Configuration

Each region's Collector receives local data and forwards a copy to the other region's gateway Collector.

```yaml
# otel-collector-region-us-east.yaml
# Collector config for US-East region with cross-region forwarding

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Tag all data with the originating region
  resource/region:
    attributes:
      - key: deployment.region
        value: "us-east-1"
        action: upsert

  batch:
    send_batch_size: 1024
    timeout: 5s

  # Memory limiter to prevent OOM during cross-region backpressure
  memory_limiter:
    check_interval: 1s
    limit_mib: 1024
    spike_limit_mib: 256

exporters:
  # Local backend in the same region - primary destination
  otlp/local:
    endpoint: tempo.us-east-1.monitoring.svc:4317
    sending_queue:
      enabled: true
      queue_size: 5000
      storage: file_storage/local
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s

  # Cross-region forward to EU-West gateway
  otlp/cross-region:
    endpoint: otel-gateway.eu-west-1.example.com:4317
    tls:
      cert_file: /certs/cross-region-client.crt
      key_file: /certs/cross-region-client.key
      ca_file: /certs/cross-region-ca.crt
    sending_queue:
      enabled: true
      queue_size: 10000
      # Persistent queue so cross-region data survives restarts
      storage: file_storage/cross_region
    retry_on_failure:
      enabled: true
      initial_interval: 10s
      max_interval: 300s
      # Retry for up to 30 minutes during a regional outage
      max_elapsed_time: 1800s
    # Compression reduces cross-region bandwidth costs
    compression: zstd

extensions:
  file_storage/local:
    directory: /var/otel/queue/local
  file_storage/cross_region:
    directory: /var/otel/queue/cross-region

service:
  extensions: [file_storage/local, file_storage/cross_region]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource/region, batch]
      # Export to both local and cross-region backends
      exporters: [otlp/local, otlp/cross-region]
```

## Gateway Collector for Cross-Region Ingestion

Each region runs a gateway Collector that accepts forwarded data from other regions and writes it to the local backend.

```yaml
# otel-gateway-receiver.yaml
# Gateway collector that accepts cross-region forwarded telemetry

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        # TLS required for cross-region traffic
        tls:
          cert_file: /certs/gateway-server.crt
          key_file: /certs/gateway-server.key
          client_ca_file: /certs/cross-region-ca.crt

processors:
  # Tag cross-region data so we can distinguish it from local data
  attributes/cross-region:
    actions:
      - key: telemetry.source
        value: "cross-region-forward"
        action: insert

  batch:
    send_batch_size: 1024
    timeout: 10s

exporters:
  # Write cross-region data to the local backend
  otlp/local-backend:
    endpoint: tempo.eu-west-1.monitoring.svc:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/cross-region, batch]
      exporters: [otlp/local-backend]
```

## DNS-Based Global Load Balancing

Use Route 53 health checks (or equivalent) to route queries to the nearest healthy region.

```yaml
# terraform/global-dns.tf
# Route 53 configuration for global telemetry query routing

resource "aws_route53_health_check" "tempo_us_east" {
  fqdn              = "tempo-query.us-east-1.internal.example.com"
  port               = 3200
  type               = "HTTP"
  resource_path      = "/ready"
  failure_threshold  = 3
  request_interval   = 10
}

resource "aws_route53_health_check" "tempo_eu_west" {
  fqdn              = "tempo-query.eu-west-1.internal.example.com"
  port               = 3200
  type               = "HTTP"
  resource_path      = "/ready"
  failure_threshold  = 3
  request_interval   = 10
}

# Latency-based routing with health check failover
resource "aws_route53_record" "tempo_global" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "tempo-query.global.internal.example.com"
  type    = "A"

  # US-East record
  set_identifier = "us-east-1"
  latency_routing_policy {
    region = "us-east-1"
  }
  health_check_id = aws_route53_health_check.tempo_us_east.id
  alias {
    name                   = aws_lb.tempo_us_east.dns_name
    zone_id                = aws_lb.tempo_us_east.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "tempo_global_eu" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "tempo-query.global.internal.example.com"
  type    = "A"

  set_identifier = "eu-west-1"
  latency_routing_policy {
    region = "eu-west-1"
  }
  health_check_id = aws_route53_health_check.tempo_eu_west.id
  alias {
    name                   = aws_lb.tempo_eu_west.dns_name
    zone_id                = aws_lb.tempo_eu_west.zone_id
    evaluate_target_health = true
  }
}
```

## Kubernetes Deployment with Anti-Affinity

Spread Collector pods across availability zones within each region so a single AZ failure does not take out the fleet.

```yaml
# k8s-collector-deployment.yaml
# OTel Collector deployment with zone-aware scheduling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 6
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      # Spread pods across availability zones
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: otel-collector
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2"
              memory: "2Gi"
          volumeMounts:
            - name: queue-storage
              mountPath: /var/otel/queue
      volumes:
        - name: queue-storage
          persistentVolumeClaim:
            claimName: otel-collector-queue
```

## Monitoring the Multi-Region Setup

Track cross-region replication lag and queue depth to catch problems early.

```yaml
# cross-region-alerts.yaml
groups:
  - name: otel-multi-region
    rules:
      # Alert when cross-region queue builds up
      - alert: CrossRegionQueueBacklog
        expr: otelcol_exporter_queue_size{exporter="otlp/cross-region"} > 5000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cross-region telemetry queue has {{ $value }} items"

      # Alert when cross-region export is completely failing
      - alert: CrossRegionExportDown
        expr: rate(otelcol_exporter_send_failed_spans_total{exporter="otlp/cross-region"}[5m]) > 0
          and rate(otelcol_exporter_sent_spans_total{exporter="otlp/cross-region"}[5m]) == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Cross-region telemetry export has completely stopped"
```

## Summary

Multi-region active-active OTel Collector deployments give you resilience against regional outages while distributing query load across regions. The key patterns are region tagging at the source, cross-region forwarding with persistent queues and aggressive retry, gateway Collectors for receiving forwarded data, and DNS-based routing for queries. The cross-region queue is the critical component - size it generously and back it with persistent storage so you can weather extended outages without data loss.
