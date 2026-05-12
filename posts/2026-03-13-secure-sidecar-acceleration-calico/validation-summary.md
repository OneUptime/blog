# Validation Summary: How to Secure Sidecar Acceleration in Calico

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (eBPF dataplane, sidecar acceleration / SOCKMAP)
- Kubernetes (kubectl, FelixConfiguration CRD)
- calicoctl
- bpftool / Linux eBPF
- Service mesh sidecars (Istio, Linkerd)
- gRPC benchmarking

## Sources Consulted
- Calico docs - Accelerate Istio network performance (sidecar acceleration): https://docs.tigera.io/calico/latest/networking/configuring/sidecar-acceleration
- Calico docs - Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico docs - Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Enterprise reference - Configuring Felix: https://docs.tigera.io/calico-enterprise/latest/reference/component-resources/node/felix/configuration

## Issues Found
1. **Missing the actual feature toggle.** The post described "sidecar acceleration" but never enabled it. The real FelixConfiguration field is `sidecarAccelerationEnabled`. Added a `calicoctl patch` command that sets it to `true`, and noted in the introduction and conclusion that the feature is officially marked **experimental** in the upstream documentation.
2. **Invalid `calico-node` flag.** The post used `calico-node -show-bpf-map-sizes`, which is not a real flag. The correct CLI form is `calico-node -bpf <subcommand>` (e.g. `conntrack`, `nat`, `counters`, `policy`, `routes`). Replaced with `calico-node -bpf counters dump`, which is a valid way to confirm Calico's BPF programs are processing traffic. Also added `bpftool prog show | grep -i cali` as a quick attachment check.
3. **`cat /proc/net/if_inet6` does not verify Calico eBPF acceleration.** That file just lists IPv6 interface flags and is unrelated to eBPF fast-path processing. Removed it and replaced with the `calico-node -bpf counters dump` verification step.
4. **Unsupported "30-50% latency improvement" claim.** The official Calico sidecar-acceleration documentation does not publish a specific latency-improvement figure. Removed the specific percentage and replaced with neutral guidance to benchmark against the reader's own workload.
5. **Missing kernel prerequisite.** SOCKMAP requires a sufficiently new kernel; added the kernel 5.7+ prerequisite alongside the existing eBPF dataplane prerequisite.
6. **Mechanism description clarified.** The original text described "fast-path processing reducing the overhead of sidecar interception" generically. Tightened it to describe the actual mechanism: a SOCKMAP program that bypasses the kernel TCP/IP stack on the pod-local loopback between Envoy and the app container.

## Review Notes
- The "Benchmark Acceleration" section shows the same `grpc_bench` command twice with no actual toggle between runs. This is technically OK because the toggle happens at the cluster/FelixConfiguration level between runs, but a future revision could make this clearer by interleaving the `calicoctl patch ... sidecarAccelerationEnabled` step between the two benchmark runs.
- `grpc_bench` is assumed to be present in `client-pod`; in practice the image often needs to be built with it. Worth noting in a future revision but not technically wrong.
- The `bpftool prog show | grep calico` line in the Monitoring section duplicates the new verification step in "Configure and Verify"; left in place to preserve the author's section structure.
- The post's tag "Service Mesh" is appropriate, though sidecar acceleration is currently only documented for Istio-style sidecar deployments - Linkerd compatibility is not officially claimed.
