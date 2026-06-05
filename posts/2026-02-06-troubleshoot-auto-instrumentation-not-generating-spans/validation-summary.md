# Validation Summary: How to Troubleshoot Auto-Instrumentation Not Generating Spans

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry Express and HTTP instrumentations
- OpenTelemetry Python zero-code instrumentation
- OTLP trace exporting
- OpenTelemetry sampling and diagnostic logging

## Sources Consulted
- OpenTelemetry JavaScript zero-code instrumentation: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript instrumentation libraries: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry Node.js SDK package documentation: https://www.npmjs.com/package/@opentelemetry/sdk-node
- OpenTelemetry Express instrumentation package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry general SDK configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/

## Issues Found
- The Python `opentelemetry-instrument` example used `--traces_exporter otlp` with `http://localhost:4318` but did not specify `--exporter_otlp_protocol http/protobuf`. Official Python agent docs state that `otlp` uses gRPC by default, while HTTP requires the HTTP/protobuf protocol option. Added `--exporter_otlp_protocol http/protobuf` and `--metrics_exporter none` to keep the command trace-focused.
- The Python installation example installed only `opentelemetry-distro`. Official zero-code Python docs also install `opentelemetry-exporter-otlp` when exporting with OTLP. Updated the command to install both packages.
- The sampler section said the default sampler is `AlwaysOn`. The OpenTelemetry SDK environment variable specification lists the default as `parentbased_always_on`. Updated the wording to describe the parent-based default and its behavior.
- The duplicate package check said `@opentelemetry/api` should appear exactly once. That is too strict for npm output; the practical requirement is that it resolves to a single compatible version. Updated the wording.
- The diagnostic logging code used `DiagLogLevel.DEBUG` while the comment referred to `VERBOSE`. Updated the comment to match the code.

## Review Notes
The Node.js examples use current `@opentelemetry/sdk-node` options such as `traceExporter`, `spanProcessors`, `instrumentations`, and `sampler`. The Express instrumentation dependency on HTTP instrumentation is accurate according to the official Express instrumentation package documentation.
