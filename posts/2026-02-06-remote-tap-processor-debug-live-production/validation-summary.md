# Validation Summary: How to Use Remote Tap Processor to Debug Live Production Traffic Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Remote Tap processor
- OTLP telemetry pipelines
- WebSocket-based debugging
- Python
- YAML collector configuration

## Sources Consulted
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- Remote Tap processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/README.md
- Remote Tap processor package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/remotetapprocessor
- Remote Tap processor source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/processor.go
- Remote Tap processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/config.go
- OpenTelemetry Collector `ptrace.JSONMarshaler` docs: https://pkg.go.dev/go.opentelemetry.io/collector/pdata/ptrace
- websocket-client documentation: https://websocket-client.readthedocs.io/en/latest/

## Issues Found
- The post used `remote_tap` as the processor type. The official component type is `remotetap`, so the YAML examples and pipeline references were updated.
- The post claimed the processor exposes WebSocket or gRPC. The official README and implementation expose a WebSocket server, so the description was corrected to WebSocket only.
- The post described `limit` as a concurrent connection limit. The official config defines it as a messages-per-second rate limit, so the comments were corrected.
- The Python client used the OTLP gRPC TraceService API, which is not the remote tap protocol. It was replaced with a WebSocket client that receives JSON payloads written by the processor's `ptrace.JSONMarshaler`.
- The Python client referenced `time` without importing it. The corrected example imports `time`.
- The filter compared status only to numeric `2`. The JSON form may expose the status as `STATUS_CODE_ERROR`, so the filter now accepts both forms.
- The sampling scenario stated the tap output was pre-sampling unconditionally. That is only true when `remotetap` is placed before the sampler, so the text now states that caveat.
- The sampling example referenced an undefined `count_spans_from_tap` helper and divided by zero if no spans were tapped. It now counts spans from the stream directly and guards against zero.
- The example CLI endpoint was updated to include a `ws://` scheme.

## Review Notes
The Remote Tap processor is currently documented as alpha for logs, metrics, and traces in the contrib and k8s distributions. The post is technically valid after correction, but production use should account for that stability level and for the security exposure of raw telemetry over the tap endpoint.
