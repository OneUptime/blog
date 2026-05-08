# Validation Summary: How to Tune Calico on Bare Metal with Containers for Production

## Status
validated

## Post Type
Tutorial / production tuning guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- Calico eBPF dataplane
- Calico IPPool and FelixConfiguration resources
- Linux networking sysctl settings
- Bare metal BGP networking

## Sources Consulted
- Calico Open Source documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Overlay networking - https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Open Source documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Open Source documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch

## Issues Found
- The post described Calico eBPF as "kernel-bypass processing." Calico eBPF runs in the Linux kernel and bypasses iptables, not the kernel. Updated the wording to "reduce iptables overhead."
- The post claimed a specific cumulative 30-50% throughput improvement without a versioned benchmark or cited workload. Reworded this as a general potential throughput and latency improvement.
- The eBPF prerequisite listed Linux kernel 5.3+. Current Calico documentation lists Linux kernel 5.10+ for generic supported distributions, with specific supported backports such as Red Hat 8.4 kernel 4.18.0-305+. Updated the prerequisite.
- The bare-metal BGP prerequisite was too narrow as "BGP-capable physical switches." Updated it to require a network fabric that can route pod CIDRs without an overlay, such as on-prem BGP peering.
- The IPPool patch used `spec.encapsulation`, which is an operator Installation IP pool field, not the runtime Calico IPPool field. Updated the command to patch `ipipMode: Never` or `vxlanMode: Never` depending on the existing pool.
- The eBPF enablement sequence mixed manual kube-proxy disabling with `bpfEnabled`. For Tigera Operator installs, current Calico documentation recommends setting `linuxDataplane: BPF`, `bpfNetworkBootstrap: Enabled`, and `kubeProxyManagement: Enabled` on the `Installation` resource. Updated the command accordingly.
- The MTU patch used the short `installation` resource name. Updated it to the fully qualified `installation.operator.tigera.io` resource shown in current Calico documentation.
- The jumbo MTU example set Calico MTU to 9000. In eBPF mode, Calico documentation notes NodePort forwarding uses VXLAN, so the workload MTU should account for VXLAN overhead. Updated the example to 8950 for a 9000-byte underlay.
- The `bpfDataIfacePattern` example was incorrectly presented as enabling XDP hardware offload. That field selects interfaces Felix should attach BPF programs to. Updated the heading and description.

## Review Notes
- The MTU command is valid for Tigera Operator installations, but Calico documentation notes the updated MTU applies only to new workloads.
- Disabling encapsulation can disrupt in-progress connections and requires the underlay to route pod CIDRs correctly.
- The Felix timer settings are valid fields, but should be benchmarked in the target cluster before production rollout because refresh intervals trade CPU usage against detection speed for dataplane drift.
