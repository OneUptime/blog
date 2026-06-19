# Validation Summary: How to Configure OpenTelemetry Auto-Instrumentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry Java agent
- OpenTelemetry Python zero-code instrumentation
- OpenTelemetry JavaScript/Node.js SDK
- OpenTelemetry OTLP exporter configuration
- OpenTelemetry Operator for Kubernetes
- Docker
- Kubernetes Deployments
- Spring Boot OpenTelemetry starter

## Sources Consulted
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent suppressing instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java agent declarative configuration: https://opentelemetry.io/docs/zero-code/java/agent/declarative-configuration/
- OpenTelemetry Spring Boot starter SDK configuration: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/sdk-configuration/
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python auto-instrumentation configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript Node SDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript semantic conventions README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry Kubernetes Operator auto-instrumentation docs: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/

## Issues Found
- The Spring Boot YAML section said the properties are read by the OpenTelemetry Java agent. Updated the comments to clarify that `application.yaml` configuration is for the OpenTelemetry Spring Boot starter, while the Java agent uses system properties, environment variables, Java properties files, or declarative configuration files.
- The Java environment variable comments marked `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT` as required. Updated them to recommended, because OpenTelemetry SDKs provide defaults, although explicit service names and endpoints are best practice.
- The Node.js example used `new Resource(...)` and `SemanticResourceAttributes`, which are not current best practice and are deprecated/removed across recent JavaScript package versions. Updated the example to use `resourceFromAttributes` and current semantic convention constants.
- The Node.js install commands did not include packages used directly by the custom resource example. Added `@opentelemetry/resources` and `@opentelemetry/semantic-conventions`.
- The Java agent example used `OTEL_INSTRUMENTATION_HTTP_ENABLED`, which is not a Java agent instrumentation switch. Replaced it with concrete Java agent instrumentation names for Servlet and Java HTTP Client instrumentation.
- The Python and Node.js Kubernetes Deployment snippets were missing required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added selectors and labels so the snippets are structurally valid.
- The common OTLP protocol defaults table stated that `OTEL_EXPORTER_OTLP_PROTOCOL` defaults to `grpc`. Updated it to say the default is SDK-dependent and commonly `http/protobuf` or `grpc`, matching current OpenTelemetry docs. Also clarified that HTTP endpoints default to port 4318 while gRPC defaults to port 4317.

## Review Notes
The Java, Python, Node.js, Docker, and Kubernetes examples are technically valid after the fixes. Some snippets intentionally use `latest` container/image downloads for tutorial brevity; production deployments should pin OpenTelemetry agent and auto-instrumentation image versions.
