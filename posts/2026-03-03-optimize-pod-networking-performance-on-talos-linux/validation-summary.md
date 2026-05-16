# Validation Summary: How to Optimize Pod Networking Performance on Talos Linux

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Talos Linux (machine configuration, sysctls, kube-proxy disable)
- Cilium CNI (eBPF data plane, kube-proxy replacement, BPF host routing, BPF masquerade, bandwidth manager, BBR, Maglev, DSR, CiliumNetworkPolicy L7)
- Calico CNI (operator install, eBPF data plane, BGP)
- Kubernetes networking (Services, NetworkPolicy, HPA)
- CoreDNS / NodeLocal DNS Cache
- Linux kernel networking (nf_conntrack, TCP BBR, fq qdisc, TCP fast open, socket buffers)
- Benchmarking tools: iperf3, netperf, dig

## Sources Consulted
- Talos Linux docs — Deploying Cilium: https://www.talos.dev/latest/kubernetes-guides/network/deploying-cilium/
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium kube-proxy-free guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium bandwidth manager: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium CNP docs: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Tigera/Calico operator API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera/Calico eBPF enablement: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Linux kernel nf_conntrack sysctl docs: https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- CoreDNS plugins (cache, forward) docs: https://coredns.io/plugins/
- Kubernetes autoscaling v2 reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling

## Issues Found

1. **Incorrect default CNI claim.** The post stated "On Talos Linux, Cilium is the default CNI." Talos actually ships with Flannel as the default CNI; Cilium is an opt-in replacement that requires setting `cluster.network.cni.name: none` so Talos skips installing Flannel. Rewrote the sentence to reflect this and added the configuration hint.

2. **Mutually exclusive Cilium options enabled together.** The Helm values had both `bpf.hostRouting: true` and `endpointRoutes.enabled: true`. These are incompatible — per Cilium docs and upstream issues, enabling per-endpoint routes forces a fallback to the legacy host-routing path through iptables, silently negating the BPF host routing optimization. Removed the `endpointRoutes` block (none of the explanatory bullets referenced it) so the configuration actually delivers the promised BPF host-routing performance.

3. **DSR mode missing required dispatch setting.** `loadBalancer.mode: dsr` requires a companion `loadBalancer.dsrDispatch` value (`opt`, `ipip`, or `geneve`). Added `dsrDispatch: opt` so the example is a working configuration rather than one Cilium will reject or misinterpret.

## Review Notes

- `net.netfilter.nf_conntrack_buckets` is settable via sysctl in modern kernels, but the `nf_conntrack` module must be loaded before the value takes effect. Talos loads it as part of its standard kernel modules, so the sysctl will apply on Talos — worth keeping in mind if porting the snippet to other distros.
- `bandwidthManager.bbr: true` requires kernel ≥ 5.18; Talos current releases satisfy this, but a note for users pinning older Talos releases would help.
- `bpf.tproxy: true` is incompatible with `bpf.datapathMode: netkit`. The post does not set the netkit datapath mode so this is fine, but users mixing other guides should be aware.
- `net.ipv4.ip_local_port_range: "1024 65535"` is aggressive — starting ephemeral ports at 1024 risks collisions with applications binding to registered ports (1024–49151). Most production tunings start at 10000–32768. Left as-is because it is not technically incorrect, just opinionated.
- The iperf3 benchmark example creates a pod named `iperf-server` but never creates a Service, so the client's `-c iperf-server` lookup will fail by DNS. Users would need to either `kubectl expose` the pod or use the pod IP directly. Left unchanged because adding a Service manifest exceeds the "fix errors only" scope, but the example is incomplete as written.
- The CoreDNS `cache 30` value sets the positive cache TTL to a maximum of 30 seconds, capping any longer upstream TTLs; this is a reasonable but worth-noting choice.
