# Validation Summary: How to Compare OpenTelemetry vs StatsD for Metrics Collection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Python SDK
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector StatsD receiver
- StatsD
- DogStatsD
- Python StatsD client
- Java DogStatsD client

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector contrib StatsD receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/statsdreceiver
- StatsD official repository and protocol usage: https://github.com/statsd/statsd
- StatsD metric types documentation: https://github.com/statsd/statsd/blob/master/docs/metric_types.md
- Python StatsD documentation: https://statsd.readthedocs.io/
- Python StatsD API reference: https://statsd.readthedocs.io/en/latest/reference.html
- DogStatsD datagram format documentation: https://docs.datadoghq.com/extend/dogstatsd/datagram_shell/
- Java DogStatsD client Javadocs: https://javadoc.io/static/com.datadoghq/java-dogstatsd-client/

## Issues Found
- The raw StatsD examples showed `|h` as a generic StatsD histogram. The official StatsD protocol uses counters, timers, gauges, and sets, while `h` is a DogStatsD extension. Updated the comment to identify the histogram example as a DogStatsD extension.
- The Python StatsD snippet described `StatsClient.timing()` as recording a histogram. The official Python StatsD client sends timer metrics with `|ms`; some backends use timers as distributions, but it is not a native `|h` histogram call. Updated the comment and metric name to avoid implying native histogram support.
- The OpenTelemetry Python snippet used `time.time()` without importing `time`. Added the import.
- The OpenTelemetry Python snippet modeled queue depth with `create_up_down_counter`, which records deltas rather than an absolute current value. Changed it to `create_observable_gauge` with a callback yielding an `Observation`, matching the current Python metrics documentation.
- The protocol comparison said OpenTelemetry provides reliable delivery with retries and back-pressure as a blanket statement. The OTLP exporter specification supports gRPC/HTTP transport and configurable retry behavior, but data can still be dropped depending on SDK or Collector queues. Updated the wording to be more precise.
- The data type table said OpenTelemetry has Summary support in some SDKs. The current Metrics API has no direct Summary instrument. Updated the table to say there is no direct instrument.
- The StatsD receiver configuration comments misdescribed `enable_metric_type` and `is_monotonic_counter`. Updated the comments to match the receiver documentation and added `timer_histogram_mapping` to show explicit timer/histogram conversion to OTLP histograms.
- The migration section said the StatsD receiver ensures metrics are never lost during migration. Because StatsD input is still commonly UDP and the receiver documentation notes deployment caveats, changed this to say it routes existing StatsD metrics through the OpenTelemetry pipeline.

## Review Notes
- The Java DogStatsD client example uses current `incrementCounter` and `recordExecutionTime` APIs and is technically valid, though newer builder-style construction is often preferred for more advanced configuration.
- The article is intentionally high-level; retry, queueing, temporality, and histogram aggregation choices can vary by SDK, exporter, Collector version, and backend.
