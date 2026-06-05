# Validation Summary: How to Use OpenTelemetry eBPF Profiler for Cross-Language Profiling Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry eBPF Profiler
- OpenTelemetry Collector profiles pipeline
- eBPF on Linux
- Docker
- C++ and Rust native unwinding
- CPython stack unwinding
- Node.js / V8 stack unwinding
- Grafana Pyroscope / OTLP profile export

## Sources Consulted
- OpenTelemetry eBPF profiler README: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- OpenTelemetry eBPF profiler Collector config source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/config/config.go
- OpenTelemetry eBPF profiler Collector factory defaults: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/factory_linux.go
- OpenTelemetry eBPF profiler local Collector example: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/cmd/otelcol-ebpf-profiler/local.example.yaml
- OpenTelemetry Collector eBPF profiling distribution README: https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-ebpf-profiler
- OpenTelemetry Collector eBPF profiling distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-ebpf-profiler/manifest.yaml
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md

## Issues Found
- The post used a non-current `ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0` image and described the standalone agent as the primary deployment. Updated the setup to use the supported OpenTelemetry Collector eBPF profiling distribution image, `otel/opentelemetry-collector-ebpf-profiler:0.153.0`, and a Collector config mount.
- The Collector YAML used an `otlp` receiver as if an external profiler agent was sending profiles. Updated it to use the `profiling` receiver included in the eBPF profiling Collector distribution.
- The config used the deprecated `otlphttp` exporter component name. Updated it to `otlp_http`.
- The kernel requirement said Linux 4.19+ and recommended 5.8+. Current profiler validation requires Linux 5.10+ unless the distribution has backported required eBPF features and `no_kernel_version_check` is used. Updated the text accordingly.
- The native unwinding description said the profiler reads DWARF unwind info directly. Updated it to describe frame pointers and ELF `.eh_frame` unwind information, matching the profiler documentation that native unwinding does not require DWARF debug information on the host.
- The filtering section claimed support for process-name, container ID, and Kubernetes pod-label filtering through `OTEL_PROFILER_FILTER_PROCESS_NAMES`. No such receiver setting or environment variable exists in the current supported configuration. Replaced the section with guidance to filter/aggregate downstream by process, container, pod, or resource attributes.
- The sampling section claimed a typical 19 Hz default and used `OTEL_PROFILER_SAMPLING_FREQUENCY`. Current receiver defaults use `samples_per_second: 20`; updated the example to configure `samples_per_second` in YAML.
- The Kubernetes capability guidance mentioned `SYS_PTRACE` but missed current eBPF-related capabilities. Updated it to mention `hostPID: true`, privileged mode or explicit `SYS_ADMIN`, `PERFMON`, and `BPF` capabilities, plus host `/proc` and `/sys` access.

## Review Notes
The OpenTelemetry Profiles signal and related Collector support are still alpha, so image versions, component names, and feature-gate requirements may change. The post now reflects the current supported deployment path as of 2026-06-05, but future reviews should re-check the OpenTelemetry Collector release manifest and eBPF profiler receiver configuration.
