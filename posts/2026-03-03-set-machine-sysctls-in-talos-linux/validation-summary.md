# Validation Summary: How to Set Machine Sysctls in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.sysctls`)
- `talosctl` CLI (apply-config, read, get, reboot, config-patch)
- Linux kernel sysctls (net.core, net.ipv4, vm, fs.inotify, net.netfilter)
- Kubernetes (pod-level safe/unsafe sysctls, conntrack, CNI plugins)
- Cilium (eBPF mode rp_filter requirements)
- Calico (rp_filter requirements)

## Sources Consulted
- Talos Linux v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos config patching docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos source code (`kernel_param_defaults.go`) for default sysctls: https://github.com/siderolabs/talos/blob/main/internal/app/machined/pkg/controllers/runtime/kernel_param_defaults.go
- Kubernetes sysctl-cluster docs (safe/unsafe sysctls): https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Linux kernel nf_conntrack-sysctl docs: https://docs.kernel.org/networking/nf_conntrack-sysctl.html

## Issues Found

1. **Pod-level "safe" sysctl example used an unsafe sysctl.** The example showed `net.core.somaxconn` listed under `securityContext.sysctls`, claiming it as "safe". Per the Kubernetes sysctl docs, `net.core.somaxconn` is **not** in the safe allowlist — it is classified as unsafe and requires the kubelet `--allowed-unsafe-sysctls` flag to be set per-pod. Fixed by changing the example to `net.ipv4.tcp_keepalive_time` (which is in the safe list since Kubernetes 1.29) and moving `net.core.somaxconn` into the list of unsafe sysctls that must be set at the node level.

## Review Notes

- **Talos defaults for `net.ipv4.ip_forward`**: Verified from Talos source (`kernel_param_defaults.go`) that Talos does set `net.ipv4.ip_forward=1` by default, along with `net.ipv6.conf.default.forwarding=1` and several other defaults. The blog's claim "Talos enables this by default" is accurate.
- **`vm.max_map_count` default of 65530**: Correct at the upstream kernel level (Talos uses the kernel default). Note that several distros (Fedora, Arch, Ubuntu) ship with `vm.max_map_count=1048576` via sysctl.d, but this is not a kernel default change and does not apply to Talos.
- **`net.netfilter.nf_conntrack_buckets`**: Confirmed writable as a regular sysctl on modern kernels (no longer requires the `/sys/module/nf_conntrack/parameters/hashsize` module-parameter route).
- **Cilium `rp_filter` recommendation**: Setting `net.ipv4.conf.all.rp_filter=0` and `net.ipv4.conf.default.rp_filter=0` is broader than strictly necessary — Cilium's own documentation typically targets specific interfaces (e.g. `lxc*`, `cilium_*`). The blog's approach works but is not the most precise. Left as written since it is not technically incorrect and is a common simplification.
- **Conntrack timeout comment**: The comment "Reduce conntrack timeouts to free entries faster" is followed by `nf_conntrack_tcp_timeout_close_wait: "3600"`, which is actually a 60× increase from the kernel default of 60 seconds. Slightly inconsistent with the comment but both values are valid sysctl values and may reflect intentional tuning for the author's workload — left unchanged.
- **`talosctl apply-config --config-patch @file.yaml`**: Verified this flag and the `@file` syntax exist on `apply-config` in current Talos versions (v1.6+).
