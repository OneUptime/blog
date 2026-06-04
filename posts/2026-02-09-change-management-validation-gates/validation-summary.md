# Validation Summary: How to Build a Kubernetes Change Management Process

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes CustomResourceDefinitions
- kubectl
- JSON Schema
- Python jsonschema
- Flask
- Kubernetes Python client
- Open Policy Agent / Rego
- Prometheus / PromQL
- k6
- kubesec
- Bash

## Sources Consulted
- Kubernetes CRD API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes custom resources documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent time built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/time
- Open Policy Agent object built-ins: https://www.openpolicyagent.org/docs/policy-reference/builtins/object
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Python jsonschema validation documentation: https://python-jsonschema.readthedocs.io/en/stable/validate/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Kubesec usage documentation: https://github.com/controlplaneio/kubesec

## Issues Found
- The Python `jsonschema.validate()` call did not pass a `FormatChecker`, so the `format: "email"` field would not be enforced. Updated the validator to pass `format_checker=jsonschema.FormatChecker()`.
- The Python webhook snippet called `is_blackout_window()` and `resource_exists()` without defining them. Added minimal implementations, including Kubernetes dynamic-client lookup for existing resources.
- The change-request schema did not require `operation` or `apiVersion`, and did not require manifests for create/update operations even though later policy checks use those fields. Added those fields and a draft-07 conditional requirement for `manifest`.
- The OPA policy used pre-Rego-v1 partial set syntax while the Deployment used `openpolicyagent/opa:latest`. Updated the policy to Rego v1 syntax with `import rego.v1`, `deny contains msg if`, and `if` helper rules.
- The OPA policy reused `input.spec.resources[_]` independently inside the same rules, which could allow different resources to satisfy different expressions in one rule. Bound each checked resource to a `resource` variable.
- The privileged-container OPA rule checked only `manifest.spec.containers`, which applies to Pods but not Deployments. Added a Deployment-specific rule using `manifest.spec.template.spec.containers`.
- The `ChangeApproval` CRD defined a `status` field but did not enable the status subresource. Added `subresources: status: {}` so controllers can update status separately from spec, and clarified that the sample object shows status after it is recorded.
- The canary PromQL error-rate expressions divided series with mismatched label sets, which can return empty results. Wrapped numerator and denominator in `sum(rate(...))`.
- The canary PromQL latency expressions used `histogram_quantile()` directly on bucket rates without aggregation by `le`. Updated them to `histogram_quantile(0.95, sum by (deployment, le) (...))`.
- The rollback health-check PromQL error-rate expression had the same label-matching problem as the canary queries. Wrapped numerator and denominator in `sum(rate(...))`.

## Review Notes
- The YAML examples parse successfully, including the embedded JSON schema.
- The Rego policy passes `opa check` with OPA 1.17.0.
- The embedded Python compiles, but the runtime image for the webhook must include Flask, jsonschema, and the Kubernetes Python client.
- `kubectl` is not installed in the local environment, so kubectl commands were reviewed against official Kubernetes command references rather than executed.
