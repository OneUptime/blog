# Validation Summary: How to Configure ValidatingAdmissionPolicy with Audit Annotations for Visibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- ValidatingAdmissionPolicy and ValidatingAdmissionPolicyBinding
- Kubernetes audit annotations and audit logs
- Common Expression Language (CEL)
- kubectl
- jq
- Elasticsearch audit log queries
- Prometheus-style dashboard queries

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes ValidatingAdmissionPolicyBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/
- Kubernetes CEL documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes audit annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- Corrected the explanation that audit annotations "always allow requests to proceed." Audit annotations record information, while request blocking depends on validation rules, binding `validationActions`, and failure handling.
- Fixed CEL expressions that used `int(bool)`, which is not valid CEL conversion. Replaced these with ternary expressions that produce numeric scores.
- Fixed map-key presence checks that used `has()` on map keys. Kubernetes CEL documentation recommends checking map fields with `has(mapField)` plus the `in` operator.
- Fixed optional field access and missing-field risks in label, annotation, security context, and compliance examples.
- Replaced an unsupported `flatten()` use in the capability example with a container-scoped expression that still records unapproved capabilities.
- Replaced the nonexistent `request.requestReceivedTimestamp` field with `request.uid` and adjusted the section wording from validation timing to request context.
- Removed an inline CEL comment from a `valueExpression` because it would be included in the expression text.
- Corrected audit log annotation keys to include the Kubernetes-generated `ValidatingAdmissionPolicyName/key` prefix.
- Added validation rules to the security policy example so the later `[Audit, Deny]` binding can actually deny non-compliant requests.
- Changed the Prometheus query code fence from `yaml` to `promql`.

## Review Notes
The resource quantity examples only sum CPU values expressed in millicores and memory values expressed in MiB. They are now syntactically safer, but a production policy should account for other valid Kubernetes quantity formats or record raw per-container request values instead.
