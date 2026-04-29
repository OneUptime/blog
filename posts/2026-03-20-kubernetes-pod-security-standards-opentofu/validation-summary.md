# Validation Summary: How to Create Kubernetes Pod Security Standards with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Pod Security Admission
- Pod Security Standards
- OpenTofu
- HashiCorp Kubernetes provider

## Sources Consulted
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- HashiCorp Kubernetes provider `kubernetes_namespace_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/deployment_v1.md

## Issues Found
- The overview said Pod Security Standards replaced PodSecurityPolicy. I corrected this to state that PodSecurityPolicy was removed in Kubernetes 1.25 and that Pod Security Admission enforces Pod Security Standards through namespace labels.
- The restricted-mode example labeled `read_only_root_filesystem` and resource requests/limits as required. I updated the comments because the restricted policy does not require either of those settings.
- The restricted-mode example summary omitted required controls and incorrectly claimed that read-only root filesystems are required. I corrected it to match the official restricted policy requirements: non-root execution, `allowPrivilegeEscalation=false`, an allowed seccomp profile, and dropping `ALL` capabilities, with only `NET_BIND_SERVICE` allowed back if needed.
- The multi-namespace example included `kube-system` in a `kubernetes_namespace_v1` resource. I replaced it with a user-managed example namespace because `kube-system` already exists and would need import-based management rather than namespace creation.

## Review Notes
- The examples mix a pinned policy version (`v1.29`) and `latest`. Both are valid according to Kubernetes, but teams should choose that intentionally because pinning and tracking `latest` have different operational tradeoffs.
