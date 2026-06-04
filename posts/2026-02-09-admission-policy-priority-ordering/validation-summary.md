# Validation Summary: How to Configure Admission Policy Priority and Ordering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes admission control
- Kubernetes mutating and validating admission webhooks
- Kubernetes AdmissionReview API
- Kyverno ClusterPolicy rules
- Prometheus metrics
- kubectl

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes MutatingWebhookConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes ValidatingWebhookConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kyverno ClusterPolicy overview: https://kyverno.io/docs/policy-types/cluster-policy/overview/
- Kyverno mutate rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Kyverno validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post claimed webhook configuration names control execution order alphabetically. Kubernetes documentation does not provide a supported name-based ordering mechanism; mutating webhooks are serial, validating webhooks are parallel, and correctness must not depend on webhook name order. Updated the section to use names only for clarity in logs and metrics.
- Several admissionregistration.k8s.io/v1 webhook examples omitted required `admissionReviewVersions` and `sideEffects` fields. Added those fields to webhook examples so they match the v1 API requirements.
- The Kyverno dependency example used separate policies and implied policy name ordering. Kyverno documents rule ordering within a policy and mutation-before-validation behavior, but not policy-name ordering for correctness. Combined dependent Kyverno rules into one `ClusterPolicy`.
- The validating webhook fast-fail examples implied one validating webhook could reliably run before another. Kubernetes calls matching validating webhooks in parallel. Updated the guidance to put ordered fast-fail logic inside one webhook service or policy engine.
- The circular dependency example used separate Kyverno policies for dependent mutations. Updated it to keep related mutation rules in one policy with explicit match criteria.
- The reinvocation example incorrectly used `reinvocationPolicy` under `ValidatingWebhookConfiguration`. `reinvocationPolicy` is a mutating webhook field. Changed the example to `MutatingWebhookConfiguration` and clarified that validating webhooks should be used to see final post-mutation state.
- The Go metrics snippet used `fmt.Sprintf` without importing `fmt`. Added the missing import.
- The testing section treated label output as ordered. Kubernetes labels are a map and should be checked for presence rather than display order. Updated the expected result wording.
- The performance section still implied webhook execution ordering. Updated it to describe fast-to-slow checks inside one webhook service.
- The Kyverno race-condition example used a JSON Patch `test` operation, but Kyverno `patchesJson6902` mutation supports `add`, `replace`, and `remove` operations. Replaced the example with an idempotent strategic merge patch using Kyverno's add anchor.

## Review Notes
The post is now technically valid as a general Kubernetes and Kyverno guide. Future improvements could mention Kubernetes ValidatingAdmissionPolicy and MutatingAdmissionPolicy for clusters that want in-process CEL-based admission logic without external webhooks.
