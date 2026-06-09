# Validation Summary: How to Create Gatekeeper Constraint Templates

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- OPA Gatekeeper (Constraint Templates, Constraints)
- Open Policy Agent (OPA) / Rego
- Kubernetes (admission controllers, ValidatingWebhookConfiguration, CRDs)
- Helm (Gatekeeper Helm chart)
- kubectl
- Prometheus / ServiceMonitor (kube-prometheus-stack CRD)
- ArgoCD (Application CRD)
- Mermaid diagrams

## Sources Consulted
- Gatekeeper Helm chart values.yaml: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/values.yaml
- Gatekeeper Metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics
- Gatekeeper documentation (general): https://open-policy-agent.github.io/gatekeeper/website/docs/
- OPA Rego built-in functions reference (for `re_match`, `object.get`, `sprintf`, `endswith`, `trim_suffix`)
- Kubernetes admission controller documentation
- Prometheus Operator ServiceMonitor CRD (`monitoring.coreos.com/v1`)
- ArgoCD Application CRD (`argoproj.io/v1alpha1`)

## Issues Found

1. **Incorrect Helm chart value `mutatingWebhookEnabled=true`** (installation section). This value does not exist in the Gatekeeper Helm chart. Mutation in the Gatekeeper chart is controlled by the `disableMutation` value (default: `false`, meaning mutation is enabled by default).
   - **Fix**: Replaced `--set mutatingWebhookEnabled=true` with `--set disableMutation=false` and updated the surrounding comment to accurately describe how mutation is controlled.

2. **Missing markdown header on "Resource Limits Template" section**. The heading was rendered as plain text rather than an H2 section heading, breaking the document's structure and table of contents.
   - **Fix**: Added the `##` prefix so the section renders as a proper H2 heading consistent with surrounding sections.

3. **Incorrect Prometheus metric name `gatekeeper_request_duration_seconds`** in the monitoring metrics table. This metric does not exist; Gatekeeper exposes separate metrics for validation and mutation webhooks.
   - **Fix**: Renamed to `gatekeeper_validation_request_duration_seconds`, which is the actual metric name documented for webhook response duration.

## Review Notes
- The Rego built-in `re_match` used in the required-labels template still works but has been deprecated in favor of `regex.match` in newer OPA versions. Both function the same way; the code is functionally correct as written.
- The `apiVersion: templates.gatekeeper.sh/v1` and `constraints.gatekeeper.sh/v1beta1` API versions used throughout are current and correct for modern Gatekeeper releases (3.7+).
- The Helm repository URL `https://open-policy-agent.github.io/gatekeeper/charts` is the official chart location and is correct.
- The OPA install URL `https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static` is the canonical download path and is correct.
- The `data.inventory.namespace[...]` pattern used in the Network Policy template requires Gatekeeper's sync config to be set up so cluster state is replicated into OPA. The post does not show the Config resource needed to enable this — readers attempting that example will need to additionally create a `config.gatekeeper.sh/v1alpha1 Config` resource specifying NetworkPolicy in `syncOnly`. This is a non-trivial caveat but not strictly a technical error in the code shown.
- The `production-container-security` constraint sets both `denyRunAsRoot: true` and `minRunAsUser: 1000` — these are complementary and will both fire on a violating container, which is fine and intentional.
- The Mermaid diagrams are syntactically valid and render correctly.
