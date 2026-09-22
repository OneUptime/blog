# How to Attach Exemplars to the Correct OpenMetrics Histogram Bucket and Preserve Trace IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Exemplars, Tracing, Observability

Description: Attach histogram exemplars to eligible buckets, retain complete trace identifiers, and verify storage and trace navigation independently.

---

A histogram exemplar connects one recorded observation to external context such as a trace. The exemplar's value is the observed latency or size, not the bucket's cumulative count. Confusing those values produces a plausible-looking response that points to the wrong event.

Attach exemplars through the histogram client's observation API when possible. The client can choose an appropriate bucket while updating the same histogram that records the measurement.

## Read the two values on the sample line

```text
# TYPE api_duration_seconds histogram
# HELP api_duration_seconds Completed request duration.
api_duration_seconds_bucket{route="/checkout",le="0.1"} 3
api_duration_seconds_bucket{route="/checkout",le="0.5"} 8 # {trace_id="4bf92f3577b34da6a3ce929d0e0e4736",span_id="00f067aa0ba902b7"} 0.32 1790031660.125
api_duration_seconds_bucket{route="/checkout",le="+Inf"} 10
api_duration_seconds_count{route="/checkout"} 10
api_duration_seconds_sum{route="/checkout"} 4.7
# EOF
```

The bucket count is 8. The exemplar observation is 0.32 seconds, with its own optional timestamp. That timestamp uses Unix seconds and need not match the scrape timestamp.

The [OpenMetrics histogram rules](https://prometheus.io/docs/specs/om/open_metrics_spec/#histogram) require the exemplar value to fit the bucket's range and permit at most one exemplar per bucket sample. A 0.32-second exemplar cannot belong to the `le="0.1"` bucket. It fits the `0.5` bucket; because buckets are cumulative, it also falls within larger bucket ranges. The format does not require duplicating the exemplar onto every qualifying bucket.

## Record the observation and context together

Python's [exemplar API](https://prometheus.github.io/client_python/instrumenting/exemplars/) accepts context when observing a histogram:

```python
from prometheus_client import CollectorRegistry, Histogram
from prometheus_client.openmetrics.exposition import generate_latest

registry = CollectorRegistry()
duration = Histogram(
    "api_duration_seconds", "Completed request duration.",
    ["route"], buckets=[0.1, 0.5, 1.0], registry=registry,
)
duration.labels(route="/checkout").observe(
    0.32,
    exemplar={
        "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
        "span_id": "00f067aa0ba902b7",
    },
)
print(generate_latest(registry).decode("utf-8"), end="")
```

Pass the trace context active for the measured operation. In asynchronous code, capturing a global “last trace” after the request finishes can associate the duration with another request. Capture the immutable IDs while the relevant span is active and carry them alongside the observation.

This example deliberately puts `route` on the metric and trace identifiers on the exemplar. Adding `trace_id` to ordinary histogram labels creates new time series per trace and causes excessive cardinality. Keep metric labels bounded, using route templates instead of request-specific URLs.

## Preserve the exact trace identifier

Trace identifiers are opaque strings at the OpenMetrics layer. For W3C Trace Context, use the full 32-character lowercase hexadecimal trace ID and the 16-character span ID. The [W3C specification](https://www.w3.org/TR/trace-context/#trace-id) defines those lengths and rejects all-zero identifiers.

Do not truncate an ID to fit a display field, parse it through a floating-point number, remove leading zeros, or substitute the whole `traceparent` header. Any of those transformations can break lookup even when the exemplar is stored successfully.

The trace backend must also retain the referenced trace. Emitting context for an unsampled or expired trace can leave a link that correctly identifies an event the backend cannot return. Align exemplar sampling and trace retention with the debugging workflow you expect.

## Verify the full path in stages

With your application exposing its histogram registry at `http://localhost:8000/metrics`, request OpenMetrics explicitly. The Python example above only prints the exposition; it does not start an HTTP server:

```bash
curl -fsS \
  -H 'Accept: application/openmetrics-text; version=1.0.0' \
  http://localhost:8000/metrics
```

Confirm the response contains the exemplar marker after the relevant bucket and ends in `# EOF`. Traditional Prometheus text output does not carry these OpenMetrics exemplars.

Next enable and size Prometheus [exemplar storage](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage) for the installed version. Ordinary metric ingestion succeeding does not prove exemplars are retained. Query the exemplar API over a time interval containing the observation and inspect the returned label strings byte for byte.

Finally open the matching trace in your tracing system, then configure dashboard links using the exact exemplar label key. If the API returns the correct exemplar but the dashboard link fails, investigate data-source mapping, tenant selection, and trace retention. If the exemplar never reaches the API, investigate negotiation, collector forwarding, storage settings, and label limits before changing the visualization.
