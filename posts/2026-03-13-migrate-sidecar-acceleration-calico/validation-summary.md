# Validation Summary: How to Migrate to Sidecar Acceleration in Calico Safely

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF SOCKMAP
- Istio Envoy sidecars
- FelixConfiguration
- calicoctl and kubectl

## Sources Consulted
- Calico documentation - Accelerate Istio network performance: https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico documentation - Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation - Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation - Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation - Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf

## Issues Found
- The post described sidecar acceleration as a generic service mesh feature, including Linkerd-style sidecars. Calico documents this feature for Istio Envoy sidecars, so the description and prerequisites were narrowed to Istio/Envoy.
- The post omitted Calico's experimental warning. Calico states that sidecar acceleration uses eBPF SOCKMAP and should not be used in production clusters, so the introduction now frames it as a test-environment feature.
- The prerequisites incorrectly listed the Calico eBPF dataplane as the key prerequisite. Calico's sidecar acceleration documentation lists application layer policy and Linux kernel 4.19 or later, so the prerequisites were corrected.
- The verification commands checked `bpfEnabled`, used the invalid `calico-node -show-bpf-map-sizes` flag, and read `/proc/net/if_inet6`, which only reports IPv6 interface state. These were replaced with checks and patches for the documented `sidecarAccelerationEnabled` FelixConfiguration field.
- The benchmark commands compared two identical runs without toggling sidecar acceleration or creating new connections. They now explicitly disable and enable `sidecarAccelerationEnabled` and restart the benchmark deployments so new connections are measured after each state change.
- The monitoring command claimed `bpftool prog show` would show eBPF program hit counts. That command lists BPF programs, not hit counts, so it was replaced with a Calico node log check for sidecar-related configuration handling.
- The flow diagram incorrectly showed acceleration as a pod-to-pod fast path. It now shows the documented application-container-to-Envoy-sidecar socket path optimized by eBPF SOCKMAP.

## Review Notes
The `grpc_bench` command remains workload-specific and assumes the benchmark binary is present in `client-pod`. Calico does not prescribe a single benchmark tool for sidecar acceleration. Existing connections do not benefit when sidecar acceleration is enabled, so benchmark validation should use newly established connections.
