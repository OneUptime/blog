# Validation Summary: How to Test Sidecar Acceleration in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico
- Kubernetes
- eBPF SOCKMAP
- Istio
- Envoy sidecars
- Service mesh benchmarking

## Sources Consulted
- Calico documentation: Accelerate Istio network performance - https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Cloud FelixConfiguration reference - https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- Kubernetes documentation: kubectl rollout restart - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The post said sidecar acceleration requires the Calico eBPF dataplane. Calico's sidecar acceleration documentation instead lists application layer policy, Linux kernel 4.19 or later, and Istio/Envoy sidecars as the relevant prerequisites, so the prerequisites were corrected.
- The introduction described Calico as optimizing pod-to-pod service mesh traffic generally. Calico documents sidecar acceleration as optimizing the socket path between the application container and Envoy sidecar using eBPF SOCKMAP, so the explanation and flow diagram were corrected.
- The post claimed 30-50% latency improvements. The official documentation does not provide that specific range, so the claim was replaced with workload-dependent performance language.
- The verification command `calico-node -show-bpf-map-sizes` is not a documented Calico BPF troubleshooting command and does not verify sidecar acceleration. It was replaced with documented `FelixConfiguration` checks for `sidecarAccelerationEnabled`.
- The command reading `/proc/net/if_inet6` does not verify sidecar acceleration. It was removed.
- The monitoring section claimed `bpftool prog show` checks eBPF hit counts. That command lists BPF programs and does not reliably validate sidecar acceleration, so the post now checks Calico node logs for sidecar-related configuration handling.
- The benchmark commands compared identical runs without toggling sidecar acceleration or refreshing connections. They now explicitly disable and enable `sidecarAccelerationEnabled` and restart the benchmark deployments so new connections are measured.

## Review Notes
Sidecar acceleration is documented by Calico as experimental and not suitable for production clusters. The post now reflects that caveat. The example benchmark still assumes the reader has `client` and `server` deployments and a `grpc_bench` binary available in `client-pod`.
