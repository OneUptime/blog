# Validation Summary: How to Configure Low-Overhead eBPF Profiling for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector eBPF profiling distribution
- OpenTelemetry eBPF profiling receiver
- eBPF profiling on Linux
- Docker
- Kubernetes DaemonSet configuration
- OTLP profile export
- sysstat `mpstat`

## Sources Consulted
- OpenTelemetry eBPF profiler README: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- OpenTelemetry eBPF profiler receiver config source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/config/config.go
- OpenTelemetry eBPF profiler receiver defaults: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/factory_linux.go
- OpenTelemetry eBPF profiler local Collector example: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/cmd/otelcol-ebpf-profiler/local.example.yaml
- OpenTelemetry Collector eBPF Profiling Distribution README: https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-ebpf-profiler
- OpenTelemetry Collector releases latest release API, verified `v0.153.0` published on 2026-05-26: https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/latest
- Docker CLI availability and `docker stats` command verified locally with Docker 29.4.2.
- sysstat `mpstat` availability verified locally with sysstat 12.6.1.

## Issues Found
- The post used the outdated standalone `ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0` image and unsupported `OTEL_PROFILER_*` environment variables. Updated examples to use the supported `otel/opentelemetry-collector-ebpf-profiler:0.153.0` image, Collector configuration YAML, and `--feature-gates=+service.profilesSupport`.
- The post stated that the default sampling frequency is 19 Hz and configured `OTEL_PROFILER_SAMPLING_FREQUENCY`. The current receiver default is `samples_per_second: 20`; updated the explanation, examples, calculations, and summary.
- The post claimed a `OTEL_PROFILER_MAX_STACK_DEPTH` setting and a 64-frame production recommendation. No such current receiver setting exists; replaced it with supported receiver settings and guidance to avoid unsupported max stack depth environment variables.
- The post claimed process-name and Kubernetes label-selector filtering through `OTEL_PROFILER_FILTER_PROCESS_NAMES` and `OTEL_PROFILER_KUBERNETES_LABEL_SELECTOR`. These are not current receiver settings; updated the section to describe the profiler as a node agent and recommend filtering or aggregation downstream by profile attributes.
- The Kubernetes DaemonSet snippet lacked a required selector/template label pairing and used the old image and env vars. Updated it to a syntactically valid DaemonSet skeleton with `hostPID: true`, the supported image, feature gate, config mount, and `/sys` mount.
- The post used `OTEL_PROFILER_EXPORT_INTERVAL` and claimed a 10-second default. The current receiver uses `reporter_interval`, with a 5-second default; updated the batching section accordingly.
- The post included overly specific overhead and memory ranges not present in the current official project documentation. Replaced them with the project's documented 1% CPU and approximately 250 MB memory upper-limit targets and kept the recommendation to measure under staging load.

## Review Notes
- The OpenTelemetry Profiles signal and eBPF profiling receiver remain evolving areas, so version-pinned examples may need periodic review as Collector releases move beyond `v0.153.0`.
- The YAML snippets in the updated README were parsed successfully after editing.
