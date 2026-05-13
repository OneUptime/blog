# Validation Summary: How to Map Kubernetes Egress with Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico Enterprise
- Calico Cloud
- Kubernetes NetworkPolicy and Calico policy
- Linux iptables and eBPF dataplanes
- Source NAT, MASQUERADE, and egress gateways
- FQDN/domain-based egress policy
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Configure outgoing NAT: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico documentation: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: About Calico eBPF: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico Enterprise documentation: Configure egress gateways, on-premises: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico Enterprise documentation: Troubleshoot egress gateways: https://docs.tigera.io/calico-enterprise/latest/networking/egress/troubleshoot
- Calico Enterprise documentation: DNS policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction said the post covered three scenarios, but the post contains four. Updated the sentence to include FQDN-based egress policy.
- The NAT inspection command used `CALICO-MASQ`, which is not the standard Calico iptables dataplane chain for outgoing NAT. Updated it to inspect `cali-nat-outgoing`.
- The iptables policy chain example referenced `cali-po-<pod-interface>` and described `cali-tw-*` for pod egress. Updated the explanation and command to use the host-side `cali-fw-*` chain for traffic from the workload.
- The egress gateway routing explanation was imprecise. Updated it to match Calico Enterprise's documented `ip rule` plus routing-table behavior through the `egress.calico` interface.
- The FQDN policy section described a "DNS sniffer" and "Calico DNS Controller" as if they were the documented user-facing components. Updated the wording to match Calico Enterprise and Calico Cloud DNS policy behavior using trusted DNS responses and DNS-derived policy state.
- The Felix metrics example used `felix_calc_policy`, which is not listed in current Felix metric documentation. Replaced it with `felix_iptables` metrics for programming health and added an iptables DROP-counter command for inspecting drops.
- The best-practices section referred to "Felix's DNS controller logs." Updated it to refer to DNS logs and calico-node logs for FQDN policy troubleshooting.

## Review Notes
The post is version-sensitive because Calico behavior differs across Open Source, Enterprise, Cloud, iptables, nftables, and eBPF dataplanes. The corrected text avoids over-specifying internals where the official docs describe behavior at a higher level.
