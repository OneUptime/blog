# Validation Summary: How to Attach Exemplars to the Correct OpenMetrics Histogram Bucket and Preserve Trace IDs

## Status
validated

## Post Type
Technical guide with Python instrumentation and an HTTP verification command.

## Technologies Covered
- OpenMetrics 1.0 histogram exposition and exemplars
- Prometheus exemplar storage and HTTP API
- Python and prometheus-client
- W3C Trace Context and distributed tracing
- curl HTTP content negotiation
- Grafana exemplar links

## Sources Consulted
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): histogram bucket eligibility, exemplar values and timestamps, label limits, and text format.
- [Python client exemplar documentation](https://prometheus.github.io/client_python/instrumenting/exemplars/): histogram observation API and OpenMetrics exposition.
- [Python client implementation](https://raw.githubusercontent.com/prometheus/client_python/master/prometheus_client/metrics.py): first eligible bucket selection, cumulative exposition, and exemplar attachment.
- [Python client HTTP exposition](https://prometheus.github.io/client_python/exporting/http/): starting a metrics HTTP server.
- [Python client multiprocess limitations](https://prometheus.github.io/client_python/multiprocess/).
- [W3C Trace Context](https://www.w3.org/TR/trace-context/#trace-id): trace and parent/span identifier representations and invalid all-zero values.
- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/#span-context): trace context, span identifiers, and propagation.
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/#labels): label cardinality and time-series identity.
- [Prometheus exemplar storage feature flag](https://prometheus.io/docs/prometheus/latest/feature_flags/#exemplars-storage): enabling storage and sizing its circular buffer.
- [Prometheus exemplar query API](https://prometheus.io/docs/prometheus/latest/querying/api/#querying-exemplars): query, start, and end parameters and returned exemplar labels.
- [curl manual](https://curl.se/docs/manpage.html): fail, silent, show-error, and header options.
- [Grafana Prometheus data source configuration](https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/#exemplars): exemplar label mapping and internal/external trace links.
- [Author profile](https://github.com/nawazdhandala): verified the linked profile resolves.

## Issues Found
1. The claim that ordinary trace ID labels “defeat aggregation” overstated the limitation. Changed it to “causes excessive cardinality.” Labels create separate series for each unique combination; aggregation remains possible, but the number of series becomes excessive.
2. The curl verification step did not explicitly state that it requires a running HTTP exporter. The preceding Python example prints exposition and exits. Clarified that the application must expose the histogram registry at the example URL and that the Python snippet does not start an HTTP server. The command itself is correct.

## Review Notes
- Executed the exact Python snippet with installed prometheus-client 0.25.0. Confirmed one exemplar on the 0.5 bucket, observation value 0.32, unchanged trace and span label strings, and the final EOF marker.
- Parsed both the handwritten OpenMetrics example and generated output with the Python client's OpenMetrics parser successfully. The handwritten cumulative counts, total count, and sum are consistent; it illustrates multiple observations rather than the output of the single-observation Python example.
- Tested the curl flags and Accept header against a temporary local Python metrics server using the example registry and an ephemeral port. OpenMetrics negotiation returned the exemplar and EOF marker. The temporary server was shut down afterward.
- The cumulative-bucket explanation is correct for the linked OpenMetrics 1.0 specification. The Python implementation selects the first upper bound greater than or equal to the observation and does not duplicate exemplars into subsequent cumulative buckets.
- The IDs have the required 32 and 16 lowercase hexadecimal characters and are nonzero. The leading zeros in the span ID survive exposition. Their combined exemplar label names and values total 63 characters, below the OpenMetrics limit of 128 UTF-8 code points.
- The documented exemplar-storage feature flag remains applicable. The exemplar query API is documented as experimental; configuration should follow the installed Prometheus version. Python multiprocess mode does not support exemplars, but the example uses a normal single-process registry.
- Trace sampling, retention, tenant selection, and dashboard mapping depend on the deployment. No live Prometheus storage or tracing backend was configured for this review; those stages were checked against documentation, not claimed as an end-to-end runtime test.
- All existing external links were checked and resolve to the intended resources. No deprecated API was found in the example.
