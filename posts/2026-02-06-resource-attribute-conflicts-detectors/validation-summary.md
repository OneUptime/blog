# Validation Summary: How to Handle Resource Attribute Conflicts When Multi Detectors Report

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry SDK resource attributes
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry semantic conventions
- OpenTelemetry Collector resource processor

## Sources Consulted
- OpenTelemetry Python SDK resource documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python SDK resource source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Go SDK resource package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry semantic conventions deployment attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/resourceprocessor

## Issues Found
- Corrected the schema URL merge description. The Python SDK uses the updating resource schema URL only when the original schema URL is empty, and different non-empty schema URLs produce a conflict instead of simply letting "other" win.
- Replaced deprecated `deployment.environment` examples with `deployment.environment.name`, matching current OpenTelemetry semantic conventions.
- Fixed the Python detector-ordering example so the detector classes are defined in the snippet instead of referencing undefined `HostResourceDetector` and `CloudResourceDetector` names.
- Changed the priority merge helper to start from `Resource.get_empty()` instead of `Resource.create({})`, because `Resource.create` can include SDK default and environment-derived attributes.
- Updated the Go example by removing unused imports and changing the semantic conventions import and function from `DeploymentEnvironment` to `DeploymentEnvironmentName`.
- Fixed the Collector resource processor YAML key to use `deployment.environment.name`.

## Review Notes
Python resource snippets were checked against a temporary `opentelemetry-sdk` install in `/tmp`. The local machine does not have the `go` toolchain installed, so the Go snippet was verified against the official Go package documentation rather than compiled locally.
