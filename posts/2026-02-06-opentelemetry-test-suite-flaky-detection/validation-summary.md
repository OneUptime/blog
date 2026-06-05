# Validation Summary: How to Use OpenTelemetry to Monitor Test Suite Execution Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- pytest plugin hooks
- OTLP gRPC exporter
- Jaeger query API
- OpenTelemetry Collector span metrics connector
- Prometheus and PromQL alerting rules

## Sources Consulted
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- pytest hook function documentation: https://doc.pytest.org/en/latest/how-to/writing_hook_functions.html
- pytest reference for runtest hooks: https://docs.pytest.org/en/stable/reference.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Jaeger API documentation: https://www.jaegertracing.io/docs/2.0/apis/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The pytest example referenced `os.environ` without importing `os`. Added the missing import so the snippet runs.
- The pytest example calculated suite duration by reading `self.suite_span.attributes`, which relies on SDK internals instead of plugin state. Added `self.suite_start_time` and used it for duration calculation.
- The pytest example used older pytest path/root attributes. Updated `session.config.rootdir` to `session.config.rootpath` and `item.fspath` to `item.path`.
- The pytest example only recorded duration for the test call phase and did not correctly handle setup/teardown failures or normal skips. Updated the logic to record duration at teardown and set outcomes for failed setup/teardown, xfail, xpass, and skipped tests.
- The Jaeger query example passed `lookback` as a string like `72h` and used `operation: "test:"` as if Jaeger operation search were a prefix match. Updated the example to query a microsecond start/end time window and filter `operationName.startswith("test:")` in Python.
- The Collector snippet configured a connector but did not enable it in service pipelines. Added an OTLP receiver and trace/metrics pipelines that connect traces through `span_metrics` to the Prometheus exporter.
- The Collector snippet used the deprecated `spanmetrics` component name. Updated it to the current `span_metrics` component name.
- The PromQL examples used old spanmetrics metric names such as `calls_total` and `duration_milliseconds_sum`. Updated them to Prometheus-compatible names generated from the current default namespace: `traces_span_metrics_calls_total`, `traces_span_metrics_duration_milliseconds_sum`, and `traces_span_metrics_duration_milliseconds_count`.

## Review Notes
- The Jaeger HTTP JSON API is documented by Jaeger as an internal API, so production automation may be better served by Jaeger's supported gRPC query APIs or by querying metrics from the Collector/Prometheus path.
- The span metrics connector is currently alpha and has an announced duration-unit change from milliseconds to seconds in its documentation. The post now uses the current default millisecond metric names, but future Collector versions may require updating duration queries.
- Python snippets were syntax-checked with `python3`; YAML snippets were parsed with PyYAML.
