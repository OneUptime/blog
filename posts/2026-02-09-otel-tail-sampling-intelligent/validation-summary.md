# Validation Summary: How to implement OpenTelemetry tail sampling for intelligent trace selection

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OTLP receiver and exporter
- Debug exporter
- Load-balancing exporter
- Collector internal telemetry metrics
- Prometheus scraping of Collector internal metrics

## Sources Consulted
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector tail sampling processor example config: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/testdata/tail_sampling_config.yaml
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The first configuration used the removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity: basic`, and updated the trace pipeline exporter list.
- The composite policy section used `type: or` and `or_sub_policy`, but the tail sampling processor does not provide an `or` policy type. Replaced the example with separate top-level policies, which implement OR-style sampling because a trace is sampled when any top-level sampling policy matches.
- The rate-limited policy comments described successful traffic, but the shown policies did not check for success. Updated the wording to avoid implying a status condition that was not configured.
- The monitoring configuration used the deprecated/ignored `service.telemetry.metrics.address` field and placed a `prometheus` exporter under `exporters`, which is not the current way to expose Collector internal metrics. Replaced it with `service.telemetry.metrics.readers` using a pull Prometheus exporter.
- The monitoring metric names were outdated. Replaced them with current tail sampling processor metrics for dropped traces, late span age, and trace sampling decisions.
- The best-practice note said traces longer than `decision_wait` may be dropped. Refined this to distinguish late-arriving spans from traces dropped before decision when the in-memory trace buffer fills.

## Review Notes
The post is technically relevant and the remaining examples match the current tail sampling processor policy names and configuration structure. The exact metric names exposed to Prometheus can include suffix differences depending on Collector version and Prometheus reader settings.
