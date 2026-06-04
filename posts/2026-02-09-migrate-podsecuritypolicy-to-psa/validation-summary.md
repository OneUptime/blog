# Validation Summary: How to Migrate from Deprecated PodSecurityPolicy to Pod Security Admission

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes PodSecurityPolicy
- Kubernetes Pod Security Admission
- Kubernetes Pod Security Standards
- kubectl
- Bash
- jq
- Kubernetes RBAC
- Kubernetes securityContext, seccomp, and AppArmor

## Sources Consulted
- Kubernetes documentation: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes documentation: Deprecated API Migration Guide - https://kubernetes.io/docs/reference/using-api/deprecation-guide
- Kubernetes documentation: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes documentation: Migrate from PodSecurityPolicy to the Built-In PodSecurity Admission Controller - https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes documentation: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes kubectl reference: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The assessment command for "which PSPs are actually used" only printed PSP metadata and did not identify usage. Replaced it with a command that reads the `kubernetes.io/psp` annotation from pods, matching the Kubernetes migration guidance.
- The RBAC discovery examples assumed RoleBinding or ClusterRoleBinding names map directly to PSP names. Replaced this with a query for Roles and ClusterRoles that grant the `use` verb on PodSecurityPolicy resources.
- The inventory and automated migration scripts inferred PSP usage from binding names. Updated them to identify running pods admitted by each PSP via the `kubernetes.io/psp` annotation and derive namespaces from that data.
- The guide implied PSP and PSA can always run together, even though PSP is removed in Kubernetes 1.25. Clarified that concurrent PSP/PSA migration only applies on Kubernetes versions where PSP is still available.
- The restricted-profile mapping incorrectly included read-only root filesystems as a PSA restricted requirement. Replaced it with current restricted requirements around non-root execution, privilege escalation, seccomp, and capabilities.
- The custom-capabilities guidance said restricted "drops all capabilities" without noting the allowed `NET_BIND_SERVICE` add-back. Updated the text to match the Pod Security Standards.
- The AppArmor example used the deprecated annotation form and the Deployment snippet was incomplete for `apps/v1`. Updated it to use current `securityContext.appArmorProfile` syntax and added the required Deployment selector, template labels, and container.
- The monitoring and violation-collection examples looked for PSA warnings in Kubernetes Events. Updated them to use server-side dry-run checks and audit-log annotations, which match how Pod Security Admission reports warn and audit findings.
- The test verification suggested `kubectl get pod non-compliant-pod` would return a Forbidden admission error after creation failed. Updated the text to check the `kubectl apply` output for the Forbidden error.
- The PSP RBAC cleanup command implied all relevant RBAC objects would have a specific label. Clarified that this command applies only if those objects were labeled during migration.

## Review Notes
The post is technically valid after the corrections. The migration script remains an assistive starting point, not a complete replacement for a full PSP-to-PSA mapping, because running-pod annotations can miss CronJobs, scale-to-zero workloads, or workloads that have not rolled out recently.
