# Validation Summary: How to Configure Jaeger Remote Sampling with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- Jaeger remote sampling
- Jaeger sampling strategy JSON
- OpenTelemetry Java agent and Java SDK
- OpenTelemetry Python SDK
- OTLP trace export

## Sources Consulted
- OpenTelemetry Collector Contrib Jaeger Remote Sampling extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/jaegerremotesampling
- OpenTelemetry Collector Contrib Jaeger Remote Sampling extension source configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/jaegerremotesampling/config.go
- OpenTelemetry Collector Contrib Jaeger Remote Sampling extension defaults: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/jaegerremotesampling/factory.go
- Jaeger sampling documentation: https://www.jaegertracing.io/docs/2.19/architecture/sampling/
- Jaeger APIs documentation for remote sampling endpoints: https://www.jaegertracing.io/docs/2.0/apis/
- OpenTelemetry SDK general sampler configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Java SDK configuration docs: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java JaegerRemoteSamplerBuilder source: https://github.com/open-telemetry/opentelemetry-java/blob/main/sdk-extensions/jaeger-remote-sampler/src/main/java/io/opentelemetry/sdk/extension/trace/jaeger/sampler/JaegerRemoteSamplerBuilder.java
- OpenTelemetry Python sampling docs: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- opentelemetry-sdk-extension-aws package documentation: https://pypi.org/project/opentelemetry-sdk-extension-aws/

## Issues Found
- The Collector extension was configured as `jaeger_remote_sampling`, but the current Collector Contrib component ID is `jaegerremotesampling`. Updated the extension block and `service.extensions` reference.
- The Collector example omitted `reload_interval` and implied the Collector watched the file directly. Added `source.reload_interval` and reworded the hot-reload explanation to describe periodic polling.
- The article described only HTTP serving, but OpenTelemetry Java's Jaeger remote sampler uses the Jaeger gRPC sampling endpoint. Added a `grpc` listener on port 14250 and updated the Java agent and programmatic Java examples to use `http://collector:14250`.
- The Java programmatic import path was incorrect. Updated it to `io.opentelemetry.sdk.extension.trace.jaeger.sampler.JaegerRemoteSampler`.
- The Java agent command exported OTLP to port 4317 without setting the OTLP protocol. Added `-Dotel.exporter.otlp.protocol=grpc` so the endpoint matches the Collector's OTLP gRPC receiver.
- The per-operation JSON example used `ratelimiting`, but Jaeger documentation states rate limiting is not supported for `operation_strategies`. Replaced that operation strategy with a probabilistic strategy and updated the explanation.
- The Python section claimed Jaeger remote sampling support through `opentelemetry-sdk-extension-aws`, but that package is for AWS X-Ray SDK extensions. Reworded the section to explain that Python needs a custom sampler for this behavior.
- The Python example updated `manager.current_rate`, but the configured `TraceIdRatioBased` sampler would keep using its initial rate. Added a small custom `DynamicRateSampler` so new root-span decisions use the latest polled rate.
- The Python response parsing checked for the wrong `strategyType` shape. Updated it to handle Jaeger's `{"strategyType":"PROBABILISTIC", ...}` response format.

## Review Notes
The post is now technically accurate for current OpenTelemetry Collector Contrib and SDK behavior. The Python example is intentionally minimal and only handles probabilistic Jaeger sampling responses; production support for rate-limiting and per-operation strategies would require a fuller custom sampler implementation.
