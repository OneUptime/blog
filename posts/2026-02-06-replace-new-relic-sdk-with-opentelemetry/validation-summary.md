# Validation Summary: How to Replace New Relic SDK with OpenTelemetry Instrumentation

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenTelemetry Java agent
- OpenTelemetry JavaScript / Node.js SDK
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP exporters
- New Relic Java and Node.js agents
- New Relic OTLP ingest
- OneUptime OTLP ingest

## Sources Consulted
- OpenTelemetry Java agent getting started: https://opentelemetry.io/docs/zero-code/java/agent/getting-started/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript NodeSDKConfiguration API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry JavaScript OTLP trace gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript OTLP metrics gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-grpc.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- New Relic OTLP endpoint documentation: https://docs.newrelic.com/docs/opentelemetry/best-practices/opentelemetry-otlp/
- New Relic Node.js agent installation documentation: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/
- New Relic Node.js API reference: https://newrelic.github.io/node-newrelic/API.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Node.js SDK example used the deprecated `metricReader` option. Changed it to `metricReaders: [...]`, which is the current OpenTelemetry NodeSDK option.
- The custom span example referenced `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is exported from `@opentelemetry/api`, not from the `trace` namespace. Updated the import and status call.
- The Node.js package install comments omitted `@opentelemetry/api`, which is used by the custom tracing and metrics examples. Added it to the install command.
- The Java agent comment said configuration is done through environment variables, but the example uses JVM system properties. Reworded it to say environment variables or system properties.
- The OneUptime Collector exporter used an outdated endpoint. Updated it to `https://oneuptime.com/otlp` and added `encoding: json` to match OneUptime's Collector documentation.

## Review Notes
- New Relic's current OTLP documentation recommends OTLP/HTTP protobuf where available, but the post's New Relic gRPC endpoint is still supported.
- The examples intentionally use placeholder service names, tokens, and local Collector endpoints; readers still need to adapt those values to their deployment.
