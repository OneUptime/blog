# Validation Summary: How to Set Up Observability for IoT Edge Devices Using OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (`ocb`)
- OTLP over HTTP and gRPC
- OpenTelemetry Collector processors, exporters, receivers, extensions, and config providers
- OpenTelemetry Python SDK
- Prometheus-style alerting rules
- IoT edge observability architecture

## Sources Consulted
- OpenTelemetry custom Collector builder documentation: https://opentelemetry.io/docs/collector/custom-collector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector `file_storage` extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Collector `filterprocessor` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector `transformprocessor` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Python API documentation: https://opentelemetry-python.readthedocs.io/en/stable/
- OpenTelemetry Collector Builder v0.153.0 release asset URL, checked with HTTP HEAD: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/cmd%2Fbuilder%2Fv0.153.0/ocb_0.153.0_linux_amd64

## Issues Found
- The custom Collector builder example used the outdated `v0.96.0` component versions. Updated the example to `v0.153.0` for Collector components and matching `v1.59.0` config provider modules.
- The builder example omitted the `resourceprocessor`, even though the edge agent configuration uses the `resource` processor. Added the processor module to the builder config.
- The builder example did not include config providers, but the generated Collector needs file and environment providers for the shown `--config` usage and `${env:...}` substitutions. Added `envprovider`, `fileprovider`, and `yamlprovider`.
- The builder install command used `go install go.opentelemetry.io/collector/cmd/builder@v0.96.0`. Updated it to the current documented `ocb` release asset download pattern and verified the v0.153.0 Linux AMD64 asset resolves.
- The edge agent config used legacy environment variable placeholders such as `${DEVICE_ID}`. Updated them to the current Collector provider syntax, such as `${env:DEVICE_ID}`.
- The first edge exporter config enabled the `file_storage` extension but did not attach it to an exporter sending queue, so it would not provide persistent exporter buffering as described. Added a file-backed `sending_queue` to the `otlphttp` exporter.
- The regional gateway transform processor only defined `trace_statements` while the processor was used in traces, metrics, and logs pipelines. Added equivalent `metric_statements` and `log_statements`.
- The filter processor example used the older nested `metrics.metric` style and the old `name` identifier. Updated it to `metric_conditions` with `metric.name`.
- The gateway section incorrectly described the batch processor as aggregating metrics into summaries. Updated the comments and prose to describe batching export requests rather than metric aggregation.
- The Python SDK explanation referred only to a 30-second export interval, but the code uses a 30-second span batch delay and a 60-second metric export interval. Updated the explanation to match the code.

## Review Notes
The post remains a practical architecture guide. The code snippets use placeholder application functions and exception types for sensor hardware and rollout control, which is acceptable for illustrative examples but would need concrete implementations in a runnable project.
