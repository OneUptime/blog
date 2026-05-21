# Validation Summary: How to Secure Istio Webhooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and configuration validation webhooks
- Kubernetes admissionregistration.k8s.io/v1 admission webhooks
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kyverno ClusterPolicy validation rules
- Prometheus alerting for Kubernetes API server admission webhook metrics
- kubectl, jq, OpenSSL

## Sources Consulted
- Istio Dynamic Admission Webhooks Overview: https://istio.io/latest/docs/ops/configuration/mesh/webhook/
- Istio Configuration Validation Problems: https://istio.io/latest/docs/ops/common-problems/validation/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Resource Labels: https://istio.io/latest/docs/reference/config/labels/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The ClusterRoleBinding review command filtered by role names such as `cluster-admin`, `admin`, and `istio`, which did not actually identify all roles with webhook write permissions. Replaced it with a rule-based jq query that finds ClusterRoles granting create, update, patch, delete, or wildcard verbs on mutating or validating webhook configurations, then lists bindings to those roles.
- The `kubectl auth can-i` check for Istiod used `--all-namespaces` against a cluster-scoped resource. Removed that flag.
- The namespace-label bypass check only tested `update namespaces`, but namespace labels can also be changed with patch operations. Added a `patch namespaces` check.
- The Kyverno namespace label protection policy matched only Namespaces that still had `istio-injection=enabled`, so it would not reliably catch removal of that label on UPDATE. Replaced it with a deny rule that compares `request.oldObject` and `request.object`.
- The Kyverno examples used the deprecated top-level `spec.validationFailureAction`. Moved enforcement to per-rule `validate.failureAction`, matching current Kyverno guidance.
- The post described `sidecar.istio.io/inject: "false"` only as an annotation. Updated it to use the current pod label and mention the deprecated annotation for compatibility.
- The injection-bypass Kyverno example only checked annotations. Updated it to check both labels and annotations.
- The TLS section said the command checked the webhook certificate, but the command reads Istio's root CA certificate from `istio-ca-secret`. Clarified the text to describe CA material and CA expiration.
- The NetworkPolicy example implied Kubernetes NetworkPolicy can directly select the API server. Updated the comment to note that most clusters cannot select the API server by pod or namespace, and that operators should narrow the rule with `ipBlock` when control-plane CIDRs are known.

## Review Notes
The webhook manifest examples show relevant fields rather than complete standalone Kubernetes objects; production changes should be made through Istio installation values, `istioctl`, Helm, or carefully reviewed edits to the generated webhook configurations.
