# Validation Summary: How to Configure the StatsD Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- StatsD receiver
- StatsD and DogStatsD metric formats
- OpenTelemetry Collector processors and exporters
- Python, Node.js, Go, and Java StatsD clients
- Linux UDP buffer tuning and netcat testing

## Sources Consulted
- OpenTelemetry Collector Contrib StatsD receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/statsdreceiver
- OpenTelemetry Collector Contrib StatsD receiver `config.go`: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/statsdreceiver/config.go
- OpenTelemetry Collector Contrib StatsD receiver transport definitions: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/statsdreceiver/internal/transport/transport.go
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib metricstransform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor
- Etsy StatsD metric types documentation: https://github.com/statsd/statsd/blob/master/docs/metric_types.md
- Python StatsD documentation: https://statsd.readthedocs.io/en/latest/reference.html
- node-statsd npm documentation: https://www.npmjs.com/package/node-statsd
- go-statsd-client package documentation: https://pkg.go.dev/github.com/cactus/go-statsd-client/statsd
- java-dogstatsd-client Javadocs: https://javadoc.io/doc/com.datadoghq/java-dogstatsd-client
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- Replaced the deprecated/removed `logging` exporter example with the current `debug` exporter.
- Corrected the receiver's supported metric-type claim. The current StatsD receiver supports counters, gauges, timers, histograms, and DogStatsD distributions; sets are part of the original StatsD protocol but are not documented as supported by the receiver.
- Replaced nonexistent `enable_dogstatsd_extensions` and `enable_metric_name_prefix` options with the documented `enable_simple_tags` option, and clarified that key:value DogStatsD tags are parsed by default.
- Fixed summary timer configuration from unsupported `quantiles` objects with `error` fields to the documented `summary.percentiles` list.
- Corrected `metricstransform` regexp substitution syntax to use escaped dollar signs (`$$`) and `${1}` capture expansion.
- Removed obsolete `service.telemetry.metrics.address` examples and used `level`, because `address` is ignored in Collector v0.123.0 and later.
- Removed set-metric client examples that would not match the current receiver's documented support.
- Fixed the Go client timing example to use `TimingDuration` with `time.Duration`.
- Added the missing Java `NonBlockingStatsDClientBuilder` import.
- Replaced the nonexistent current contrib `carbon` exporter example with an OTLP-only migration example.
- Replaced the nonexistent `statsd_aggregation_operations` metric with the receiver's documented `otelcol_receiver_received_statsd_metrics` metric.
- Softened the TCP delivery claim from guaranteed end-to-end delivery to a more reliable transport than UDP.
- Updated the OneUptime integration snippet to use the documented `otlphttp` exporter endpoint, JSON encoding, and `x-oneuptime-token` header.

## Review Notes
Representative Collector configurations from the post were validated with `otelcol-contrib` v0.153.0 using `otelcol-contrib validate`. The post does not pin a Collector version, so future Collector releases may require another schema review.
