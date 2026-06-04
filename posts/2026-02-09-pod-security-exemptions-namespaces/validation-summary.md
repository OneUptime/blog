# Validation Summary: How to use Pod Security Standards with exemptions for specific namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Pod Security Standards
- Pod Security Admission
- AdmissionConfiguration
- ValidatingWebhookConfiguration
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Pod Security Admission, https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes documentation: Enforce Pod Security Standards by Configuring the Built-in Admission Controller, https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels, https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Pod Security Standards, https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes API reference: ValidatingWebhookConfiguration v1, https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes documentation: Dynamic Admission Control, https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Deprecated API Migration Guide, https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post stated that Pod Security Admission exemptions bypass enforcement while audit and warning modes continue tracking violations. Kubernetes documents that requests matching exemption criteria are ignored by all enforce, audit, and warn behaviors, so the wording was corrected.
- The namespace exemption example said exempt namespaces would still be audited and warned. This was corrected because static PSA exemptions skip those checks too.
- The user exemption section implied controller service account exemptions are a straightforward way to allow privileged pods. Kubernetes cautions that exempting controller service accounts can implicitly exempt users who can create the corresponding workload resource, so that warning was added.
- The privileged pod audit command checked `.spec.securityContext.privileged`, which is not a valid pod-level field. The query now checks container, init container, and ephemeral container `securityContext.privileged` fields.
- The `ValidatingWebhookConfiguration` example omitted required `admissionReviewVersions` and `sideEffects` fields for `admissionregistration.k8s.io/v1`. These fields were added.
- The security considerations example implied wildcard namespace exemptions such as `*-system` are supported and dangerously broad. Kubernetes requires exemptions to be explicitly enumerated, so the example was corrected to say wildcards are not supported.

## Review Notes
- The Pod Security Admission configuration examples use `pod-security.admission.config.k8s.io/v1`, which is valid for Kubernetes v1.25 and later.
- The post pins one example to `enforce-version: v1.28`. This is valid as a version pinning example, but future maintainers may want to update it if they prefer examples pinned to the current Kubernetes minor version used by their audience.
