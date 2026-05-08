# Validation Summary: Validate Cilium System Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux kernel
- eBPF/BPF filesystem
- Linux sysctl and systemd-managed services
- CNI configuration

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium Kubernetes Configuration and CNI management: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Kubernetes Without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium WireGuard Transparent Encryption: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium Bandwidth Manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Linux mount/findmnt/sysctl command behavior checked against local command help output.

## Issues Found
- The post listed older and feature-specific kernel minimums such as core Cilium 4.19.57 and kube-proxy replacement 4.19/5.10. Updated the kernel guidance to match current Cilium stable documentation: kernel 5.10+ or an equivalent distro kernel such as RHEL 8.10's 4.18 kernel, plus the documented advanced-feature examples.
- The post described "hardware capabilities" broadly. Updated that wording to "supported architectures" because Cilium documents AMD64 and AArch64 image support rather than a general hardware capability matrix.
- The prerequisites listed Debian 11+ and RHEL 8+. Updated them to Debian 10+ and RHEL 8.6+ to match Cilium's current distribution compatibility table.
- The kernel configuration check only tested a few BPF options. Expanded it to include the base kernel options Cilium documents for eBPF operation.
- The BPFFS check searched for both `bpf` and `debugfs`, and the mount example mounted debugfs. Updated this to check `/sys/fs/bpf` specifically and to show the documented BPFFS mount command. Cilium's current docs do not require debugfs for this BPFFS validation.
- The `/etc/fstab` check matched any occurrence of `bpf`. Tightened it to look for an active `/sys/fs/bpf` BPF filesystem entry.
- The inotify section claimed Cilium uses file watchers extensively and presented fixed recommendation values. Reworded it as a general low-default node baseline check because those values are not documented as Cilium system requirements.
- The IP forwarding and conntrack checks were stated as universal expected requirements. Reworded them as routing-mode or netfilter-dependent checks; Cilium documents that native routing depends on Linux forwarding behavior and that Cilium may enable IP forwarding automatically.
- The conflicting software section implied NetworkManager, firewalld, and all non-Cilium eBPF programs are inherently conflicts. Reworded it as inventorying tools that may manage interfaces, firewall policy, or other eBPF programs.
- The CNI configuration note said the directory should be empty or only contain Cilium's config after deployment. Updated it to reflect Cilium's documented default behavior of writing `05-cilium.conflist` and removing other CNI config files by default.
- The Mermaid summary used the old `Kernel >= 4.19?` condition. Updated it to `Kernel >= 5.10 or equivalent?`.

## Review Notes
The guide is technically relevant and contains actionable shell checks. Some remaining recommendations, such as specific ulimit and inotify baseline values, are operational best-practice checks rather than official Cilium minimum requirements, so they should be treated as environment baselines rather than hard Cilium requirements.
