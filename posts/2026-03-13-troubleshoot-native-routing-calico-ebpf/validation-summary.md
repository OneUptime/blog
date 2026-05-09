# Validation Summary: How to Troubleshoot Native Routing with Calico eBPF

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes networking
- kube-proxy replacement
- Linux eBPF and TC hooks
- bpftool
- calicoctl
- kubectl
- iperf3

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: FelixConfiguration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl command reference - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The kernel prerequisite listed Linux 5.3+ with 5.8+ recommended. Current Calico Open Source documentation requires Linux kernel 5.10+ for the base eBPF dataplane, with Red Hat 4.18.0-305+ supported because required features are backported. Updated the prerequisite accordingly.
- The introduction described Calico eBPF programs as intercepting packets at the earliest possible point. Calico's eBPF dataplane primarily uses networking hooks such as TC, with XDP used in specific contexts. Reworded the claim to avoid overstating the hook placement.
- The enablement command included `bpfDisableUnprivileged`, which is not present in the current FelixConfiguration reference. Removed that field and kept the documented `bpfEnabled` setting for manifest-based installations.
- The post only showed the manifest-based `calicoctl` enablement path. Added the documented operator-based `installation.operator.tigera.io` patch because current Calico installs commonly use the Tigera Operator.
- The verification command `calico-node -bpf-log-level Debug` is not a documented `calico-node` option. Replaced it with documented `calico-node -bpf nat dump` validation and the documented `bpfLogLevel: Debug` plus `bpftool prog tracelog` workflow for eBPF program logs.
- The connectivity test used plain HTTP against `kubernetes.default.svc`. The Kubernetes API service is HTTPS on port 443, so the command was updated to query `https://kubernetes.default.svc/version` with BusyBox wget's `--no-check-certificate` option.

## Review Notes
- The post remains a compact guide rather than a complete migration procedure. In production, Calico should be configured with a stable direct API server endpoint before disabling kube-proxy, as described in the official eBPF enablement documentation.
- Enabling `bpfLogLevel: Debug` has a significant performance impact and should be used temporarily or with targeted log filters in production environments.
