# Validation Summary: How to Bridge OTLP to OpenMetrics with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical implementation guide.

## Technologies Covered
- OpenTelemetry Collector, OTLP HTTP receiver, batch processor, and Prometheus exporter
- OTLP JSON and cumulative monotonic metrics
- Prometheus scraping, label identity, and metric expiration
- OpenMetrics 1.0 text exposition and exemplars
- Python standard library: json, time, and urllib.request
- curl, YAML, and container networking

## Sources Consulted
- [Collector Prometheus exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md)
- [Exporter accumulator implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/accumulator.go)
- [Exporter HTTP handler implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/prometheus.go)
- [Collector OTLP receiver documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md)
- [Collector batch processor documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md)
- [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OTLP specification and JSON encoding](https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding)
- [OTLP metrics protobuf definitions](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto)
- [OpenTelemetry Prometheus and OpenMetrics compatibility](https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/)
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/)
- [Python urllib.request documentation](https://docs.python.org/3/library/urllib.request.html)
- [Python time documentation](https://docs.python.org/3/library/time.html#time.time_ns)
- [Python JSON documentation](https://docs.python.org/3/library/json.html)
- [curl manual](https://curl.se/docs/manpage.html), plus local curl 8.7.1 help output
- [Docker networking documentation](https://docs.docker.com/engine/network/)

## Issues Found
No technical issues found.

The README was left unchanged during this review.

## Review Notes
- Confirmed the receiver, processor, exporter, and pipeline configuration against official component documentation. The exporter supports the configured translation strategy, timestamp option, expiration duration, and OpenMetrics setting.
- Confirmed that OTLP HTTP metrics use POST to /v1/metrics with application/json, lowerCamelCase fields, numeric enum values, and decimal strings for 64-bit integers. Aggregation temporality 2 denotes cumulative data.
- Parsed the Python example with Python's AST parser and executed its payload/request construction without sending an HTTP request. Verified JSON serialization, POST selection, Content-Type, and cumulative temporality. Both YAML snippets parsed successfully using PyYAML.
- Checked every curl flag against the official manual and local help. The --fail-with-body option requires curl 7.76.0 or later; time.time_ns requires Python 3.7 or later.
- Confirmed OpenMetrics content negotiation, the final # EOF marker, and the counter sample suffix _total. In OpenMetrics, the counter family metadata uses the base name jobs_processed, while the counter sample is jobs_processed_total.
- Confirmed service identity mapping and Prometheus label-conflict behavior. With the default honor_labels setting, source job and instance labels are renamed to exported_job and exported_instance when they conflict with target labels.
- Confirmed expiration is based on elapsed time since an accepted update, independently of Prometheus storage retention. Internal Collector telemetry is separate from the configured application exporter endpoint.
- The cumulative fixture avoids exporter-version differences in delta handling. The current accumulator implementation can combine contiguous monotonic delta sums; changing text exposition alone does not perform that conversion. The post correctly advises checking the chosen release.
- OpenMetrics 1.0 text does not preserve native histogram bucket structure. The exporter documentation calls for protobuf scraping for native histograms and documents the lack of native-histogram exemplar support.
- Loopback bindings, resource-label cardinality guidance, and the warning about scraping randomly selected stateful Collector replicas are technically sound.
- The technical reference links resolve to the intended official resources. Documentation on main/latest can change; the post appropriately recommends checking a pinned Collector release. No specific Collector or Prometheus release is claimed as tested.
- This was a documentation, source, and local syntax/request-construction review. No live Collector/Prometheus ingestion, scrape, query, or five-minute expiration test was performed.
