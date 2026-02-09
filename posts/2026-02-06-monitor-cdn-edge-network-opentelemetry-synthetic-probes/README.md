# How to Monitor CDN and Edge Network Performance Using OpenTelemetry Synthetic Probes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CDN Monitoring, Synthetic Probes, Edge Network

Description: Use OpenTelemetry synthetic probes to monitor CDN and edge network performance including cache hit rates and latency.

CDNs are supposed to make things faster, but when they misbehave, debugging performance issues gets tricky. Is the origin slow? Is the CDN cache cold? Is there a routing problem at a specific edge location? You need active probing to answer these questions, and OpenTelemetry gives you a framework to build it.

This post shows how to set up synthetic probes that measure CDN performance, parse response headers to track cache behavior, and feed everything into your existing OpenTelemetry pipeline.

## What to Measure

CDN monitoring boils down to a few key signals:

- **Response time from edge** - How fast is the CDN responding to requests from various locations?
- **Cache hit ratio** - What percentage of requests are served from cache vs. fetched from origin?
- **Time to first byte (TTFB)** - How long until the first byte arrives after the request is sent?
- **TLS handshake time** - How much overhead does the TLS negotiation add?
- **Geographic consistency** - Is performance uniform across edge locations, or are some regions degraded?

Most CDNs expose cache status in response headers (e.g., `X-Cache: HIT` or `CF-Cache-Status: MISS`). Our probes will capture these.

## Building a Custom Probe with OpenTelemetry SDK

The built-in `httpcheck` receiver is good for basic up/down monitoring, but for CDN-specific metrics, we need a custom probe that captures detailed timing and header data. Here is a Python probe that does this:

```python
# cdn_probe.py
import time
import urllib3
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Disable SSL warnings for probing (we still use HTTPS)
urllib3.disable_warnings()

# Set up the metrics pipeline
resource = Resource.create({
    "service.name": "cdn-synthetic-probe",
    "probe.region": "us-east-1",
})

exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=30000)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("cdn.probe")

# Define metrics for CDN performance
ttfb_histogram = meter.create_histogram(
    name="cdn.probe.ttfb_ms",
    description="Time to first byte in milliseconds",
    unit="ms",
)
total_time_histogram = meter.create_histogram(
    name="cdn.probe.total_time_ms",
    description="Total response time in milliseconds",
    unit="ms",
)
cache_hit_counter = meter.create_counter(
    name="cdn.probe.cache_hits",
    description="Number of cache hits observed",
)
cache_miss_counter = meter.create_counter(
    name="cdn.probe.cache_misses",
    description="Number of cache misses observed",
)


def probe_endpoint(url, expected_cache_header="X-Cache"):
    """
    Probe a CDN endpoint and record metrics.
    Returns a dict with timing and cache data.
    """
    http = urllib3.PoolManager()

    start = time.monotonic()
    response = http.request("GET", url, preload_content=False)
    # Read the first chunk to measure TTFB
    first_byte = response.read(1)
    ttfb = time.monotonic() - start
    # Read the rest
    response.read()
    total_time = time.monotonic() - start

    # Extract cache status from headers
    cache_status = response.headers.get(expected_cache_header, "UNKNOWN")
    cdn_edge = response.headers.get("X-Served-By", "unknown")

    # Common attributes for all metrics from this probe
    attrs = {
        "cdn.url": url,
        "cdn.edge_location": cdn_edge,
        "cdn.cache_status": cache_status,
    }

    # Record the metrics
    ttfb_histogram.record(ttfb * 1000, attributes=attrs)
    total_time_histogram.record(total_time * 1000, attributes=attrs)

    if cache_status in ("HIT", "hit"):
        cache_hit_counter.add(1, attributes=attrs)
    elif cache_status in ("MISS", "miss", "EXPIRED", "expired"):
        cache_miss_counter.add(1, attributes=attrs)

    response.release_conn()
    return {
        "ttfb_ms": round(ttfb * 1000, 2),
        "total_ms": round(total_time * 1000, 2),
        "cache_status": cache_status,
        "edge": cdn_edge,
    }
```

## Running the Probes on a Schedule

Wrap the probe in a simple scheduler that hits multiple endpoints:

```python
# probe_runner.py
import time
import schedule
from cdn_probe import probe_endpoint

# List of CDN-fronted endpoints to monitor
TARGETS = [
    {"url": "https://cdn.example.com/static/app.js", "cache_header": "X-Cache"},
    {"url": "https://cdn.example.com/images/logo.png", "cache_header": "X-Cache"},
    {"url": "https://cdn.example.com/api/config", "cache_header": "CF-Cache-Status"},
]

def run_all_probes():
    for target in TARGETS:
        try:
            result = probe_endpoint(
                url=target["url"],
                expected_cache_header=target["cache_header"],
            )
            print(f"[{target['url']}] TTFB={result['ttfb_ms']}ms "
                  f"Cache={result['cache_status']} Edge={result['edge']}")
        except Exception as e:
            print(f"[{target['url']}] Probe failed: {e}")

# Run probes every 60 seconds
schedule.every(60).seconds.do(run_all_probes)

# Initial run
run_all_probes()

while True:
    schedule.run_pending()
    time.sleep(1)
```

## Collector Configuration for Probe Data

The probes send metrics via OTLP to a local collector. Here is the collector config that enriches the data and forwards it:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Add probe host information
  resource:
    attributes:
      - key: probe.host
        from_attribute: host.name
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "https://central-backend.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

## Useful Dashboard Queries

With the data flowing, here are queries that give you actionable CDN insights:

```promql
# Cache hit ratio over the last hour
sum(cdn_probe_cache_hits_total) /
(sum(cdn_probe_cache_hits_total) + sum(cdn_probe_cache_misses_total)) * 100

# P95 TTFB per edge location
histogram_quantile(0.95, sum by (le, cdn_edge_location) (
  rate(cdn_probe_ttfb_ms_bucket[10m])
))

# Average total response time per URL
avg by (cdn_url) (cdn_probe_total_time_ms_sum / cdn_probe_total_time_ms_count)
```

## Wrapping Up

CDN monitoring requires active probing because passive metrics from your origin servers do not tell you what end users actually experience. By building synthetic probes on OpenTelemetry, you keep your CDN performance data in the same pipeline as the rest of your observability data. You can correlate CDN cache misses with origin load spikes, track edge location performance over time, and catch degradations before users complain.
