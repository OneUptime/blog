# Validation Summary: How to Validate Sidecar Acceleration in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF
- eBPF SOCKMAP
- Istio
- Envoy sidecars
- Service mesh networking

## Sources Consulted
- Calico documentation: Accelerate Istio network performance - https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Felix configuration reference - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction described sidecar acceleration generically for service meshes including Linkerd. Calico's current documentation describes this feature for Istio Envoy sidecars, so the wording was narrowed to Istio Envoy.
- The post claimed 30-50% latency improvements. I could not verify that fixed range in the official Calico documentation, so it was replaced with a workload-dependent performance statement and Calico's experimental-use caveat.
- The prerequisites omitted Calico application layer policy and the documented Linux kernel 4.19+ requirement. Both were added, and the service mesh prerequisite was narrowed to Istio with Envoy sidecar injection.
- The verification command `calico-node -show-bpf-map-sizes` is not a documented Calico inspection command. It was replaced with documented `FelixConfiguration` checks, the official patch command for `sidecarAccelerationEnabled`, and a documented log check for eBPF mode.
- The command `kubectl exec test-pod -- cat /proc/net/if_inet6` did not validate sidecar acceleration. It was removed because it only reads IPv6 interface state from the pod network namespace.
- The benchmark section implied the same command alone would compare enabled and disabled states. It now explicitly says to run the baseline before enabling `sidecarAccelerationEnabled` and to use new connections after enabling it.
- The monitoring command `bpftool prog show | grep calico` lists loaded programs but does not provide hit counts. It was replaced with Calico's documented BPF profiling workflow using `bpfProfiling: Enabled` and `calico-node -bpf profiling e2e`.

## Review Notes
Calico documents sidecar acceleration as experimental and not for production clusters. Existing connections do not benefit when the feature is enabled, so validation should use newly established connections after changing `sidecarAccelerationEnabled`.
