# Validation Summary: How to Map the Calico Data Path to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes networking
- Linux routing and netfilter/iptables
- VXLAN
- eBPF and TC hooks
- bpftool
- iproute2 bridge FDB inspection

## Sources Consulted
- Calico data path documentation: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico eBPF overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico eBPF troubleshooting and `calico-node -bpf` usage: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico outgoing NAT documentation: https://docs.tigera.io/calico-enterprise/latest/networking/configuring/workloads-outside-cluster
- Calico source for iptables chain names and NAT chain naming: https://github.com/projectcalico/calico/blob/master/felix/rules/rule_defs.go and https://github.com/projectcalico/calico/blob/master/felix/rules/nat.go
- Calico source for BPF NAT map names: https://github.com/projectcalico/calico/blob/master/felix/bpf/nat/maps.go
- Linux/netfilter hook ordering reference: https://www.iptables.org/documentation/HOWTO/netfilter-hacking-HOWTO-3.html
- Local CLI help for `iptables`, `bridge fdb`, and `bpftool map`

## Issues Found
- The same-node iptables diagram placed the `FORWARD` hook before the route lookup. Updated the flow so the route lookup precedes the filter `FORWARD` hook for forwarded packets.
- The cross-node VXLAN sequence implied policy evaluation before route lookup. Updated the sequence to show route lookup before forwarding through `vxlan.calico`.
- The VXLAN FDB explanation said FDB entries map each pod CIDR to a node IP. Updated it to distinguish Calico-programmed routes from FDB entries, and described FDB output as remote VXLAN MAC-to-node-IP mappings.
- The pod-to-external diagram and command referenced a non-current `CALICO-MASQ` chain. Updated the diagram and command to use Calico's `cali-nat-outgoing` chain reached from nat POSTROUTING.
- The eBPF diagram described pod egress as a TC egress hook on the veth. Updated it to reflect Calico's host-side veth hook direction: workload egress on the host-side TC ingress path and workload ingress on the host-side TC egress path.
- The eBPF policy inspection commands used an unverified `calico_policy` map name. Replaced them with the officially documented `calico-node -bpf policy dump` command and used `bpftool` only for the Calico BPF NAT service maps.

## Review Notes
The post is now technically consistent with current Calico documentation and source-level chain/map names. Exact Calico chain and map details can vary by Calico version, dataplane backend, and IPv4/IPv6 mode, so future revisions should state the tested Calico version if adding more low-level command output.
