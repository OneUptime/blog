# Validation Summary: How to Troubleshoot Sidecar Acceleration in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF
- eBPF SOCKMAP
- Istio
- Envoy sidecars

## Sources Consulted
- Calico documentation: Accelerate Istio network performance - https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Enterprise documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico-enterprise/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Felix configuration reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The post described sidecar acceleration as a general service mesh feature, including Linkerd. Calico documents this feature for Istio Envoy sidecars, so the description and prerequisites were narrowed to Istio/Envoy.
- The post did not mention Calico's experimental warning. Calico documents sidecar acceleration as experimental and not production ready, so the introduction now includes that caveat.
- The prerequisites were incomplete. Calico requires application layer policy and Linux kernel 4.19 or later for sidecar acceleration, so those prerequisites were added.
- The verification commands were inaccurate. `calico-node -show-bpf-map-sizes` is not the documented Calico BPF troubleshooting interface, and `/proc/net/if_inet6` does not verify sidecar acceleration. They were replaced with the documented `sidecarAccelerationEnabled` Felix configuration patch/check and a documented Calico BPF startup log check.
- The monitoring command claimed that `bpftool prog show` reports hit counts. It lists BPF programs but does not provide Calico counter output. It was replaced with the documented `calico-node -bpf counters dump --iface=<interface>` command.
- The acceleration flow diagram incorrectly implied that eBPF bypasses the service mesh sidecar between pods. It now shows the documented app-to-Envoy same-pod socket fast path.

## Review Notes
The benchmark commands remain workload-specific examples because Calico does not prescribe a single benchmarking tool for sidecar acceleration. Existing connections do not benefit immediately after enabling sidecar acceleration, so benchmarks should use new connections after the configuration change.
