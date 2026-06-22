# Validation Summary: How to Implement Kubernetes Pod Security Contexts Correctly

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes securityContext and PodSecurityContext
- Linux capabilities
- Seccomp profiles
- AppArmor profiles
- Pod Security Standards and Pod Security Admission
- Kubernetes ServiceAccounts and projected service account tokens
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: kubectl label reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The Deployment example used `apiVersion: apps/v1` without the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is valid.
- The pod-level `runAsNonRoot` comment said it prevented privilege escalation. Changed the comment to say it requires a non-root user; `allowPrivilegeEscalation: false` is the setting that controls privilege escalation.
- The sysctl example used `net.core.somaxconn`, which is not in the safe sysctl set documented by Kubernetes Pod Security Standards. Replaced it with `net.ipv4.tcp_syncookies`.
- The dangerous capabilities list included `CAP_PRIVILEGED`, which is not a valid Linux capability name in Kubernetes manifests. Replaced it with `privileged: true`.
- The custom seccomp profile was fenced as JSON but contained a `//` comment, making the snippet invalid JSON. Removed the comment from the JSON block.
- The AppArmor example used the pre-Kubernetes v1.30 beta annotation. Updated it to the current stable `securityContext.appArmorProfile` field.

## Review Notes
The Pod Security Standards namespace labels use `latest` for policy versions, which is valid, but production clusters often pin an explicit Kubernetes minor version for predictable admission behavior during upgrades.
