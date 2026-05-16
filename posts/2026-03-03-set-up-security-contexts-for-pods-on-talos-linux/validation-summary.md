# Validation Summary: How to Set Up Security Contexts for Pods on Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Kubernetes Pods and Deployments
- Kubernetes securityContext
- Pod Security Standards and Pod Security Admission
- Linux capabilities
- seccomp
- SELinux
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Talos Linux documentation: SELinux - https://docs.siderolabs.com/talos/v1.10/security/selinux

## Issues Found
- The post metadata claimed the guide covered "every field", but the article covers key security context fields rather than every pod and container security context option. Changed this to "key fields".
- The fsGroup explanation said it sets group ownership of all files in mounted volumes. Kubernetes applies ownership management only for supported volume types, and CSI drivers may handle this behavior. Updated the wording to avoid over-generalizing.
- The SELinux section said Talos Linux does not use SELinux by default. Talos documentation describes SELinux support as experimental and permissive by default in the documented version, with enforcing mode requiring explicit configuration. Updated the wording accordingly.
- The restricted Deployment example used `namespace: production`, while the later command applied the manifest with `-n secure-apps`. Kubernetes rejects manifests when the explicit object namespace conflicts with the CLI namespace. Changed the Deployment namespace to `secure-apps`.
- The audit query was labeled as finding containers running as root, but it actually finds pods whose containers do not explicitly set `runAsNonRoot: true`. Updated the command description to match what the query checks.

## Review Notes
The YAML snippets use current Kubernetes security context fields and the restricted template aligns with current Pod Security Standards for Linux workloads. The custom seccomp profile example is valid, but in practice the profile file must exist on each node under the kubelet seccomp profile path or container creation will fail.
