# Validation Summary: How to Configure the Remote Tap Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Remote Tap processor
- OpenTelemetry Collector Remote Tap extension
- OpenTelemetry Collector processors, exporters, and service pipelines
- WebSocket-based telemetry inspection
- Collector self-telemetry and profiling

## Sources Consulted
- OpenTelemetry Collector component list, Extensions: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector component list, Processors: https://opentelemetry.io/docs/collector/components/processor/
- Remote Tap processor README and package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/remotetapprocessor
- Remote Tap processor source and config for v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/remotetapprocessor
- Remote Tap extension README and package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/remotetapextension
- Remote Tap extension source and config for v0.153.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/extension/remotetapextension
- OpenTelemetry Collector transformation and filter processor examples: https://opentelemetry.io/docs/collector/transforming-telemetry/
- websocat project README for generic WebSocket client usage: https://github.com/vi/websocat

## Issues Found
- The post described a `remote_tap` extension as the component that creates pipeline tap points. The current Collector component that taps telemetry is the `remotetap` processor; the `remotetap` extension is a separate web server/viewer component. Updated the explanation throughout the post.
- All configuration examples used unsupported `remote_tap` extension fields such as `auth`, `sampling`, `tap_points`, `outputs`, `sessions`, `performance`, `memory`, `redaction`, `activation`, and custom metrics. Replaced them with supported `remotetap` processor configuration using `endpoint` and `limit`.
- The original examples implied a single extension could tap receivers, processors, and exporters by location. Updated the architecture and examples to show named `remotetap` processor instances placed directly in pipeline order.
- Updated multi-signal examples to use separate named `remotetap` processor instances and separate WebSocket endpoints, avoiding endpoint conflicts between traces, metrics, and logs pipelines.
- The original `otelcol-tap` CLI commands referenced a CLI that is not documented by the OpenTelemetry Collector. Replaced them with generic WebSocket client examples and clarified that any compatible WebSocket client can read the stream.
- The original post claimed built-in filtering, output routing, session management, redaction, adaptive sampling, memory controls, and dedicated tap metrics. Reworked those sections to state what Remote Tap supports and point to standard Collector processors, exporters, infrastructure access controls, and self-telemetry for those concerns.
- Corrected performance and bottleneck guidance: Remote Tap can inspect payloads but does not add timestamps or calculate stage latency. Added guidance to use Collector internal telemetry and the `pprof` extension for performance analysis.

## Review Notes
The Remote Tap processor is alpha for traces, metrics, and logs in the OpenTelemetry Collector contrib distribution. The Remote Tap extension is development stability and its documented configuration is limited to the HTTP server settings inherited from Collector server config. Future updates should re-check the component docs because these components are still early-stage and their behavior may change.
