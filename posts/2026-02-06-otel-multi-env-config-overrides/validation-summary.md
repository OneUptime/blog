# Validation Summary: How to Set Up Multi-Environment Configuration Overrides

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry environment variable substitution
- OTLP gRPC exporters
- Kubernetes ConfigMaps
- Kustomize overlays and configMapGenerator
- Bash CI validation scripts

## Sources Consulted
- OpenTelemetry declarative configuration schema documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry compiled declarative configuration schema: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/opentelemetry_configuration.json
- OpenTelemetry validator documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/validator/README.md
- OpenTelemetry environment variable substitution specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/configuration/data-model.md#environment-variable-substitution
- OpenTelemetry semantic conventions for deployment environment name: https://opentelemetry.io/docs/specs/semconv/attributes-registry/deployment/
- Kustomize configMapGenerator reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The OpenTelemetry examples used the older `file_format: "0.3"` schema version. Updated the snippets to `file_format: "1.0"` to match the current stable declarative configuration schema.
- The deployment command used the older experimental `OTEL_EXPERIMENTAL_CONFIG_FILE` environment variable. Updated it to `OTEL_CONFIG_FILE`, which is the stable configuration-file environment variable.
- The examples used map-style `resource.attributes`. Updated them to the current list-style `name`/`value` entries required by the schema.
- The examples used `deployment.environment`; updated it to the current semantic convention attribute `deployment.environment.name`.
- The OTLP exporters were configured as `otlp` with `protocol: "grpc"`. Updated them to the current declarative configuration `otlp_grpc` exporter key.
- The production authorization header used a map under `headers`. Updated it to the schema-defined list of `name`/`value` pairs.
- The propagator examples used string entries such as `[tracecontext, baggage]`. Updated them to the current object entry form.
- The CI validation command used a non-matching `otel-config-validator validate --config --substitute-env --strict` interface. Updated it to the documented `otel_config_validator "config/otel-config.yaml"` invocation; the validator performs environment variable substitution before schema validation.

## Review Notes
The OpenTelemetry YAML examples were validated locally against the current official compiled declarative configuration JSON schema after substituting representative environment values. The official validator could not be built locally because Go is not installed in this environment. No local `kubectl` or `kustomize` binary was available, so the Kustomize snippets were checked against the official Kustomize reference rather than executed.
