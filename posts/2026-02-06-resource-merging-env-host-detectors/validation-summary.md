# Validation Summary: How to Configure Resource Merging Strategies When Combining Environment Variable

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK resources
- OpenTelemetry Python SDK resource detectors
- OpenTelemetry Go SDK resource package
- OpenTelemetry Java SDK autoconfiguration SPI
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python SDK resources source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Go SDK resource package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.28.0
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java ResourceProvider Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-extension-autoconfigure-spi/latest/io/opentelemetry/sdk/autoconfigure/spi/ResourceProvider.html

## Issues Found
- The Python example imported `HostResourceDetector` from `opentelemetry.resourcedetector.host`, which is not a documented public Python SDK import path. Replaced it with a minimal custom `ResourceDetector` that returns `host.name` and `host.arch`.
- The post said the host detector reads OS information. In current SDKs, host and OS information are handled separately, so the text and examples now distinguish host metadata from OS metadata and include `OsResourceDetector` / `resource.WithOS()`.
- The first Python merge example claimed manual values override detected values but called `manual_resource.merge(detected_resource)`, which makes the detected resource win on conflicts. Changed it to `detected_resource.merge(manual_resource)`.
- The examples used the older `deployment.environment` attribute. Updated examples to `deployment.environment.name`, matching current OpenTelemetry deployment semantic conventions.
- The Go example used `semconv.DeploymentEnvironment` from `semconv/v1.21.0`. Updated it to `semconv/v1.28.0` and `semconv.DeploymentEnvironmentName`.
- The Java example used `ConfigProperties` without importing it. Added the missing `io.opentelemetry.sdk.autoconfigure.spi.ConfigProperties` import.
- The Java prose referred to resource detectors registering through SPI. Updated it to resource providers, matching the `ResourceProvider` SPI.

## Review Notes
- Python syntax for the edited detector snippet was checked with `ast.parse`. The full Python example was not executed because OpenTelemetry Python is not installed in this workspace.
- The Go example was verified against official package documentation, but not compiled locally because the `go` binary is not installed in this workspace.
