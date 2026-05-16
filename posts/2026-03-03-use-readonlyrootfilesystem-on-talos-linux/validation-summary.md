# Validation Summary: How to Use ReadOnlyRootFilesystem on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Pods and Deployments
- Kubernetes securityContext
- Kubernetes emptyDir and ConfigMap volumes
- kubectl
- Kyverno ClusterPolicy
- Pod Security Standards

## Sources Consulted
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno read-only root filesystem policy: https://kyverno.io/policies/best-practices/require-ro-rootfs/require-ro-rootfs/
- Talos Linux system extensions documentation: https://www.talos.dev/latest/talos-guides/configuration/system-extensions/

## Issues Found
- The opening description overstated `readOnlyRootFilesystem` by saying no process can create new files at all. Kubernetes mounts the container root filesystem as read-only, but writable volumes can still be mounted. Updated the wording to specify the image-backed root filesystem.
- The threat model section similarly implied all writes fail. Updated it to clarify that writes fail on the image-backed filesystem, unless paths are backed by writable volumes.
- The enforcement section said to use Pod Security Standards to enforce `ReadOnlyRootFilesystem`. Current Kubernetes Pod Security Standards do not require `readOnlyRootFilesystem`, so the section now says to use an admission policy engine such as OPA Gatekeeper or Kyverno for explicit enforcement.
- The Kyverno example used deprecated top-level `spec.validationFailureAction`. Updated the example to put `failureAction: Enforce` under the `validate` rule, matching current Kyverno guidance.

## Review Notes
The Kubernetes YAML examples use current API versions and valid field names. The `emptyDir` examples are technically correct; memory-backed `emptyDir` volumes count against memory usage, so production manifests should size them with workload memory limits in mind. The example images use `:latest`, which is acceptable for a tutorial placeholder but should be pinned in production.
