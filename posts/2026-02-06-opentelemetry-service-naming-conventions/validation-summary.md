# Validation Summary: How to Configure Service Naming Conventions in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry resource semantic conventions
- OpenTelemetry JavaScript SDK resource configuration
- OpenTelemetry Python SDK resource configuration
- OpenTelemetry Go SDK resource configuration
- Kubernetes pod environment variable configuration
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry deployment attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry general SDK configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python SDK resources documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/resources.html
- OpenTelemetry Go resource package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/resource
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/

## Issues Found
- JavaScript examples used the old `new Resource(...)` constructor and `SemanticResourceAttributes` constants. Updated them to current `resourceFromAttributes(...)` usage and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION` constants.
- Python examples imported and used deprecated `ResourceAttributes`. Updated examples to use string semantic attribute names such as `"service.name"` and `"service.namespace"` with `Resource.create(...)`.
- The environment example used the deprecated `deployment.environment` semantic attribute. Updated it to `deployment.environment.name` and replaced the Go helper with `semconv.DeploymentEnvironmentName(...)`.
- Go examples omitted the required schema URL argument to `resource.NewWithAttributes(...)`. Added `semconv.SchemaURL`.
- Go snippets were not syntactically complete in places. Added missing imports, wrapped executable statements in functions, and avoided unused local variables.
- The migration guidance said telemetry could be sent with both old and new service names. Clarified that `service.name` should carry the new name while the old name can be carried in a legacy resource attribute during migration.
- The first JavaScript example reused the same `const` names in one code block. Renamed the variables so the block parses correctly.

## Review Notes
- JavaScript and Python code blocks were parse-checked locally. Go tooling (`go`/`gofmt`) was not available in the local environment, so Go snippets were reviewed statically against official package documentation.
- Several custom attributes such as `service.domain`, `service.component`, and `service.type` are non-standard but valid as custom resource attributes. Future revisions could use an organization-specific prefix to reduce the chance of colliding with future semantic conventions.
