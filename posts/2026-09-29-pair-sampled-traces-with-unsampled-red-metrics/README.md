# Why Alerting Needs Unsampled RED Metrics Alongside Sampled Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sampling, RED Metrics, Monitoring

Description: Build alert rates from application request metrics while using sampled traces as diagnostic examples rather than complete event counters.

Suppose a service handles 10,000 requests: 100 fail and 9,900 succeed. A tail policy retains all failures and only 1% of successful traces. The retained population contains about 100 failures and 99 successes, so its apparent failure rate is roughly 50%, even though the service failure rate is 1%.

That is useful diagnostic selection and a poor raw alert denominator. Decide which telemetry represents the complete request population before defining error-budget or rate alerts.

## Identify the sampling position

Head sampling selects before the full outcome is known. Tail sampling can favor errors, long durations, or other completed-trace properties. OpenTelemetry explains these as different collection strategies with different operational tradeoffs. [Sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)

Uniform probability sampling can support statistical estimation under suitable assumptions and known probabilities, but small samples remain noisy. A collection policy that keeps errors preferentially cannot be corrected by multiplying every retained span by one global constant.

Also check where span-derived metrics are generated. A connector upstream of tail sampling sees a different population from one downstream. Neither can recover requests already absent because of earlier head sampling, instrumentation gaps, or dropped spans without an appropriate estimator and supporting metadata.

## Measure requests independently

Prefer application or server metrics that observe each defined request outcome regardless of whether its span is recording. The following illustrates custom application metrics; configure a MeterProvider and reader/exporter separately:

```python
import time
from opentelemetry import metrics

meter = metrics.get_meter("example.checkout")
requests = meter.create_counter("app.requests", unit="{request}")
duration = meter.create_histogram("app.request.duration", unit="s")

def measured_request(handler):
    started = time.monotonic()
    outcome = "failure"
    try:
        result = handler()
        outcome = "success"
        return result
    finally:
        attributes = {"operation": "checkout", "outcome": outcome}
        requests.add(1, attributes)
        duration.record(time.monotonic() - started, attributes)
```

This synchronous example treats an exception as failure. Adapt the outcome classification for HTTP responses, cancellations, streaming completion, and business failures. Call the wrapper once per operation at the chosen boundary; do not count the same request again in nested middleware.

The key property is that metric recording is not inside `if span.is_recording()`. Standard HTTP server duration metrics may already cover your desired boundary, avoiding custom duplication. Check their documented attributes and duration definition. [HTTP metrics conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)

## Define RED with explicit denominators

Request rate should count the chosen service operation, not every client retry or every child span. Error rate should divide failed operations by all eligible operations at the same boundary. Duration should use a histogram of that same population.

For a Prometheus export exposing a counter named `app_requests_total` and labels `service`, `operation`, and `outcome`, a service error ratio could be:

```promql
sum by (service) (rate(app_requests_total{outcome="failure"}[5m]))
/
sum by (service) (rate(app_requests_total[5m]))
```

These names are an illustrative exported schema, not a promise about every OTLP-to-Prometheus translation. Inspect the actual exposition and service-label mapping. Preinitialize finite outcome series or explicitly handle absent failure series; do not silently treat missing telemetry as zero failures. Add an appropriate volume guard and a separate missing-data signal. [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

Keep dimensions bounded. Trace IDs, request IDs, and customer IDs should not become labels on every counter series. Use route templates or stable operations rather than raw URLs.

## Use exemplars as evidence links

An exemplar can connect a metric observation to a retained trace without making the trace the metric's denominator. Its availability depends on SDK configuration, sampling, export, backend support, and retention. A missing exemplar does not imply a missing request observation.

From an alert, inspect representative failed traces and logs for the affected service, route, and region. Do not estimate incident impact by counting only the traces returned by a search query.

## Verify the populations

Send a known mix of successes, failures, retries, and timeouts in a test environment. Change trace sampling from full retention to a small fraction, then to an error-biased tail policy. Application request counters and duration populations should continue to reflect the known workload while retained trace counts change.

Unsampled metrics still depend on healthy collection and export. Monitor gaps, restarts, queue failures, and duplicate ingestion. The goal is independence from trace selection, not a claim that metrics can never be lost.

## Conclusion

Use request metrics for rates and sampled traces for explanations. Define the operation boundary, record metrics independently of span recording, and verify the result against a known workload before using it to page people.
