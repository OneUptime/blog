# Validation Summary: How to Configure Pod Security Policies in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- PodSecurityPolicy (PSP)
- Kubernetes RBAC
- Pod Security Standards
- `kubectl`

## Sources Consulted
- Rancher docs: Creating Pod Security Policies: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/create-pod-security-policies
- Rancher docs: Adding a Pod Security Policy: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/manage-clusters/add-a-pod-security-policy
- Rancher docs: Applying Pod Security Policies to Projects: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/advanced-user-guides/manage-projects/manage-pod-security-policies
- Rancher docs: RKE hardening guide and PSP examples: https://ranchermanager.docs.rancher.com/v2.8/reference-guides/rancher-security/hardening-guides/rke1-hardening-guide
- Kubernetes docs: Pod Security Policies: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Kubernetes docs: Mapping PodSecurityPolicies to Pod Security Standards: https://kubernetes.io/docs/reference/access-authn-authz/psp-to-pod-security-standards/
- Kubernetes docs: Migrate from PodSecurityPolicy to the Built-In PodSecurity Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/migrate-from-psp/
- Kubernetes docs: Using RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The prerequisite and workflow scope was too broad. The original post claimed the procedure applied to “RKE or RKE2 managed clusters” and “Rancher v2.5 or later,” but the documented Rancher workflow for enabling and assigning PSPs in the UI is specifically for Rancher-launched RKE clusters running Kubernetes v1.24 or earlier. I narrowed the prerequisite wording accordingly.
- The built-in policy section said Rancher provides two built-in PSPs. Rancher documents three default PSPs: `restricted-noroot`, `restricted`, and `unrestricted`. I corrected the text and updated the examples to align with the documented policy set.
- The built-in PSP YAML examples were incomplete/inaccurate. The restrictive example was missing the seccomp/AppArmor annotations and `MustRunAs` group ranges used by the documented restricted example, and the unrestricted example omitted fields such as `allowedCapabilities` and `hostPorts` needed for a truly unrestricted policy. I replaced those snippets with technically accurate equivalents.
- The custom PSP used the wrong annotation key: `seccomp.security.alpha.kubernetes.io/allowedProfiles`. The Kubernetes PSP annotation is `seccomp.security.alpha.kubernetes.io/allowedProfileNames`. I corrected the key and added `defaultProfileName` so the example matches the stated seccomp requirement.
- The “compliant pod” was not actually compliant with the shown custom PSP because the PSP required `readOnlyRootFilesystem: true`, and the example pod omitted it. I replaced the pod example with a simple `busybox` pod that satisfies the custom PSP settings shown in the post.
- The project-assignment navigation was slightly incomplete. Rancher documents this flow through **Explore** and **Cluster** > **Projects/Namespaces**. I updated the steps to match the documented UI path.
- The system workload example bound a `ClusterRoleBinding` to `use-unrestricted-psp` without defining that `ClusterRole`, and it used inconsistent built-in PSP naming. I added the missing `ClusterRole` and bound it to the documented built-in `unrestricted` PSP.
- The migration section described the RBAC command as an “audit current PSP usage” command even though it only surfaces related bindings by name. I narrowed the wording and broadened the command to inspect both `RoleBinding` and `ClusterRoleBinding` objects.

## Review Notes
- The post is now technically correct for legacy Rancher/RKE environments that still run Kubernetes v1.24 or earlier.
- PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in Kubernetes v1.25, so this guide should remain clearly scoped to pre-v1.25 clusters.
- Rancher’s current documentation treats this as legacy behavior, and Rancher’s RKE1 documentation notes that RKE1 reached end of life on July 31, 2025. That does not make the post technically irrelevant, but it does mean the guide is primarily useful for maintenance of existing legacy clusters rather than new deployments.
