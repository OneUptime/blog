# Validation Summary: How to Enable User Namespace Remapping in Kubernetes for Rootless Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes user namespaces
- Kubernetes RuntimeClass
- containerd, CRI-O, runc, and crun
- Linux user namespaces and idmap mounts
- Kubernetes securityContext, seccomp, AppArmor, SELinux, capabilities, and fsGroup

## Sources Consulted
- Kubernetes user namespaces concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/user-namespaces/
- Kubernetes task guide, "Use a User Namespace With a Pod": https://kubernetes.io/docs/tasks/configure-pod-container/user-namespaces/
- Kubernetes blog, "Kubernetes v1.33: User Namespaces enabled by default!": https://kubernetes.io/blog/2025/04/25/userns-enabled-by-default/
- Kubernetes AppArmor tutorial and API guidance: https://kubernetes.io/docs/tutorials/security/apparmor/
- Linux `subuid` and `subgid` manual pages referenced by Kubernetes: https://man7.org/linux/man-pages/man5/subuid.5.html and https://man7.org/linux/man-pages/man5/subgid.5.html

## Issues Found
- The post incorrectly stated that a special containerd runtime handler and `RuntimeClass` enable user namespaces. Updated the examples to use the Kubernetes `spec.hostUsers: false` pod field, and clarified that RuntimeClass only selects a runtime handler.
- The containerd configuration showed a `runc-userns` handler as the enabling mechanism. Replaced it with a standard containerd runtime configuration and documented the current runtime version requirements: containerd 2.0+ or CRI-O 1.25+, with runc 1.2+ or crun 1.9+.
- The subordinate UID/GID setup used `root:100000:65536`, which does not match Kubernetes guidance for custom kubelet ranges. Updated it to use the required `kubelet` user entry and a range large enough for the default 110 pods per node.
- Several examples assumed container UID 0 always maps to host UID 100000. Updated the text and verification snippets to explain that kubelet chooses the host range and that the shown UID is only an example.
- Pod, Deployment, test, and monitoring examples selected user namespaces via `runtimeClassName: userns`. Updated them to use `hostUsers: false` and to monitor `.spec.hostUsers == false`.
- The AppArmor example used the deprecated pre-v1.30 annotation. Replaced it with the current `securityContext.appArmorProfile` field.
- The volume section implied host UID/GID ownership must match remapped IDs. Updated it to reflect Kubernetes idmap mount behavior, where `runAsUser`, `runAsGroup`, and `fsGroup` refer to container IDs and host IDs do not need to match volume ownership.
- The limitations section omitted current hard restrictions and overstated others. Updated it to cover host namespace restrictions, idmap mount requirements, NFS limitations, and raw block volume restrictions.
- The security test attempted to read `/etc/shadow` "on host", but without a host mount that path is the container's file. Replaced it with a UID map check and kept the host-level privilege test.

## Review Notes
The corrected post targets current upstream Kubernetes behavior as documented on June 3, 2026. Clusters on Kubernetes versions before the current user namespace behavior, older containerd releases, or kernels/filesystems without idmap mount support may need version-specific guidance.
