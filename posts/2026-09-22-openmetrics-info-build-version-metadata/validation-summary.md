# Validation Summary: How to Represent Stable Build and Version Metadata with OpenMetrics Info Metrics

## Status
validated

## Post Type
Technical guide with Python instrumentation, OpenMetrics exposition, an HTTP verification command, and PromQL examples.

## Technologies Covered
- OpenMetrics 1.0 Info metrics and text exposition
- Python and the Prometheus Python client
- Prometheus target labels, time-series cardinality, and PromQL vector matching
- HTTP content negotiation and curl
- Python multiprocess instrumentation limitations

## Sources Consulted
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): Info semantics, sample suffix and value, units, label constraints, text structure, and content type.
- [Python Info documentation](https://prometheus.github.io/client_python/instrumenting/info/): metadata API and example usage.
- [Python metric implementation](https://github.com/prometheus/client_python/blob/master/prometheus_client/metrics.py): Info metadata types, overlapping label rejection, and sample creation.
- [Python OpenMetrics encoder](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/exposition.py): family declarations and text serialization.
- [Python exposition implementation](https://github.com/prometheus/client_python/blob/master/prometheus_client/exposition.py): HTTP negotiation and legacy Info-to-gauge conversion.
- [Python HTTP/HTTPS exporting](https://prometheus.github.io/client_python/exporting/http/): start_http_server and server lifecycle.
- [Python multiprocess mode](https://prometheus.github.io/client_python/multiprocess/): documented lack of Info metric support.
- [PromQL operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching): on, group_left, comparison filtering, and aggregation semantics.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): automatically attached job and instance labels.
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/): label identity and cardinality guidance.
- [curl manual](https://curl.se/docs/manpage.html): --fail-with-body, -sS, -D, -H, and -o.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post explicitly targets OpenMetrics 1.0; its family name checkout_build, sample name checkout_build_info, constant value of one, empty unit, and EOF marker are correct for that version.
- Executed the Python code extracted directly from the post with the locally installed prometheus-client 0.25.0. Parsed both its generated output and the handwritten exposition successfully, verifying the family, Info type, and sample value.
- Verified that the legacy Prometheus encoder produces a checkout_build_info gauge declaration.
- Started a temporary local HTTP server with the example registry and ran the post's curl command using curl 8.7.1, substituting only an available loopback port. Confirmed the OpenMetrics 1.0 content type and an output body identical to the directly generated payload. Temporary output files were removed and the server was stopped.
- The inline start_http_server call assumes importing it from prometheus_client and keeping the application alive, as described by the lifecycle guidance. The main Python block intentionally only prints the exposition.
- Confirmed that Info metadata uses string values and cannot overlap declared metric label names. Multiprocess aggregation remains outside the supported Info use case.
- Reviewed both PromQL expressions against the official operator documentation; they were not executed against a running Prometheus server. The join requires one metadata series per matching target. The count comparison identifies multiple series but cannot return a missing target, a limitation the post already explains.
- Stable metadata and bounded labels avoid adding build labels to every stored request series. The join adds those labels to query results. Production target uniqueness, cross-cluster identity, and proxy negotiation still require deployment-specific verification.
- curl --fail-with-body requires curl 7.76.0 or later. The tested version supports all command flags.
- The post's documentation and encoder links resolve to the intended official resources. The author link redirects to the expected GitHub profile.
