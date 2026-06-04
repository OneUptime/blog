# Validation Summary: How to configure proc mount type for enhanced /proc isolation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Pod security contexts
- procMount
- Linux `/proc` filesystem
- Pod Security Standards
- PodSecurityPolicy

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - Managing access to the `/proc` filesystem: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod v1 `SecurityContext.procMount`: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: User Namespaces: https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/
- Kubernetes documentation: Pod Security Policies removed feature notice: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The post incorrectly stated that `procMount: Unmasked` requires `hostPID: true`. Current Kubernetes documentation says `procMount: Unmasked` requires `spec.hostUsers: false`, which places the pod in a user namespace. I updated the example and explanation accordingly.
- The unmasked examples combined `procMount: Unmasked` with host namespaces and privileged/system-monitoring assumptions. Kubernetes user namespace limitations disallow `hostPID: true`, `hostNetwork: true`, and `hostIPC: true` when `hostUsers: false`, so I removed those fields and narrowed the example use case to container-in-container or low-level debugging workloads.
- The verification and runtime detection examples assumed masked `/proc` paths are absent. Current Kubernetes documentation describes masked and read-only paths as present inside the container mount namespace, so I changed the examples to inspect `/proc/self/mountinfo` instead of testing for path absence.
- The sidecar monitoring example was misleading because a sidecar watches its own `/proc` filesystem unless process namespaces are explicitly shared, and it would not reliably observe another container's failed access attempts. I replaced it with guidance to use node-level runtime security, eBPF, or audit tooling.

## Review Notes
PodSecurityPolicy is correctly described as deprecated, but it has also been removed since Kubernetes v1.25. The section is only relevant to clusters still running older Kubernetes versions.
