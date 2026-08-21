# Validation Summary: Preserve or Masquerade Pod Source IPs With Flannel

## Status
validated

## Post Type
Technical guide / Network configuration guide

## Technologies Covered
- Kubernetes and kube-proxy
- Flannel and the Flannel CNI plugin
- CNI bridge plugin
- Linux routing and IP forwarding
- iptables and nftables
- Source NAT, IP masquerade, and conntrack
- firewalld, cloud NAT, and egress gateways

## Sources Consulted
- [Flannel v0.28.9 configuration documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md) - verified the `--ip-masq` default and semantics and the experimental status of `EnableNFTables`.
- [Flannel v0.28.9 upstream Kubernetes manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml) - verified the DaemonSet, ConfigMap, default `--ip-masq` argument, CNI delegate, install paths, and current image versions.
- [Flannel v0.28.9 Helm DaemonSet template](https://github.com/flannel-io/flannel/blob/v0.28.9/chart/kube-flannel/templates/daemonset.yaml) and [default values](https://github.com/flannel-io/flannel/blob/v0.28.9/chart/kube-flannel/values.yaml) - verified that Helm places the executable and flags in the container `command` field and enables `--ip-masq` by default.
- [Flannel v0.28.9 daemon source](https://github.com/flannel-io/flannel/blob/v0.28.9/main.go), [subnet-file writer](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/subnet.go), [iptables manager](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/iptables/iptables.go), and [nftables manager](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/nftables/nftables.go) - verified flag parsing, `FLANNEL_IPMASQ`, rule scope, rule ownership, backend cleanup, and same-backend rule persistence.
- [Flannel CNI plugin v1.9.1-flannel3 documentation](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/README.md), [Linux delegate implementation](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/flannel_linux.go), and [Windows delegate implementation](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/flannel_windows.go) - verified default bridge delegation, Linux's inverse derivation of delegate `ipMasq` only when the field is absent, and the need to scope the procedure to Linux.
- [CNI bridge plugin documentation](https://www.cni.dev/plugins/current/main/bridge/) and [official masquerade implementation](https://github.com/containernetworking/plugins/blob/v1.9.1/pkg/ip/ipmasq_linux.go) - verified the `ipMasq` and `ipMasqBackend` fields and CNI lifecycle behavior.
- [CNI bridge iptables implementation](https://github.com/containernetworking/plugins/blob/v1.9.1/pkg/ip/ipmasq_iptables_linux.go) and [nftables implementation](https://github.com/containernetworking/plugins/blob/v1.9.1/pkg/ip/ipmasq_nftables_linux.go) - verified the `CNI-` chain prefix, `cni_plugins_masquerade` table, per-workload rule setup, and teardown behavior.
- [Kubernetes: Using Source IP](https://kubernetes.io/docs/tutorials/services/source-ip/) and [Service API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/) - verified ClusterIP, NodePort, LoadBalancer, `externalTrafficPolicy`, and source-preservation behavior.
- [Kubernetes nftables proxy KEP](https://github.com/kubernetes/enhancements/blob/master/keps/sig-network/3866-nftables-proxy/README.md) and [kube-proxy IPVS documentation](https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/ipvs/README.md) - verified hairpin masquerading and proxy-mode-specific SNAT behavior.
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/) and [kubectl rollout reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/) - verified the inspection and DaemonSet rollout commands.
- [Linux kernel IP sysctl documentation](https://docs.kernel.org/networking/ip-sysctl.html) and [ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html) - verified `net.ipv4.ip_forward`, reverse-path filtering, and route-lookup semantics.
- [Netfilter nftables NAT documentation](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29), [nft(8)](https://netfilter.org/projects/nftables/manpage.html), and [iptables-save(8)](https://man7.org/linux/man-pages/man8/iptables-save.8.html) - verified stateful NAT/conntrack behavior and the rule-inspection options.
- [firewalld firewall-cmd manual](https://firewalld.org/documentation/man-pages/firewall-cmd) - verified zone/policy masquerading as another possible NAT boundary.
- [AWS NAT gateway scenarios](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html) - checked an authoritative example of legitimate NAT at a separate cloud boundary.

## Issues Found
1. The DaemonSet inspection read only `.args`, but the upstream Helm chart stores the Flannel executable and flags in `.command`. Updated the JSONPath to show both fields so it works for the static manifest and Helm-rendered DaemonSets.
2. The NAT inspection filtered only for `flannel`, which misses bridge-plugin masquerade state. Added the bridge plugin's `CNI-` iptables chains and `cni_plugins_masquerade` nftables table, included iptables counters and nftables handles, and updated both pre-change and post-change checks.
3. The introduction described Linux's default bridge delegation and inverse `ipMasq` derivation without a platform scope, although Windows uses a different CNI/HNS path and Flannel supports other delegates. Scoped the procedures to Linux, identified bridge as the default delegate, and noted that the route and sysctl examples are IPv4-specific.
4. The return-routing text implied that a separate route through the owning node is mandatory for every per-node Pod CIDR. Clarified that the network needs routes covering the Pod CIDRs and presented per-owner routes as a straightforward static design; aggregation through a node that can forward onward can also work.
5. The route check was presented as universal and sufficient for routers, and its angle-bracket placeholder is a shell redirection token if copied literally. Qualified `ip route get` as a Linux/simple-routing-table check, used a syntactically runnable documentation address, and noted that policy-routed or forwarded paths need the relevant source and incoming-interface context or a platform-equivalent lookup.
6. The kube-proxy sentence treated `externalTrafficPolicy` as a traffic path. Reworded it as a field that controls source-IP behavior for externally facing Service traffic and retained hairpin SNAT as a separate case.
7. The NAT-ownership guidance required one owner for an entire flow, even though legitimate flows can cross multiple translation boundaries, such as node SNAT followed by cloud NAT. Changed the guidance to document every boundary and avoid competing owners for the same translation decision.
8. The ClusterIP test path assumed kube-proxy is always the Service implementation. Added “or its replacement” for clusters that use another Service proxy implementation.

## Review Notes
- Validation was performed against Flannel v0.28.9 and flannel-cni-plugin v1.9.1-flannel3, the current upstream versions on 2026-08-21. Moving `master` and `current` documentation links can change after publication.
- The commands and host paths in this guide are Linux-specific. Flannel's Windows CNI and HNS NAT behavior is different. Dual-stack deployments also need the corresponding IPv6 forwarding and firewall checks.
- The bridge plugin's masquerade scope is per workload attachment and its normal CNI DEL path removes saved rules, but stale rules can remain when teardown lacks the prior network namespace or saved state. The post's inventory-first, narrowly scoped cleanup warning is therefore appropriate.
- kube-proxy source-IP behavior can vary by proxy mode and topology, and a cloud load balancer may terminate connections independently of kube-proxy. The post correctly recommends testing each path separately at multiple capture points.
