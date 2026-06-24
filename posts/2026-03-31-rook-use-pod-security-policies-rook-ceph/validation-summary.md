# Validation Summary: How to Secure Rook-Ceph with Pod Security Admission

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Pod Security Admission (PSA) and Pod Security Standards (PSS: privileged/baseline/restricted)
- PodSecurityPolicy (PSP) deprecation/removal history
- Rook-Ceph (OSD/MON/MGR/operator pods)

## Sources Consulted
- Kubernetes "Pod Security Admission" — https://kubernetes.io/docs/concepts/security/pod-security-admission/ and "Enforce Pod Security Standards with Namespace Labels" — https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/ (verified label keys `pod-security.kubernetes.io/enforce|audit|warn`, the three levels, and `enforce-version` accepting `latest`)
- Rook prerequisites / Pod Security Admission guidance (rook.io docs, surfaced via search) — verified Rook requires the rook-ceph namespace to be labeled `pod-security.kubernetes.io/enforce=privileged` (and warn=privileged) because Ceph pods need privileged device access

## Issues Found
- None — the security model, label keys/values, and version history were verified against the sources above and are accurate.

## Review Notes
- The PSP timeline is correct: PodSecurityPolicy was deprecated in Kubernetes 1.21 and removed in 1.25, replaced by Pod Security Admission. The post title and body correctly center on PSA/PSS (not the removed PSP), matching the task's version requirement.
- `pod-security.kubernetes.io/enforce-version: latest` is a valid value (the admission controller also accepts a pinned `vX.Y`). Verified against the namespace-labels task page.
- Labeling rook-ceph with `enforce=privileged` matches Rook's documented requirement; application namespaces using only the Ceph CSI driver can safely run `restricted`, as stated.
- MON ports (6789 legacy v1, 3300 msgr2 v2) and MGR ports starting at 6800 are accurate; none require privileged host networking by default.
- Setting `audit: privileged` / `warn: privileged` on the rook-ceph namespace is valid but effectively a no-op for warnings (privileged never warns); this is a harmless redundancy in the example, not an error, so left as-is.
- The `kubectl apply --dry-run=server` audit technique and the warn-mode relabeling steps are valid ways to surface PSA violations. Left as-is.
