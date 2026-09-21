# How to Bridge OTLP to OpenMetrics with the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Prometheus, Monitoring, Observability, Python

Description: Expose OTLP metrics through the OpenTelemetry Collector Prometheus exporter with OpenMetrics enabled, and verify translation, timestamps, and series identity.

---

Applications that push OTLP metrics can coexist with a Prometheus deployment that pulls metrics. The OpenTelemetry Collector receives OTLP, retains the exporter state, and serves a scrape endpoint. Enabling that endpoint is only part of the setup: you must also negotiate OpenMetrics and verify how metric names and attributes translate.

Use a Collector distribution containing the Prometheus exporter. Its [official component documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md) documents `endpoint`, `enable_open_metrics`, timestamps, expiration, and translation options. Pin a release and check the documentation at that release, because optional fields evolve.

## Configure a small metrics pipeline

This configuration receives OTLP over HTTP and exposes application metrics on port 8889:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318

processors:
  batch: {}

exporters:
  prometheus:
    endpoint: 127.0.0.1:8889
    enable_open_metrics: true
    send_timestamps: false
    metric_expiration: 5m
    translation_strategy: UnderscoreEscapingWithSuffixes

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

Loopback bindings make this suitable for a local test. In containers or Kubernetes, choose explicit reachable bind addresses and apply your normal network and authentication controls. A published port does not make a loopback-bound process reachable from another container.

The exporter endpoint is distinct from the Collector's own internal telemetry endpoint. Successfully scraping Collector process metrics does not prove that application OTLP points reached this pipeline.

`send_timestamps: false` leaves scrape-time stamping to Prometheus. `metric_expiration` controls how long an unchanged metric remains exposed without updates; it is not Prometheus retention. Choose it with the application's export interval and tolerated outages in mind.

## Send a known cumulative OTLP point

For a local test, create one cumulative monotonic sum using the [OTLP JSON mapping](https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding). This Python snippet generates current nanosecond timestamps as JSON strings, then posts to the HTTP metrics endpoint:

```python
import json
import time
import urllib.request

now = time.time_ns()
payload = {
    "resourceMetrics": [{
        "resource": {"attributes": [
            {"key": "service.name", "value": {"stringValue": "worker"}},
            {"key": "service.instance.id", "value": {"stringValue": "worker-1"}},
        ]},
        "scopeMetrics": [{
            "scope": {"name": "bridge-test"},
            "metrics": [{
                "name": "jobs_processed",
                "sum": {
                    "aggregationTemporality": 2,
                    "isMonotonic": True,
                    "dataPoints": [{
                        "startTimeUnixNano": str(now - 60_000_000_000),
                        "timeUnixNano": str(now),
                        "asInt": "12",
                    }],
                },
            }],
        }],
    }],
}
request = urllib.request.Request(
    "http://127.0.0.1:4318/v1/metrics",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(request, timeout=5) as response:
    print(response.status, response.read().decode("utf-8"))
```

This fixture deliberately uses cumulative temporality. Do not assume delta sums become cumulative counters merely by changing the exposition format. Verify supported temporality for your exporter version and use the appropriate upstream conversion when needed.

## Request OpenMetrics explicitly

After the batch processor has flushed, inspect the endpoint:

```bash
curl --fail-with-body -sS -D metrics.headers \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://127.0.0.1:8889/metrics -o metrics.om
```

Confirm an OpenMetrics content type, the final EOF marker, and a translated counter named `jobs_processed_total`. Inspect actual labels before writing dashboards: the exporter maps service identity and scope information, and naming strategies can add suffixes or escape names.

Exemplars require OpenMetrics output and supported metric types. The component documentation limits exemplar export to histograms and monotonic sums, and separately documents native-histogram limitations. An OTLP exponential histogram is not automatically expressible as a classic OpenMetrics 1.0 text histogram.

## Connect Prometheus and protect identity

```yaml
scrape_configs:
  - job_name: application-otlp
    scrape_protocols: [OpenMetricsText1.0.0]
    static_configs:
      - targets: ["127.0.0.1:8889"]
```

Use an address reachable from Prometheus. Review `honor_labels` and any `exported_job` or `exported_instance` labels after ingestion; the [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) explains conflicts between source and scrape-target labels.

Do not enable blanket resource-to-label copying without a cardinality budget. Promote only attributes needed for querying, and confirm that distinct application instances remain distinguishable. For multiple Collector replicas, define how application streams are routed: scraping random replicas behind one load-balanced target can produce discontinuous counters.

Complete the test by querying the known counter, sending an updated cumulative value, and observing expiration after the source stops. These checks verify the whole bridge rather than merely confirming that two HTTP ports respond.
