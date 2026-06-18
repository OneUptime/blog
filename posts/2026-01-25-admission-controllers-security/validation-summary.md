# Validation Summary: How to Implement Admission Controllers for Security

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes admission controllers and admission webhooks
- ValidatingWebhookConfiguration
- OPA Gatekeeper
- Rego and Gatekeeper ConstraintTemplates
- Kyverno ClusterPolicy validation and mutation rules
- Helm chart configuration
- Go admission webhook server
- PrometheusRule monitoring alerts

## Sources Consulted
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Gatekeeper Helm chart values: https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/values.yaml
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Kyverno Helm chart values: https://github.com/kyverno/kyverno/blob/main/charts/kyverno/values.yaml
- Kyverno installation customization documentation: https://kyverno.io/docs/installation/customization/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno metrics reference: https://kyverno.io/docs/reference/metrics/

## Issues Found
- The command labeled as checking enabled admission controllers used `kubectl api-versions`, which only lists served API groups. Updated it to check the `admissionregistration.k8s.io` API and clarified that API server flags are only directly inspectable on self-managed control planes.
- The Gatekeeper Helm values used non-chart keys `webhookFailurePolicy` and top-level `exemptNamespaces`. Replaced them with `validatingWebhookFailurePolicy`, `mutatingWebhookFailurePolicy`, and `controllerManager.exemptNamespaces`.
- Two Gatekeeper `templates.gatekeeper.sh/v1` ConstraintTemplates omitted a structural `openAPIV3Schema`. Added `type: object` schemas, which are required for v1 ConstraintTemplates.
- The Kyverno Helm values used old or invalid top-level keys including `replicaCount`, `webhookTimeoutSeconds`, `webhookFailurePolicy`, and top-level `resources`. Replaced them with current controller-scoped values under `admissionController`, `backgroundController`, `cleanupController`, and `reportsController`.
- Kyverno validation examples used the older top-level `spec.validationFailureAction`. Moved enforcement to rule-level `validate.failureAction: Enforce`, matching current Kyverno documentation.
- Kyverno list patterns did not consistently use `name: "*"`, and `initContainers` was required even when absent. Added `name: "*"` and optional `=(initContainers)` anchors so the policies apply to all containers without rejecting Pods solely because they have no init containers.
- The Kyverno sidecar mutation used JSON6902 to append to `/spec/volumes/-`, which fails if `spec.volumes` does not already exist. Replaced it with `patchStrategicMerge`.
- The Go webhook included a `/mutate` handler that returned no AdmissionReview response. Implemented an allow response so the handler is valid if called.
- The Kyverno blocked-requests alert used a non-existent `action="block"` label. Replaced it with the documented `request_allowed="false"` label.

## Review Notes
- YAML examples were parsed successfully with PyYAML after edits.
- The local environment did not have `helm`, `kubectl`, `go`, or `ruby`, so CLI/chart checks were performed against official documentation and raw upstream chart files instead of local command output.
- Current Kyverno documentation marks classic `ClusterPolicy` documentation as deprecated in favor of newer policy types, but the examples remain valid for Kyverno installations that still use `kyverno.io/v1` ClusterPolicy resources.
