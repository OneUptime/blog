# Validation Summary: How to Set Machine Kernel Module Parameters in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.kernel.modules`)
- talosctl CLI (`apply-config`, `reboot`, `read`, `dmesg`, `--config-patch`)
- Linux kernel modules (`ip_vs` family, `nf_conntrack`, `br_netfilter`, `bonding`, `vxlan`, `ip_gre`, `wireguard`, `8021q`, `bridge`)
- Storage modules (`nfs`, `nfsd`, `iscsi_tcp`, `libiscsi`, `rbd`, `dm_mod`, `dm_thin_pool`, `dm_snapshot`)
- NVIDIA driver modules (`nvidia`, `nvidia_uvm`, `nvidia_modeset`)
- Kubernetes kube-proxy IPVS mode

## Sources Consulted
- Talos v1alpha1 config reference (`KernelModuleConfig`): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos Kernel reference: https://www.talos.dev/v1.6/reference/kernel/
- Talos config patches docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Kubernetes IPVS proxy README: https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/ipvs/README.md
- Linux Ethernet Bonding HOWTO (kernel.org): https://docs.kernel.org/networking/bonding.html
- siderolabs/extensions repo: https://github.com/siderolabs/extensions
- WireGuard installation: https://www.wireguard.com/install/
- Kubernetes PR #70398 (nf_conntrack module rename)

## Issues Found
- **Incorrect behavior claim about kube-proxy IPVS fallback.** The post originally stated that kube-proxy "will fail to start or fall back to iptables mode silently" when IPVS modules are missing. In reality, kube-proxy logs an explicit error (e.g., `IPVS proxier will not be used because the following required kernel modules are not loaded: [...]`) before falling back to iptables. Updated the sentence to: "kube-proxy in IPVS mode will log an error about the missing kernel modules and fall back to iptables mode".

## Review Notes
- All `machine.kernel.modules` schema usage, including the `name` field and the `parameters` array of `key=value` strings, matches the official `KernelModuleConfig` schema.
- All `talosctl` command flags (`--nodes`, `--file`, `--config-patch @file`) are correct.
- `nf_conntrack` is the correct unified module name (`nf_conntrack_ipv4` was merged in Linux 4.18/4.19).
- The `bonding max_bonds=0` parameter behavior is correctly described per the kernel bonding documentation.
- `wireguard` is correctly identified as a loadable kernel module (in-tree since Linux 5.6 but typically built as a module).
- `iscsi-tools` is the correct Sidero Labs extension name.
- Talos does load configured modules in the order listed, while the kernel's own dependency resolver still handles auto-pulled deps.
- The post does not pin Talos to a specific version. The schema and CLI behavior referenced here have been stable across recent Talos releases (v1.x), but readers on much older or future versions may want to consult the version-specific config reference.
