# Validation Summary: How to Troubleshoot Multi-Pipeline Routing Issues in the Collector

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector receivers, processors, exporters, connectors, and pipelines
- OpenTelemetry Collector debug exporter, filter processor, routing connector, and spanmetrics connector
- OTLP gRPC exporter and receiver configuration
- Prometheus queries for Collector internal telemetry
- Kubernetes `kubectl` commands
- Docker-based Collector validation
- Go OpenTelemetry SDK
- `grpcurl` synthetic trace requests

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Docker install documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging-to-debug exporter migration issue: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector contrib spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Go packages, compile-checked with Go 1.25 and current `go.opentelemetry.io/otel` modules

## Issues Found
- The first Collector YAML example had duplicate top-level `service` keys and used the now-ignored `service.telemetry.metrics.address` setting. I merged `telemetry` and `pipelines` into one `service` block and changed metrics exposure to the current `readers.pull.exporter.prometheus` schema.
- The post used the removed/deprecated `logging` exporter and `loglevel` setting. I changed examples and checklist text to use the `debug` exporter with `verbosity`.
- Filter processor examples used outdated `traces.span` syntax and described filters as include rules. Current filter processor conditions drop matching telemetry, so I converted them to `trace_conditions` with inverse predicates and added a default filter to keep tenant-specific data out of the catch-all pipeline.
- The routing connector example used `statement: route() where ...` style rules. I changed it to documented `context` plus `condition` routing table entries.
- The spanmetrics section incorrectly referred to the forward connector and configured duplicate `service.name` dimension. I corrected the description/comment and removed the duplicate dimension because `service.name` is already a default spanmetrics dimension.
- One detailed debugging Collector YAML snippet referenced an `otlp` receiver without defining it and used the old logging exporter. I added the missing receiver and changed the exporter to `debug`.
- The validation command used an outdated Collector image tag `0.93.0`, and the Kubernetes example did not mount the config file it validated. I updated the tag to `0.153.0` and added a ConfigMap mount in the `kubectl run` example.
- The Go sample imported an unused package, reused a span exporter across tracer providers that shut it down after the first helper call, and sent the priority test to the standard endpoint. I removed the unused import, created an exporter per helper call, and sent the priority test to port `4320`.

## Review Notes
All complete Collector YAML examples were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The Go sample was compile-checked in a temporary module with Go 1.25 and current OpenTelemetry Go dependencies. The `grpcurl` snippets were reviewed for command shape, but `grpcurl` is not installed in this workspace, so they were not executed end to end.
