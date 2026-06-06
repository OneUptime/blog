# Validation Summary: How to Build a Custom Resource Detector That Merges Cloud Provider Metadata

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK resources and resource detectors
- OpenTelemetry Go SDK resource detectors
- OpenTelemetry semantic conventions
- AWS EC2 Instance Metadata Service v2 (IMDSv2)
- YAML application configuration

## Sources Consulted
- OpenTelemetry Python SDK resource API documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Python SDK resource implementation reference: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Go SDK resource package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry cloud semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/cloud/
- OpenTelemetry deployment semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry feature flag semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/feature-flag/
- AWS EC2 instance metadata categories: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html
- AWS EC2 IMDSv2 access documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 tags in instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/work-with-tags-in-IMDS.html

## Issues Found
- The Python detector examples used `Resource.create()` inside `ResourceDetector.detect()`. The OpenTelemetry Python SDK documentation says detector implementations should instantiate `Resource` directly to avoid recursive detector execution. Changed the examples to return `Resource(...)`.
- The Python custom detector did not initialize the `ResourceDetector` base class. Added `super().__init__()` so SDK error-handling state is initialized.
- The Python detector used the deprecated `deployment.environment` semantic convention attribute. Changed it to the current `deployment.environment.name` attribute.
- The Python YAML loader assumed `yaml.safe_load()` always returns a mapping. Changed it to `yaml.safe_load(f) or {}` so an empty config file does not raise an attribute error.
- The Python usage example imported `Resource` but did not use it. Removed the unused import.
- The Python test example imported `pytest` but did not use it. Removed the unused import.
- The Go implementation was not self-contained: it imported unused packages and referenced missing `loadAppConfig` and `fetchMetadata` functions. Added those functions, imported the required packages, and kept the example aligned with the Python detector.
- The Go detector declared AWS attributes after any token response, even if the IMDSv2 token endpoint returned a non-200 status. Added a status-code check before treating the environment as AWS EC2.
- The Go implementation used the deprecated `deployment.environment` semantic convention through tag mapping. Updated the mapping to `deployment.environment.name`.
- The Go example imported an older semantic convention package version. Updated it from `go.opentelemetry.io/otel/semconv/v1.21.0` to `go.opentelemetry.io/otel/semconv/v1.37.0`.

## Review Notes
- `team.name`, `tenant.id`, and `feature.*` are custom resource attributes, not stable OpenTelemetry semantic convention attributes. They are acceptable as application-specific attributes, but teams should document custom namespaces and avoid high-cardinality values.
- AWS instance tags are only available through IMDS when tag access in instance metadata is explicitly enabled.
