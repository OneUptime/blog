# Validation Summary: How to Use Ceph with Kubernetes Pod Security Standards

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Pod Security Standards (PSS) / Pod Security Admission
- Rook-Ceph (storage orchestrator)
- kubectl CLI
- Kubernetes namespaces, Pods, PersistentVolumeClaims

## Sources Consulted
- Kubernetes Pod Security Standards reference: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Rook toolbox deployment examples: https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml

## Issues Found

1. **Incorrect claim that `baseline` PSS allows Rook-Ceph OSD pods (Line 23)**
   - **What was wrong:** The post stated OSD pods "must operate in a namespace with `privileged` or at least `baseline` enforcement." The `baseline` profile explicitly forbids `privileged: true` containers, so OSD pods would be rejected under `baseline` enforcement.
   - **What was changed:** Updated to state that OSD pods require `privileged` enforcement, and noted that even `baseline` blocks privileged containers.
   - **Why:** Per the official Kubernetes Pod Security Standards documentation, the baseline profile states "Privileged Pods disable most security mechanisms and must be disallowed."

2. **Incorrect method for checking PSS audit violations (Lines 104-113)**
   - **What was wrong:** The post suggested using `kubectl get events -n rook-ceph | grep "PodSecurity"` to check for PSS audit violations. PSS audit mode writes annotations to the API server audit log, not to Kubernetes Event objects. This command would return no results.
   - **What was changed:** Replaced with guidance to use `warn` mode (which surfaces warnings directly in kubectl output) alongside `audit` mode, and explained that audit violations appear in the API server audit log (configured via `--audit-log-path` or webhook), not in `kubectl get events`.
   - **Why:** Per the Kubernetes Pod Security Admission documentation, `audit` mode records violations as annotations in the API server audit log, and `warn` mode returns warnings in the API server response to the client.

## Review Notes
- The toolbox pod uses `rook/ceph:v1.13.0`, which is a valid but outdated Rook release. Current Rook versions (v1.16+) have moved to using `quay.io/ceph/ceph` images directly with an inline setup script instead of `toolbox.sh`. Since the post references a specific version and the configuration was correct for v1.13, this was not changed, but readers targeting modern Rook deployments should consult the latest Rook documentation for updated toolbox configuration.
- The restricted-mode Pod spec example is well-constructed and includes all required fields for PSS restricted compliance (runAsNonRoot, seccompProfile, drop ALL capabilities, disallow privilege escalation).
