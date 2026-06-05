# Validation Summary: How to Use Observability-as-Code with OpenTelemetry Collector Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector configuration
- Tail sampling processor
- Resource, batch, and memory limiter processors
- OTLP receiver and exporter
- GitHub Actions
- Open Policy Agent and Rego
- Kubernetes ConfigMaps and kubectl
- Python and PyYAML

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry tail-based sampling example: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry Collector official releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry resource processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/resourceprocessor
- OpenTelemetry attributes processor documentation for action semantics: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Open Policy Agent Rego keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/not
- Open Policy Agent CLI documentation: https://www.openpolicyagent.org/docs/latest/cli/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The repository tree listed `scripts/merge-configs.py`, but the code block and workflows used `scripts/merge_configs.py`. Updated the tree to use `merge_configs.py` consistently.
- The base exporter used older shorthand environment substitution (`${OTEL_BACKEND_ENDPOINT}` and `${OTEL_AUTH_TOKEN}`). Updated the examples to the current documented Collector form: `${env:OTEL_BACKEND_ENDPOINT}` and `${env:OTEL_AUTH_TOKEN}`.
- The `collector.version` resource attribute used `from_attribute: ""`, which would not copy a meaningful source attribute. Updated it to a deployment-provided environment value with a default: `${env:OTEL_COLLECTOR_VERSION:-unknown}`.
- The `resource/standard` processor was described as standard but was not included in any production pipeline. Added it to traces, metrics, and logs pipelines.
- The CI workflow pinned the Collector Contrib binary to `v0.96.0`, which is outdated. Updated it to `v0.153.0`, the latest official release available on June 5, 2026.
- The CI workflow referenced `scripts/check_naming.py`, but the post provides OPA policies rather than that Python script. Replaced it with an `opa eval --fail-defined` invocation and added OPA installation to the workflow.
- The Rego example used pre-OPA-v1 partial-set syntax (`deny[msg] { ... }`). Updated it to OPA v1 syntax (`deny contains msg if { ... }`) and verified it with OPA 1.17.0.
- The Rego comment said custom processors must use a team prefix, while the policy actually allows approved Collector component prefixes. Updated the comment to match the policy behavior.

## Review Notes
- Verified the updated Collector configuration shape with `otelcol-contrib validate` from OpenTelemetry Collector Contrib v0.153.0.
- Verified the updated Rego policy with `opa check` and verified the workflow-style `opa eval --fail-defined --input ... --data ... 'data.otel.naming.deny[_]'` command against OPA 1.17.0.
