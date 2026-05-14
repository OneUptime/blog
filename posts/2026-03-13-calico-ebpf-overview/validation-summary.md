# Validation Summary: How to Understand eBPF in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF
- CNI networking
- kube-proxy
- iptables/netfilter
- Linux tc and XDP hooks

## Sources Consulted
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: Defend against DoS attacks - https://docs.tigera.io/calico/latest/network-policy/extreme-traffic/defend-dos-attack
- Calico documentation: System requirements for Kubernetes - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

## Issues Found
- The prerequisite kernel guidance said Linux 5.3 or later with 5.8+ recommended. Current Calico documentation lists Linux kernel 5.10 or later, or supported distribution kernels with required backports, so the prerequisite was updated.
- The conclusion recommended Kubernetes 1.20+ for modern production clusters. Current Calico documentation for the latest release says Kubernetes 1.20 or below is not supported, so this was changed to "supported Kubernetes and Linux kernel versions."
- The iptables explanation overstated that every pod, service, and policy creates direct netfilter rules. Calico's standard dataplane uses iptables plus ipsets, so the wording was narrowed.
- The eBPF hook description said Calico attaches at two key hook points on each network interface. Calico documents tc hooks on Calico, data, and tunnel interfaces, plus socket BPF hooks for connect-time load balancing, so the wording was corrected.
- The eBPF maps description said maps store policy rules. Calico documents policy as optimized BPF bytecode with BPF maps storing IP sets matched by policy selectors, plus NAT and connection data, so the wording was corrected.
- The XDP description implied a generic host endpoint attachment model. Calico documents XDP use for eligible deny-list policy enforcement when hardware, driver, or kernel support is available, so the wording was narrowed.
- The enablement commands omitted the current automatic operator path for supported self-managed kubeadm-style clusters. The existing manual patch was kept and the automatic operator patch was added.
- The best practice about running kube-proxy simultaneously described policy enforcement conflicts. Calico documentation describes iptables flapping, high CPU, and health-check port conflicts unless Felix settings are changed, so this was corrected.
- The post recommended `calicoctl node status` to verify eBPF mode. Calico documentation recommends checking `calico-node` logs and using `calico-node -bpf` for dataplane inspection, so the verification guidance was updated.

## Review Notes
The post remains a high-level guide. It does not cover all eBPF mode limitations, such as unsupported datastore modes, mixed dataplane clusters, SCTP limitations, or platform-specific caveats. Those omissions are acceptable for this overview but would be useful in a production migration checklist.
