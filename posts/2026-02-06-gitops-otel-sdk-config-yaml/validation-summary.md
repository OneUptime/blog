# Validation Summary: How to Version Control and GitOps Your OpenTelemetry SDK Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry declarative SDK configuration
- OpenTelemetry JSON Schema validation
- YAML
- Git and GitHub pull request workflows
- GitHub Actions
- Kubernetes ConfigMaps and kubectl
- ArgoCD Applications
- GitHub CODEOWNERS

## Sources Consulted
- OpenTelemetry Configuration specification: https://opentelemetry.io/docs/specs/otel/configuration/
- OpenTelemetry Configuration SDK specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk/
- OpenTelemetry declarative configuration schema repository: https://github.com/open-telemetry/opentelemetry-configuration
- Current OpenTelemetry declarative configuration JSON Schema: https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/opentelemetry_configuration.json
- OpenTelemetry declarative configuration examples: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/examples
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- ArgoCD directory application documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/application_sources/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-codeowners

## Issues Found
- The OpenTelemetry SDK configuration example used `file_format: "0.3"`, map-style `resource.attributes`, and an `otlp` exporter with a separate `protocol: "grpc"` field. The current declarative configuration schema uses `file_format: "1.1"` in official examples, `resource.attributes` as an array of `{name, value}` entries, and separate `otlp_grpc` / `otlp_http` exporter keys. Updated the snippet accordingly and validated it against the current JSON Schema.
- The repository structure listed `scripts/validate.sh`, but the GitHub Actions workflow invoked `scripts/validate.py`. Updated the tree to match the workflow.
- The workflow used `envsubst` without installing the package that provides it. Added `gettext-base` installation before validation.
- The ArgoCD example pointed directly at `services`, which contains raw OpenTelemetry SDK config files rather than Kubernetes manifests. ArgoCD directory applications sync plain Kubernetes manifests, so the text and path were updated to clarify that the configs must be rendered as manifests such as ConfigMaps first.

## Review Notes
OpenTelemetry declarative configuration support remains language-specific even when a schema feature is valid, so teams should pin the schema version and verify their chosen SDK supports the file format and fields they use.
