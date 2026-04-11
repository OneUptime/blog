# How to Integrate Redis with OpenTelemetry (Metrics)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, OpenTelemetry, Metric, Observability, Monitoring

Description: Learn how to collect Redis metrics with OpenTelemetry - using the Redis receiver in the OTel Collector, custom metrics from client code, and exporting to your observability backend.

---

OpenTelemetry provides a standardized way to collect Redis metrics and export them to any observability backend. This guide covers using the OpenTelemetry Collector's built-in Redis receiver and instrumenting your application code to emit Redis-related custom metrics.

## Using the OpenTelemetry Collector Redis Receiver

The OTel Collector has a built-in `redis` receiver that scrapes Redis INFO statistics:

```yaml
# otel-collector-config.yaml
receivers:
  redis:
    endpoint: "redis:6379"
    collection_interval: 10s
    password: "${REDIS_PASSWORD}"
    tls:
      insecure: true

processors:
  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "http://backend:4317"

service:
  pipelines:
    metrics:
      receivers: [redis]
      processors: [batch]
      exporters: [otlp]
```

This collects metrics like memory usage, connected clients, keyspace hits/misses, and command counts automatically.

## Key Metrics Collected by the Redis Receiver

The receiver exposes these metrics (among others):

```text
redis.clients.connected           - Current connected clients
redis.memory.used                 - Bytes used by data
redis.keyspace.hits               - Total keyspace hits
redis.keyspace.misses             - Total keyspace misses
redis.commands.processed          - Total commands processed
redis.net.input                   - Total bytes read from the network
redis.net.output                  - Total bytes written to the network
redis.rdb.changes_since_last_save - Unsaved changes count
redis.uptime                      - Server uptime in seconds
```

## Deploy the Collector as a Sidecar

For Kubernetes deployments, run the collector as a sidecar:

```yaml
# kubernetes pod spec snippet
containers:
  - name: redis
    image: redis:7-alpine
    ports:
      - containerPort: 6379
  - name: otel-collector
    image: otel/opentelemetry-collector-contrib:latest
    args: ["--config=/etc/otel/config.yaml"]
    volumeMounts:
      - name: otel-config
        mountPath: /etc/otel
volumes:
  - name: otel-config
    configMap:
      name: otel-collector-config
```

## Emit Custom Metrics from Application Code

Emit application-level Redis metrics using the OTel Metrics API:

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=15000
)
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter(__name__)

cache_hit_counter = meter.create_counter(
    "app.redis.cache_hits",
    description="Number of Redis cache hits"
)
cache_miss_counter = meter.create_counter(
    "app.redis.cache_misses",
    description="Number of Redis cache misses"
)

def get_from_cache(key: str):
    value = redis_client.get(key)
    if value:
        cache_hit_counter.add(1, {"key_prefix": key.split(":")[0]})
        return value
    cache_miss_counter.add(1, {"key_prefix": key.split(":")[0]})
    return None
```

## Create a Hit Rate Gauge

Track cache hit rate as a gauge metric:

```python
total_hits = 0
total_requests = 0

def get_hit_rate(options):
    if total_requests == 0:
        return
    rate = (total_hits / total_requests) * 100
    yield metrics.Observation(rate, {"service": "user-api"})

hit_rate_gauge = meter.create_observable_gauge(
    "app.redis.cache_hit_rate",
    callbacks=[get_hit_rate],
    description="Cache hit rate percentage"
)
```

## Summary

OpenTelemetry provides two complementary approaches for Redis metrics: the Collector's Redis receiver for server-level stats, and the OTel Metrics API for application-level metrics like cache hit rate. Use both together for complete visibility. Deploy the Collector as a sidecar in Kubernetes and export to any backend that speaks OTLP - Prometheus, Grafana Cloud, Datadog, or OneUptime.
