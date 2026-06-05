# Validation Summary: How to Understand OpenTelemetry's Zero-Code Instrumentation Options

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry zero-code instrumentation
- OpenTelemetry Java agent
- OpenTelemetry Python auto-instrumentation
- OpenTelemetry JavaScript/Node.js auto-instrumentation
- OpenTelemetry Go zero-code instrumentation
- Grafana Beyla
- OpenTelemetry .NET Automatic Instrumentation
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry zero-code instrumentation concepts: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java agent HTTP instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/http/
- OpenTelemetry Java agent instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript SDK NodeSDK API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry Go zero-code instrumentation: https://opentelemetry.io/docs/zero-code/go/
- OpenTelemetry .NET Automatic Instrumentation getting started: https://opentelemetry.io/docs/zero-code/dotnet/getting-started/
- OpenTelemetry .NET Automatic Instrumentation configuration: https://opentelemetry.io/docs/zero-code/dotnet/configuration/
- OpenTelemetry .NET Automatic Instrumentation GitHub releases: https://github.com/open-telemetry/opentelemetry-dotnet-instrumentation/releases
- Grafana Beyla export configuration: https://grafana.com/docs/beyla/latest/configure/export-data/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- The automatic instrumentation example implied that an agent would create spans for the `fetch_user` function itself. OpenTelemetry zero-code instrumentation typically instruments supported libraries and framework calls rather than arbitrary business functions, so the comment was changed to say supported library calls are instrumented.
- The Java agent example used `http://localhost:4317` without setting `otel.exporter.otlp.protocol=grpc`. Current OpenTelemetry Java agent 2.x defaults to `http/protobuf`, so the endpoint was changed to `http://localhost:4318`.
- The Go section said true zero-code instrumentation is not possible with standard Go and described `otel-go-instrumentation` as compile-time instrumentation. Current OpenTelemetry docs list Go zero-code instrumentation as work in progress, and the official Go auto-instrumentation package uses eBPF, so the section was corrected.
- The .NET download URLs used stale asset names. Current OpenTelemetry .NET Automatic Instrumentation release assets use names such as `opentelemetry-dotnet-instrumentation-linux-glibc-x64.zip` and `opentelemetry-dotnet-instrumentation-windows.zip`, so the commands were updated.
- The Java HTTP header capture properties used old names. They were updated to `otel.instrumentation.http.client.capture-request-headers` and `otel.instrumentation.http.server.capture-response-headers`.
- The Java database statement sanitizer property used a JDBC-specific name. Current Java agent configuration uses `otel.instrumentation.common.db-statement-sanitizer.enabled`, so the snippet was updated.

## Review Notes
The performance overhead percentages are workload-dependent estimates rather than OpenTelemetry guarantees. They are acceptable as broad guidance, but a future revision should either cite a benchmark context or soften the exact ranges.
