# Validation Summary: How to Use AppArmor Profiles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- AppArmor
- Linux kernel security modules
- `kubectl`

## Sources Consulted
- Kubernetes: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Linux kernel security constraints for Pods and containers - https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Rancher: Access Clusters - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Rancher: Pod Security Standards (PSS) & Pod Security Admission (PSA) - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards
- Rancher: Pod Security Admission (PSA) Configuration Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Ubuntu Manpage: `apparmor_parser` - https://manpages.ubuntu.com/manpages/jammy/man8/apparmor_parser.8.html
- Ubuntu Manpage: `aa-status` - https://manpages.ubuntu.com/manpages/jammy/man8/aa-status.8.html
- Ubuntu Manpage: `apparmor.d` profile syntax - https://manpages.ubuntu.com/manpages/resolute/man5/apparmor.d.5.html

## Issues Found
- The post used the deprecated Kubernetes AppArmor annotation `container.apparmor.security.beta.kubernetes.io/*`. It was updated to the current `securityContext.appArmorProfile` API for both the custom `Localhost` profile example and the `RuntimeDefault` example.
- The introduction said AppArmor limits system calls. That was corrected because syscall filtering is handled by seccomp; AppArmor profiles govern access such as files, capabilities, and network usage.
- The Rancher section implied cluster-wide Rancher security settings could apply AppArmor profiles directly. It was clarified that Rancher's Pod Security Admission settings enforce broader pod security policies, but workload manifests still need to specify the AppArmor profile.
- The sample profile comment overstated the exact confinement behavior of the example policy. It was softened to describe it as a custom nginx profile without overclaiming its effective read scope.

## Review Notes
- Current Kubernetes documentation uses `appArmorProfile` in `securityContext`; the annotation-based syntax applies to pre-v1.30 documentation and should not be used for current clusters.
- AppArmor remains Linux-specific and requires the AppArmor kernel module to be enabled on any node that may schedule the pod.
