# Validation Summary: How to Name OpenMetrics Counter Families and `_created` Timestamps

## Status
validated

## Post Type
Technical guide with Python instrumentation and OpenMetrics exposition examples.

## Technologies Covered
- OpenMetrics 1.0 text exposition
- Prometheus counters and start timestamp ingestion
- Python 3 and the Prometheus Python client (`prometheus_client`)
- Metric families, labels, units, and counter lifecycles

## Sources Consulted
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/ — counter semantics, reserved suffixes, units, timestamps, metadata, and text encoding.
- Python client instrumentation documentation: https://prometheus.github.io/client_python/instrumenting/ — default creation-time series and options to disable them.
- Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/ — constructor, increments, and `_total` normalization.
- Python client Labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/ — child initialization and removal.
- Official Python client exposition implementation: https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/exposition.py — `generate_latest` and OpenMetrics output.
- Official Python client metric implementation: https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py — per-child creation timestamps, naming, and reset behavior.
- Python time documentation: https://docs.python.org/3/library/time.html#time.time — epoch timestamps returned by `time.time()`.
- Prometheus feature flags: https://prometheus.io/docs/prometheus/latest/feature_flags/#start-created-timestamps-zero-injection — optional consumer-side start timestamp zero injection.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post is technically relevant and its APIs are supported; there are no terminal commands to validate.
- Executed both Python examples using the installed `prometheus-client` 0.25.0. Verified that the client emits the base counter TYPE and paired `_total` and `_created` samples.
- Parsed all three valid text expositions with the Python client's OpenMetrics parser. Confirmed that the intentionally incorrect naming example is rejected even after supplying its missing EOF terminator, isolating the naming error.
- Checked the illustrative JobCounter initialization, increments, and reset using controlled clock values. Verified that creation time stays fixed while the total increases and changes on reset.
- Checked successive client exports for an increasing total and unchanged creation time. Confirmed later creation timestamps for a new label child and for a removed and recreated child.
- The metadata and suffix examples apply to OpenMetrics 1.0, the linked specification and the serializer's default format. They should not be generalized to the legacy Prometheus text format.
- Creation series are enabled by default but can be disabled through client configuration. The single-process scope in the post is appropriate.
- Verified the technical reference links against their official resources. The Prometheus zero-ingestion feature remains an explicit consumer setting; no Prometheus server integration test was performed.
- The toy counter is explicitly identified as a lifecycle illustration, and the post appropriately calls out consistent reads during concurrent resets.
