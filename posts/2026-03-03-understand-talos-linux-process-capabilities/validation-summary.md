# Validation Summary: How to Understand Talos Linux Process Capabilities

## Status
validated

## Post Type
Guide

## Technologies Covered
- Talos Linux
- Linux capabilities
- containerd
- Kubernetes securityContext
- Kubernetes Pod Security Standards / Pod Security Admission
- seccomp
- Cilium
- jq

## Sources Consulted
- Talos Linux Process Capabilities: https://docs.siderolabs.com/talos/v1.10/learn-more/process-capabilities
- Talos Linux Architecture: https://docs.siderolabs.com/talos/v1.10/learn-more/architecture
- Talos Linux Pod Security: https://docs.siderolabs.com/kubernetes-guides/security/pod-security
- Talos Linux Seccomp Profiles: https://docs.siderolabs.com/kubernetes-guides/security/seccomp-profiles
- Talos Linux homepage: https://www.talos.dev/
- Talosctl CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes Linux kernel security constraints: https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/

## Issues Found
- The post overstated Talos capability restrictions as applying a minimal custom capability set to every process. Updated the wording to match Talos documentation: Talos specifically prevents any process, including privileged Kubernetes pods, from gaining `CAP_SYS_MODULE` and `CAP_SYS_BOOT`.
- The post made stronger claims than the official documentation supports about audited per-service capability sets and post-escape command execution. Tightened the wording to focus on Talos' documented absence of SSH, a general-purpose shell, and a package manager, plus the documented capability restrictions.
- The `talosctl processes -o json` command was incorrect because the documented `talosctl processes` command does not support `-o json`. Replaced it with `talosctl processes --watch`, which is a supported process-inspection workflow.
- The post described a fixed "Kubernetes default" capability list. Kubernetes documentation says the runtime supplies its own default subset, while Pod Security Standards constrain which capabilities may be added. Updated the section to describe the Baseline allowed-add list and removed `NET_RAW`, which is not in the Baseline allowed-add list.
- The capability bounding set section implied Talos configures a broad restricted bounding set for all capabilities. Updated it to focus on Talos' documented hard restrictions and Linux's documented bounding-set inheritance behavior.
- The seccomp section stated that Kubernetes applies a default seccomp profile unconditionally. Updated it to clarify that `RuntimeDefault` is used by default only when kubelet seccomp defaulting is enabled; otherwise it should be set explicitly.
- The seccomp section implied Talos itself applies seccomp broadly. Updated it to the documented Talos support for Kubernetes workload seccomp profiles.
- The Restricted Pod Security Standard description incorrectly said the standard mandates a read-only root filesystem. Updated it to the documented requirements: drop all capabilities, only add `NET_BIND_SERVICE`, prevent privilege escalation, require non-root users, and set an explicit seccomp profile.
- The Cilium DaemonSet example was missing required `apps/v1` DaemonSet selector/template labels and requested `SYS_MODULE`, which Talos blocks. Added the required selector and labels, and removed `SYS_MODULE` from the example.

## Review Notes
The `jq` audit examples are useful but only inspect regular containers, not init containers or ephemeral containers. A future improvement could expand those queries to cover all container lists and include namespace/name output.
