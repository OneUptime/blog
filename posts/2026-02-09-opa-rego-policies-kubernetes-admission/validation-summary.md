# Validation Summary: How to Write OPA Rego Policies for Custom Kubernetes Admission Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission control
- OPA Gatekeeper
- Rego policy language
- kubectl
- OPA CLI
- Kubernetes NetworkPolicy

## Sources Consulted
- Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper data replication documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- Gatekeeper debugging and tracing documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/debug/
- OPA policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- OPA CLI reference: https://www.openpolicyagent.org/docs/cli/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/

## Issues Found
- The namespace test command used `kubectl create namespace test-ns --labels=...`, but the official `kubectl create namespace` command does not support a `--labels` flag. Changed the successful test case to apply a Namespace manifest with the required labels.
- The resource requirements policy accepted `requests` parameters but only checked that a requests object existed; it did not enforce the required request keys. Added a `missing_requests` violation rule mirroring the existing required limits check.
- The NetworkPolicy helper example read namespaced NetworkPolicy resources from `data.inventory.cluster`, but Gatekeeper stores namespace-scoped synced objects under `data.inventory.namespace[namespace]`. Updated the inventory path and added a note that NetworkPolicy resources must be synced into Gatekeeper inventory.
- The NetworkPolicy helper example accessed `podSelector.matchLabels` directly, so an empty `podSelector` would not match even though Kubernetes treats it as selecting all pods in the namespace. Updated the code to use `object.get(..., {})` for `matchLabels`.
- The OPA CLI test command used legacy Gatekeeper Rego syntax with a latest OPA binary. Added `--v0-compatible` so the local CLI test matches the legacy `spec.targets[].rego` syntax used in the examples.
- The debugging section implied Rego traces can simply be viewed from Gatekeeper logs. Gatekeeper requires traces to be enabled in its Config resource for selected users and resources. Updated the text to state that traces must be enabled first.

## Review Notes
Local execution was not performed because `kubectl` and `opa` are not installed in the workspace. The review was completed against official Gatekeeper, OPA, and Kubernetes documentation.
