# Validation Summary: How to Use Policy-as-Code for Observability: Enforce Minimum Instrumentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent
- Rego
- OpenTelemetry
- OpenTelemetry Collector
- Kubernetes admission control
- OPA Gatekeeper
- GitHub Actions

## Sources Consulted
- Open Policy Agent Policy Reference: https://www.openpolicyagent.org/docs/policy-reference
- Open Policy Agent CLI Reference: https://www.openpolicyagent.org/docs/cli
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OpenTelemetry Resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The standalone Rego examples used pre-OPA-1.0 partial set rule syntax such as `deny[msg] { ... }`. Because the CI example downloads the latest OPA binary, these policies would fail parsing under current OPA Rego v1. Updated the examples to use `deny contains msg if { ... }` and added `if` to helper function rule bodies.
- Two `sprintf` calls split a single string across adjacent quoted literals. Rego does not concatenate adjacent string literals, so OPA reported parse errors. Replaced each split message with a single string literal.

## Review Notes
- Verified the updated standalone Rego snippets with OPA 1.17.0 using `opa check`.
- Verified the Kubernetes policy query with sample compliant and non-compliant Deployment YAML using `opa eval --data ... --input ... --format pretty`.
- The Gatekeeper example uses the legacy `targets[].rego` field, which Gatekeeper still documents for Rego v0-style policies. Gatekeeper's Rego v1 syntax is opt-in through `targets[].code[].source.version: "v1"`.
