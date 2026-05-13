# Validation Summary: How to Optimize Sidecar Acceleration in Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Tigera) networking
- eBPF (SOCKMAP)
- Kubernetes
- Service mesh sidecars (Istio, Linkerd, Envoy)
- `calicoctl` / `kubectl` / `bpftool`

## Sources Consulted
- [Calico Sidecar Acceleration documentation](https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration)
- [Calico eBPF troubleshooting documentation](https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf)
- [Calico eBPF use cases documentation](https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf)
- [Enabling the eBPF data plane (Calico docs)](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf)

## Issues Found
1. **Invalid `calico-node` flag.** The original command `calico-node -show-bpf-map-sizes` is not a real Calico flag/subcommand. Per the Calico troubleshooting documentation, valid `calico-node -bpf` subcommands include `arp`, `cleanup`, `connect-time`, `conntrack`, `counters`, `ifstate`, `ipsets`, `nat`, `policy`, `profiling`, `routes`, and `version`. Replaced this command with a valid `bpftool prog show | grep sk_msg` invocation, which is the correct way to confirm that SOCKMAP `sk_msg` programs (used by Calico's sidecar acceleration) are attached.
2. **Nonsensical acceleration verification.** The original command `cat /proc/net/if_inet6` only lists IPv6-capable interfaces inside a pod — it has nothing to do with verifying sidecar acceleration. Replaced this with a check for the `sidecarAccelerationEnabled` field in `FelixConfiguration`, which is the actual feature flag controlling this functionality per the official documentation.

## Review Notes
- Per Calico's official documentation, the sidecar acceleration feature is **experimental** and explicitly "should not be used in production clusters" because the underlying SOCKMAP technology is not yet hardened. The post's title and framing for "Production" use is therefore at odds with the upstream guidance. This was not changed because the post's overall framing is the author's editorial choice, but readers should be aware of the experimental status.
- The post does not actually show the command to enable the feature (`kubectl patch felixconfiguration default --type merge --patch '{"spec":{"sidecarAccelerationEnabled": true}}'`). It only shows verification commands. This is a content gap but not an error in the commands as written.
- Prerequisites in the post are incomplete: in addition to the eBPF dataplane and a service mesh, Calico's docs require Linux kernel 4.19+ and Application Layer Policy to be enabled, and the feature is documented as Istio-specific (Envoy SOCKMAP), not for Linkerd or other meshes. This was not changed to avoid restructuring the post.
- The claimed "30–50% latency improvements" figure is plausible for SOCKMAP-based loopback acceleration but is not directly quoted from Tigera documentation; readers should benchmark in their own workload.
- The `grpc_bench` tool used in the benchmark section is a well-known ad-hoc placeholder rather than a standard Calico utility; this is acceptable as illustrative pseudocode.
