# Validation Summary: Why Alerting Needs Unsampled RED Metrics Alongside Sampled Traces

## Status

validated

## Post Type

Technical guide with Python instrumentation and a PromQL query.

## Technologies Covered

- OpenTelemetry tracing, head sampling, tail sampling, and probability sampling
- OpenTelemetry Python Metrics API and metric collection
- OpenTelemetry Collector span-derived metrics and pipeline reliability
- Prometheus counters, PromQL, histograms, and metric cardinality
- RED metrics (rate, errors, duration) and exemplars
- Python synchronous exception handling and monotonic timing

## Sources Consulted

- [OpenTelemetry sampling concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry probability sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)
- [OpenTelemetry Python Metrics API](https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html)
- [OpenTelemetry HTTP metric semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)
- [OpenTelemetry Metrics SDK and exemplar specification](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#exemplar)
- [OpenTelemetry Collector span metrics connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md)
- [OpenTelemetry Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus query operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus instrumentation practices](https://prometheus.io/docs/practices/instrumentation/)
- [Python monotonic clock documentation](https://docs.python.org/3/library/time.html#time.monotonic)
- [Python finally clause semantics](https://docs.python.org/3/reference/compound_stmts.html#finally-clause)

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The post contains no terminal commands, configuration blocks, or explicit library version claims.
- Checked the example arithmetic: 1% of 9,900 successes is 99; 100 failures among 199 retained traces is approximately 50.25%, compared with 1% of the original requests. A common multiplier cannot change that retained failure ratio. The post appropriately qualifies probability-based estimation and distinguishes sampling from arbitrary telemetry loss.
- Confirmed that head and tail sampling use different decision information. Span-derived metrics depend on which spans reach the connector; a downstream connector cannot directly count spans removed earlier. Estimation requires suitable probabilities and metadata and does not reconstruct individual missing requests.
- Verified the documented signatures for get_meter, create_counter, create_histogram, Counter.add, and Histogram.record. Positional attribute dictionaries and the chosen units are valid. Python syntax parsing passed. A runtime import check could not run the example because opentelemetry is not installed in the review environment; no SDK/exporter integration test was performed.
- Reviewed the synchronous wrapper's control flow: a normal return marks success, an escaping exception leaves failure, and finally records both measurements. Monotonic differences provide elapsed seconds. The existing caveats correctly require adaptations for asynchronous or streaming completion, HTTP status classification, cancellations, and business failures. A configured MeterProvider and collection/export path are necessary, as stated.
- Confirmed that the standard HTTP server request duration metric is a histogram in seconds. Its count can support request-rate calculations at the matching boundary; attributes and instrumentation conventions must be checked before replacing custom metrics.
- Reviewed the PromQL expression against official rate, aggregation, and vector-matching documentation. It calculates rates before aggregation and divides service-level failures by service-level total requests. Absent failure series and zero traffic need the handling already described in the post. The exported metric and service label are explicitly illustrative. No live Prometheus evaluation was performed.
- The chosen request boundary governs whether retries are distinct operations. The post's guidance to avoid counting child spans and nested middleware observations is consistent with measuring a defined service operation once.
- Confirmed the guidance on bounded labels and known-series initialization. Exemplar selection is separate from metric aggregation; a usable trace link additionally depends on trace retention and backend support. Independent metric recording does not guarantee lossless collection, which the post explicitly acknowledges.
- All three documentation links in the post resolved to the intended official resources. The author link also resolved to the expected GitHub profile. No deprecated API usage was identified in the example.
