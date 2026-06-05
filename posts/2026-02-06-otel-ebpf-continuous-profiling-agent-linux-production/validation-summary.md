# Validation Summary: How to Set Up the OpenTelemetry eBPF Continuous Profiling Agent

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Profiles
- OpenTelemetry eBPF Profiling distribution
- eBPF
- Linux
- systemd
- Kubernetes DaemonSet
- OTLP

## Sources Consulted
- OpenTelemetry eBPF profiler README: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/README.md
- OpenTelemetry eBPF profiler collector receiver config source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/config/config.go
- OpenTelemetry eBPF profiler collector receiver factory source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/factory_linux.go
- OpenTelemetry Collector eBPF Profiling distribution README: https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-ebpf-profiler
- OpenTelemetry Collector eBPF Profiling distribution release configuration: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-ebpf-profiler/.goreleaser.yaml
- OpenTelemetry Collector releases v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OpenTelemetry Profiles Alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/

## Issues Found
- The post used a nonexistent `otel-profiling-agent` release URL from `open-telemetry/opentelemetry-ebpf-profiler`. Updated installation to use the supported `otelcol-ebpf-profiler` artifacts from `open-telemetry/opentelemetry-collector-releases` v0.153.0.
- The post recommended the standalone profiler binary for production. Updated it to state that production use should use the OpenTelemetry Collector eBPF Profiling distribution, while the standalone `ebpf-profiler` binary is for development and debugging.
- Several CLI flags were inaccurate for production deployment, including `-service-name`, `-tags`, and `-process-filter`. Replaced CLI examples with collector configuration keys such as `samples_per_second`, `reporter_interval`, and `tracers`.
- The collector examples used `batch` in `profiles` pipelines. Validation with OpenTelemetry Collector v0.153.0 showed that `batch` does not support the profiles telemetry type, so the profile pipelines were updated to omit processors.
- The post described the regular OTLP receiver as part of the eBPF profiling agent. Clarified that `otelcol-ebpf-profiler` is the node profiler and that a separate gateway collector can receive forwarded profiles via OTLP when `service.profilesSupport` is enabled.
- The Kubernetes example used an incorrect image and passed unsupported agent CLI flags. Updated it to use the official `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-ebpf-profiler:0.153.0` image with a mounted collector config.
- The kernel prerequisite was outdated. Updated it to reflect the current profiler's Linux 5.10+ kernel check.

## Review Notes
The Profiles signal and the eBPF profiling receiver are still in development, so future Collector releases may change feature gates, receiver configuration, or backend support. The corrected node-profiler and gateway collector configs were validated with the v0.153.0 `otelcol-ebpf-profiler` and `otelcol` binaries.
