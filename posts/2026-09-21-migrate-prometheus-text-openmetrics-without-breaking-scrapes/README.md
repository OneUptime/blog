# How to Migrate a Prometheus Text 0.0.4 Endpoint to OpenMetrics 1.0 Without Breaking Scrapes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Monitoring, Migration, Observability

Description: Migrate a metrics endpoint to negotiated OpenMetrics 1.0 while preserving existing series names, labels, counters, and legacy consumers.

Changing a metrics response's content type does not convert Prometheus text 0.0.4 into OpenMetrics 1.0. The encodings have differences in metadata, counter family names, timestamps, and termination. A safe migration adds a tested OpenMetrics encoder while retaining the legacy representation for consumers that request it.

Keep the same underlying measurements, names, label sets, and counter state. Treat protocol negotiation as the change under test; unrelated metric renames make dashboard failures harder to diagnose.

## Inventory the current contract

Capture the current response body, content type, and typical Prometheus `Accept` header. Identify all consumers, including older Prometheus servers, federation or proxy layers, and custom scripts that may parse the endpoint directly.

Record representative series with their labels and values. Include counters, gauges, histogram buckets, summaries, and any custom collectors. Check alerts and dashboards for exact bucket label strings or assumptions about metadata lines.

Prometheus 3 normalizes certain classic histogram and summary label values, and it rejects missing or unsupported response content types by default. A simultaneous server upgrade therefore needs its own compatibility checks. [Metric type normalization](https://prometheus.io/docs/concepts/metric_types/), [Prometheus 3 migration guide](https://prometheus.io/docs/prometheus/latest/migration/)

## Understand the encoding differences

For a counter, the traditional representation can look like:

```text
# HELP api_requests_total Completed API requests.
# TYPE api_requests_total counter
api_requests_total{method="GET"} 12
```

The corresponding OpenMetrics family is:

```text
# HELP api_requests Completed API requests.
# TYPE api_requests counter
api_requests_total{method="GET"} 12
# EOF
```

The ingested counter sample still has the name `api_requests_total`. Renaming it just because the TYPE metadata uses `api_requests` would create an unnecessary series migration.

OpenMetrics timestamps are expressed in seconds, including fractional seconds where needed. Traditional Prometheus text timestamps use milliseconds. OpenMetrics also requires an EOF marker and supports constructs such as units and exemplars with their own rules. Use a real encoder rather than editing strings around a legacy payload. [OpenMetrics 1.0](https://prometheus.io/docs/specs/om/open_metrics_spec/), [Prometheus exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/)

## Let one registry support both representations

For a minimal Python demonstration, use `prometheus-client` 0.26.0:

```bash
python -m pip install 'prometheus-client==0.26.0'
```

Save this as `metrics_server.py`:

```python
import threading

from prometheus_client import CollectorRegistry, Counter, Gauge, start_http_server

registry = CollectorRegistry()
requests = Counter(
    "api_requests", "Completed API requests", ["method"], registry=registry
)
workers = Gauge("api_workers", "Active workers", registry=registry)

# Demonstration values; production instrumentation updates these on events.
requests.labels(method="GET").inc(12)
workers.set(4)

if __name__ == "__main__":
    start_http_server(8000, addr="127.0.0.1", registry=registry)
    threading.Event().wait()
```

The HTTP exporter selects supported exposition according to the request. In an existing application, connect its existing registry or collectors instead of creating a second set of counters for OpenMetrics. Recreating collectors per scrape resets or duplicates state. [Python HTTP exposition](https://prometheus.github.io/client_python/exporting/http/), [client exposition implementation](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py)

The example binds to loopback for local testing. Integrate the endpoint with your existing production listener and access configuration during deployment.

## Test both negotiation paths

Run the server, then capture each response:

```bash
set -euo pipefail
curl --fail --silent --show-error \
  -H 'Accept: text/plain; version=0.0.4' \
  -D legacy.headers -o legacy.prom \
  http://127.0.0.1:8000/metrics

curl --fail --silent --show-error \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  -D openmetrics.headers -o metrics.om \
  http://127.0.0.1:8000/metrics
```

Confirm that the returned content type matches each body. Parse the first with a Prometheus text parser and the second with an OpenMetrics parser. Compare the samples for existing business metrics, allowing documented encoding-specific auxiliary series where relevant.

Also test the real Prometheus header, a request without `Accept`, compression, and any reverse proxy in the route. If an intermediary caches negotiated responses, its cache key must distinguish the selected representation; otherwise one client can receive the other client's encoding.

Do not add sample timestamps merely because the new encoder supports them. Keeping scrape-time assignment preserves the behavior of ordinary live metrics unless explicit source timestamps are part of the existing design.

## Roll out with real scrape verification

Start with one canary endpoint and a Prometheus test job that prefers OpenMetrics 1.0. Monitor scrape failures, samples scraped, series counts, and existing alert expressions. Inspect a counter across the deployment boundary: an expected process restart can reset it, but a protocol switch alone should not multiply or rename it.

For histograms, verify all buckets, the positive-infinity boundary, sum, and count. For summaries, compare the quantile label values used by queries. A parseable endpoint can still break dashboards if label identities change.

Keep legacy negotiation available throughout the compatibility window. If the canary fails, restore the earlier serving configuration while retaining the same instrumentation and investigate the captured headers and body. Do not hide a wrong content type with a scraper fallback and call the migration complete.

Complete the rollout when both representations remain usable by their intended consumers and OpenMetrics scrapes preserve the existing measurement contract. New OpenMetrics-only features can then be introduced as separate, measurable changes.
