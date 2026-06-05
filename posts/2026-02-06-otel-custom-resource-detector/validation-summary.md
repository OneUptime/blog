# Validation Summary: Build a Custom Resource Detector That Auto-Discovers Your Deployment Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry resource model and semantic conventions
- OpenTelemetry Python SDK resources and resource detectors
- OpenTelemetry Go SDK resources and custom resource detectors
- OpenTelemetry Java SDK autoconfiguration ResourceProvider SPI
- OTLP trace exporting in Python

## Sources Consulted
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Python SDK resources API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python resources source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Go resources documentation: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go SDK resource package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Go semantic conventions package: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Java SDK configuration and ResourceProvider SPI: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java ResourceProvider Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-extension-autoconfigure-spi/latest/io/opentelemetry/sdk/autoconfigure/spi/ResourceProvider.html

## Issues Found
- The post used `deployment.environment`, which is deprecated in current OpenTelemetry semantic conventions. Changed examples and tests to use the stable replacement `deployment.environment.name`.
- The Python merge example claimed manual attributes take precedence, but `Resource.merge()` gives precedence to the updating resource passed to `merge()`. Changed the merge order to `detected_resource.merge(manual_resource)`.
- The Go section described a Collector resource detection processor, but the sample implemented the Go SDK `resource.Detector` interface. Updated the heading and description to match the code.
- The Go sample had unused imports and a missing `go.opentelemetry.io/otel/attribute` import, so it would not compile as shown. Removed unused imports and added the correct attribute import.
- The Go sample accepted a detection context but did not use it for the metadata HTTP call, and it only closed response bodies for successful responses. Switched to `http.NewRequestWithContext` and ensured any response body is closed.
- The Go sample used an older semantic conventions package. Updated it to `go.opentelemetry.io/otel/semconv/v1.37.0`, the current package documented for the Go SDK.
- The Java sample used `ConfigProperties` without importing it. Added the required `io.opentelemetry.sdk.autoconfigure.spi.ConfigProperties` import.
- The Python test sample used `os.environ` without importing `os` and imported `mock_open` without using it. Added the missing `os` import and removed the unused import.
- The post implied all cloud and Kubernetes detectors are built into the SDKs. Adjusted the wording to reflect that these detectors may come from SDKs or contrib packages depending on language and distribution.

## Review Notes
- The Java sample still assumes a local `fetchMetadata()` helper exists; that is acceptable for a shortened blog snippet, but a future revision could include a small helper implementation for copy-paste completeness.
- The custom `mycompany.*` attributes are intentionally vendor-specific and do not need OpenTelemetry semantic convention names.
