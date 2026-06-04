# Validation Summary: How to Use CEL Admission Policies as a Replacement for Webhooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Common Expression Language (CEL)
- ValidatingAdmissionPolicy
- ValidatingAdmissionPolicyBinding
- Admission webhooks
- ConfigMap parameters
- kubectl

## Sources Consulted
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- Kubernetes ValidatingAdmissionPolicyBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-binding-v1/
- Kubernetes Common Expression Language documentation: https://kubernetes.io/docs/reference/using-api/cel/
- Kubernetes Mutating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/mutating-admission-policy/

## Issues Found
- The version history said ValidatingAdmissionPolicy was introduced in Kubernetes 1.26 and beta in 1.28+. Updated this to clarify that it was alpha in 1.26, beta in 1.28, and stable in 1.30.
- ValidatingAdmissionPolicyBinding examples omitted the required `validationActions` field. Added `validationActions: [Deny]` to bindings that enforce validation failures.
- The parameterized binding omitted `paramRef.parameterNotFoundAction`, which is required for current `admissionregistration.k8s.io/v1` bindings using parameters. Added `parameterNotFoundAction: Deny`.
- Several CEL expressions used `has()` to check map keys, such as labels and resource limit keys. Kubernetes CEL documentation says to use the `in` operator for map key checks, so these were updated.
- Some validations assumed earlier validations had already established field presence. Tightened guards so each validation can evaluate independently without relying on another validation's result.
- The limitations section said CEL admission policies cannot mutate objects and only pointed to mutating webhooks. Updated this to distinguish ValidatingAdmissionPolicy from MutatingAdmissionPolicy, which is available in current Kubernetes.
- The migration and best-practices sections used `failurePolicy: Ignore` as if it made policy failures advisory. Updated this to use non-blocking `validationActions` such as `Warn` and `Audit`; `failurePolicy` only controls policy evaluation errors and misconfiguration handling.

## Review Notes
The `kubectl` CLI was not installed in the local workspace, so command verification was performed against Kubernetes documentation rather than local `kubectl --help` output. The remaining examples are illustrative and assume a cluster version that supports `admissionregistration.k8s.io/v1` ValidatingAdmissionPolicy resources.
