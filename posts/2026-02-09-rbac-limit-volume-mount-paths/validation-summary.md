# Validation Summary: How to Implement RBAC Policies That Limit Volume Mount Paths and Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Pod Security Admission and Pod Security Standards
- Kubernetes volumes, Secrets, ConfigMaps, PersistentVolumeClaims, StorageClasses, and EmptyDir
- OPA Gatekeeper ConstraintTemplates and Constraints
- Kubernetes validating admission webhooks
- Kubernetes audit policy and audit logs
- kubectl
- jq
- Python Flask

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes admission controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes AdmissionReview v1 API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes audit documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/next/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The Pod Security Admission allowed-volume list omitted `csi` and `ephemeral`, which are allowed by the Kubernetes Restricted profile. Added both volume types.
- The hostPath PSA test pod could also be rejected for other Restricted-profile violations. Added minimal pod and container security context fields so the example focuses on the hostPath violation.
- The Gatekeeper hostPath example used the same namespace as the earlier PSA Restricted example. Since Restricted forbids all hostPath volumes, the Gatekeeper allow-list behavior would not be observable there. Clarified the namespace requirement and changed the example namespace to `hostpath-exceptions`.
- The Gatekeeper hostPath Rego used a raw `startswith(path, allowed)` check, which would allow paths such as `/tmpfoo` when `/tmp` was allowed. Changed the helper to allow exact matches or child paths under the allowed directory.
- The StorageClass Gatekeeper policy did not reject PVCs with an omitted or empty `storageClassName`, even though the surrounding text claimed only approved StorageClasses were allowed. Added validation for missing and empty storage class names.
- The ConfigMap and Secret section incorrectly claimed that a user who cannot `get` a Secret cannot mount it. Kubernetes documents that pod creation permission can provide indirect access to Secrets in the same namespace. Rewrote the section to use RBAC for direct API reads and Gatekeeper for allowed ConfigMap and Secret volume references.
- The EmptyDir section said it limited EmptyDir sizes, but the policy only blocked `medium: Memory`. Updated the text and schema to match the implemented policy.
- The Gatekeeper install command referenced an older release branch. Updated it to the current official prebuilt manifest URL from the Gatekeeper installation documentation.

## Review Notes
The custom Flask webhook is intentionally minimal and demonstrates the AdmissionReview response shape correctly, including copying the request UID into the response. A production webhook would still need a proper TLS certificate, deployment manifests, webhook configuration, and failure policy choices.
