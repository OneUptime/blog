# Validation Summary: How to Configure the zPages Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector zPages extension
- OpenTelemetry Collector debug exporter
- OpenTelemetry Collector TLS configuration
- Kubernetes Service and port-forwarding
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector zPages extension README: https://pkg.go.dev/go.opentelemetry.io/collector/extension/zpagesextension
- OpenTelemetry Collector troubleshooting documentation for zPages: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.153.0/exporter/debugexporter
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector HTTP server configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.153.0/config/confighttp/README.md
- OpenTelemetry Collector TLS configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.153.0/config/configtls/README.md
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post described `TracezZ` and `RpczZ` pages. Current Collector zPages routes use `TraceZ` and do not list an RpcZ route; they include ServiceZ, PipelineZ, ExtensionZ, FeatureZ, TraceZ, and optional ExpvarZ. Updated the page names and feature descriptions.
- The post implied TraceZ samples arbitrary application traces passing through the Collector. Current documentation describes TraceZ as exposing Collector trace operations from instrumented components, including latency buckets, running spans, and error samples. Updated the TraceZ explanation and troubleshooting notes.
- The post used the deprecated `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity`, while keeping `sampling_initial` and `sampling_thereafter` where appropriate.
- The architecture and introductory text described zPages as a sidecar-like observer of telemetry data flowing through the pipeline. Updated this to describe it as an in-process diagnostic extension exposing live information from instrumented Collector components.
- The latency bucket examples were inaccurate for current zPages TraceZ documentation. Updated them to match the documented bucket scale from microseconds through one minute.

## Review Notes
The YAML snippets parse successfully. The advanced TLS and mTLS fields shown are supported by the Collector HTTP server and TLS configuration used by zPages. The Kubernetes Service and `kubectl port-forward` command are syntactically valid for internal access to the zPages port.
