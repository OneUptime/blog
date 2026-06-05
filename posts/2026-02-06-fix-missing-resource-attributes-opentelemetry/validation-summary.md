# Validation Summary: How to Fix Missing Resource Attributes in OpenTelemetry Telemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry resource attributes and semantic conventions
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- OpenTelemetry Go SDK
- OpenTelemetry Collector processors
- Kubernetes environment variables
- otel-cli

## Sources Consulted
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry General SDK Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python resources API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Go semantic conventions package: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- otel-cli package documentation: https://pkg.go.dev/github.com/equinix-labs/otel-cli

## Issues Found
- The post used the deprecated `deployment.environment` semantic convention. Updated examples and explanations to use the current stable `deployment.environment.name` attribute.
- The JavaScript examples used `new Resource(...)` and `Resource.detect(...)`, which are not the current documented ways to create or detect resources in `@opentelemetry/resources`. Updated them to use `resourceFromAttributes(...)` and `detectResources(...)`.
- The Go example used an older semantic convention package and `semconv.DeploymentEnvironment(...)`. Updated it to `semconv/v1.37.0` and `semconv.DeploymentEnvironmentName(...)`.
- The Kubernetes example referenced `$(POD_NAME)` and `$(NODE_NAME)` before those environment variables were defined. Moved the Downward API variables before `OTEL_RESOURCE_ATTRIBUTES`, because Kubernetes only expands previously defined env vars.
- The Kubernetes `OTEL_RESOURCE_ATTRIBUTES` example used a folded multi-line value with spaces after commas, which could produce invalid or unintended attribute keys. Changed it to a comma-separated string without spaces.
- The Python AWS resource detector import path and package name were incorrect. Updated them to use `opentelemetry-sdk-extension-aws` and the documented `opentelemetry.sdk.extension.aws.resource.*` imports.
- The Python merge example gave detected environment attributes precedence over explicit attributes. Reversed the merge order so explicit resource attributes take precedence.
- The post stated that `OTEL_SERVICE_NAME` and `OTEL_RESOURCE_ATTRIBUTES` work across all OpenTelemetry SDKs. Adjusted this to note that they are part of the general SDK configuration but language support can vary.

## Review Notes
The `otel-cli` example uses flags documented by the project, but `otel-cli` is a third-party helper rather than part of the core OpenTelemetry project. The Collector examples are technically valid but minimal; a real collector configuration also needs receivers and exporters defined elsewhere in the full config.
