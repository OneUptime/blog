# Validation Summary: How to Build a Collector Pipeline That Converts Incoming Prometheus Metrics to

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Prometheus receiver and scrape configuration
- Prometheus metric type conversion to OTLP metrics
- OpenTelemetry Collector processors
- ClickHouse exporter for OpenTelemetry Collector
- ClickHouse SQL
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenTelemetry Collector ClickHouse exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md
- ClickHouse exporter current metrics table templates: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter/internal/sqltemplates
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- OpenTelemetry Collector metrics transform processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OneUptime Host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The Kubernetes pod relabeling example built `__address__` from only the port annotation but used two replacement groups. I changed the relabel rule to use both `__address__` and the port annotation, and escaped `$` as `$$` because the Collector performs environment variable substitution in embedded Prometheus configuration.
- The config attempted to map Prometheus `job` and `instance` from resource attributes with a transform processor. The Prometheus receiver already maps scrape target identity into OTLP resource attributes such as `service.name` and `service.instance.id`; `job` and `instance` are not reliable resource attributes to read there. I removed the unnecessary transform processor from the example pipelines.
- The ClickHouse exporter example used non-current fields `ttl_days` and `metrics_table_name`. I changed these to the documented `ttl` field and `metrics_tables` per-type table configuration.
- The Prometheus metric type table implied all histograms could become either OTLP `Histogram` or `ExponentialHistogram`. I clarified that classic Prometheus histograms convert to OTLP `Histogram`, while Prometheus native histograms convert to OTLP `ExponentialHistogram`.
- The histogram configuration snippet did not actually control histogram conversion. I added the documented native histogram scrape settings and the option to keep classic histograms when native histograms are present.
- The high-cardinality cleanup example used `metricstransform` `delete_label_value` without the required `label_value`, and it targeted `le` and `quantile`, which are meaningful histogram/summary structures rather than ordinary labels to delete after OTLP conversion. I replaced it with a transform processor example that deletes example high-cardinality datapoint attributes.
- The ClickHouse schema section described a single `otel_metrics` table, but the current ClickHouse exporter creates type-specific metrics tables. I updated the text and sample schema to show the current `otel_metrics_sum` table shape.
- The ClickHouse query examples targeted the old single table and treated cumulative counters as row counts. I updated the histogram average query to use `otel_metrics_histogram` with `Sum` and `Count`, and the request rate query to use the cumulative sum table with `max(Value) - min(Value)`.
- The OneUptime exporter example used an OTLP gRPC exporter endpoint that did not match current OneUptime Collector documentation. I changed it to `otlphttp/oneuptime` with `https://oneuptime.com/otlp` and the documented `x-oneuptime-token` header.

## Review Notes
The post is technically relevant and salvageable. The examples assume an OpenTelemetry Collector Contrib distribution because the ClickHouse exporter, Prometheus receiver, and several processors are not all available in every Collector build. The ClickHouse exporter schema can change between releases, so production deployments should keep manual DDL aligned with the exporter version being deployed.
