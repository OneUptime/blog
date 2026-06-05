# Validation Summary: How to Replace Env Variables with OpenTelemetry YAML Declarative Config for SDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry environment variables
- YAML configuration files
- OTLP exporters
- Kubernetes ConfigMap and Deployment manifests

## Sources Consulted
- OpenTelemetry Declarative Configuration guide: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Configuration Data Model: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Configuration Types Reference: https://opentelemetry.io/docs/specs/otel/configuration/types/
- OpenTelemetry configuration JSON schema repository: https://github.com/open-telemetry/opentelemetry-configuration
- OpenTelemetry declarative configuration stability announcement: https://opentelemetry.io/blog/2026/stable-declarative-config/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The post used the older experimental `OTEL_EXPERIMENTAL_CONFIG_FILE` variable. Updated it to the stable `OTEL_CONFIG_FILE` variable documented by OpenTelemetry.
- The examples used `file_format: "0.3"`. Updated them to `file_format: "1.0"` to match the stable OpenTelemetry declarative configuration schema.
- The `resource.attributes` examples used a mapping shape, but the current schema expects a list of `name` / `value` entries. Rewrote the resource attributes accordingly.
- The exporter examples used a generic `otlp` exporter with `protocol: "grpc"`, but the current schema uses explicit exporter keys such as `otlp_grpc` and `otlp_http`. Replaced those examples with `otlp_grpc`.
- The header examples used a mapping, but the current schema expects a list of `name` / `value` pairs. Rewrote the Authorization header examples.
- The propagator example used `composite: [tracecontext, baggage]`, but the schema expects a list of propagator objects or `composite_list`. Rewrote it as `- tracecontext:` and `- baggage:`.
- The Kubernetes Deployment snippet omitted required Deployment structure such as `metadata.name`, `spec.selector`, matching template labels, and a container image. Added those fields while keeping the example minimal.
- The claim that the config file "takes precedence" over environment variables was imprecise. Updated it to state that when `OTEL_CONFIG_FILE` is set, SDK environment variables are ignored unless explicitly referenced through substitution.
- The language support note was outdated. Updated it to reflect current OpenTelemetry documentation and implementation tracking as of June 2026.

## Review Notes
Validated the updated YAML snippets by parsing all YAML fences and validating the OpenTelemetry configuration examples against the official `opentelemetry_configuration.json` schema. Declarative configuration support still varies by SDK implementation, so readers should continue checking their language-specific OpenTelemetry documentation before rollout.
