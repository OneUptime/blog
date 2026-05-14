# Validation Summary: How to Understand the Calico Data Path

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes CNI networking
- Linux netfilter and iptables
- nftables
- eBPF
- TC hooks
- Kubernetes Services and kube-proxy
- VXLAN
- Felix

## Sources Consulted
- Calico documentation: The Calico data path: IP routing and iptables - https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: System requirements for Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: Calico nftables data plane - https://docs.tigera.io/calico/latest/getting-started/kubernetes/nftables
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Get started with VPP networking - https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Project Calico source: Felix iptables chain definitions - https://github.com/projectcalico/calico/blob/master/felix/rules/rule_defs.go
- Project Calico source: Felix workload endpoint chain rendering - https://github.com/projectcalico/calico/blob/master/felix/rules/endpoints.go
- Local command help: `iptables --help`

## Issues Found
- The introduction stated that Calico supports three dataplanes. Current Calico documentation includes VPP as an additional dataplane, so the wording was changed to say Calico supports several dataplanes, including standard Linux, eBPF, Windows HNS, and VPP.
- The eBPF section said Calico bypasses netfilter entirely. Calico documentation says eBPF mode bypasses iptables for workload traffic and is only partially compatible with other iptables rules, so the wording was narrowed to workload traffic.
- The eBPF datapath diagram showed TC hooks on the pod-side veth and host-side ingress. Calico troubleshooting documentation states pod ingress policy is attached to the `tc/tcx` egress hook of the host-side `cali*` veth pair, with egress handled similarly on the workload-to-host path. The diagram was updated to describe host-side `cali` veth TC hooks.
- The comparison table claimed iptables rule lookup is O(n) and eBPF rule lookup is O(1). Calico documentation describes standard Linux policy as iptables rules with IP sets and eBPF policy as BPF instructions plus maps for selector/IP set data, so the row was replaced with a more accurate policy representation comparison.
- The comparison table listed the eBPF kernel requirement as 5.3+. Current Calico documentation lists Linux kernel v5.10 or later for the base eBPF dataplane, with RHEL-specific exceptions. The table was updated to 5.10+.

## Review Notes
- The iptables chain names `cali-FORWARD`, `cali-from-wl-dispatch`, `cali-to-wl-dispatch`, `cali-fw-*`, and `cali-tw-*` match the current Felix source definitions.
- The iptables commands use valid `iptables` flags.
- VXLAN UDP port 4789 and the `vxlan.calico` interface are consistent with current Calico documentation.
- `felix_int_dataplane_apply_time_seconds` is a real Felix Prometheus summary metric.
