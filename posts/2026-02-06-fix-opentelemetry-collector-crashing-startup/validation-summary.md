# Validation Summary: How to Fix OpenTelemetry Collector Crashing on Startup

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Builder
- YAML configuration
- Kubernetes
- Docker
- systemd
- Linux networking and permissions

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector components documentation: https://opentelemetry.io/docs/collector/components/
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Contrib `groupbyattrs` processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector Contrib `tail_sampling` processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Current `otel/opentelemetry-collector-contrib:latest` Docker image CLI help and validation output, version `0.153.0`

## Issues Found
- The broken YAML example was valid YAML but invalid Collector configuration. Updated the section title and expected error message so it correctly describes Collector schema decoding failure rather than YAML parser failure.
- The OpenTelemetry Collector Builder manifest used older inline `gomod` examples and `v0.96.0` component versions. Updated it to the current documented nested `gomod` shape, current `v0.153.0` component examples, and included the basic config providers needed by custom distributions.
- The internal telemetry port example used `service.telemetry.metrics.address`, which is ignored as of Collector `v0.123.0`. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- The environment variable examples used bare `${VAR}` syntax. Updated them to the documented `${env:VAR}` and `${env:VAR:-default}` syntax and corrected the likely startup error to the current required-field validation behavior.
- The OOM section described `groupbyattrs` as a startup buffer-heavy processor. Replaced that with `tail_sampling`, which actually retains traces in memory until a sampling decision, and clarified that this is runtime memory pressure after traffic starts.

## Review Notes
Validated the corrected Collector configuration snippets with `otel/opentelemetry-collector-contrib:latest` (`0.153.0`) using `otelcol-contrib validate`. The post remains version-sensitive because the Collector configuration schema changes over time, especially under `service.telemetry`.
