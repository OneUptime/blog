# Validation Summary: Route External Networks to Flannel Pod CIDRs

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Node, Pod, Service, and NetworkPolicy networking
- Flannel with VXLAN, `DirectRouting`, and `host-gw`
- Flannel and bridge CNI configuration
- Linux static routing and IPv4 forwarding
- Netfilter connection tracking, NAT, iptables, and nftables
- firewalld, tcpdump, ping, and curl diagnostics
- External route lifecycle and source-IP preservation

## Sources Consulted

- [Kubernetes Node v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) and [JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes network model](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes Service and headless Service behavior](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Flannel v0.28.9 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.9) and [release manifest](https://github.com/flannel-io/flannel/releases/download/v0.28.9/kube-flannel.yml)
- [Flannel v0.28.9 configuration reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md)
- [Flannel v0.28.9 Kubernetes subnet-manager source](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/kube/kube.go)
- [Flannel v0.28.9 iptables traffic-manager source](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/iptables/iptables.go) and [nftables traffic-manager source](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/trafficmngr/nftables/nftables.go)
- [Flannel v0.28.9 backend documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md) and [NetworkPolicy integration](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/netpol.md)
- [Flannel CNI plugin v1.9.1-flannel3 delegate source](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/flannel_linux.go)
- [CNI bridge plugin source](https://github.com/containernetworking/plugins/blob/main/plugins/main/bridge/bridge.go)
- [Netfilter architecture and first-packet NAT behavior](https://netfilter.org/documentation/HOWTO/netfilter-hacking-HOWTO-3.html), [NAT path caveat](https://www.netfilter.org/documentation/HOWTO/NAT-HOWTO-8.html), and [nftables NAT behavior](https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29)
- [ip-route(8)](https://man7.org/linux/man-pages/man8/ip-route.8.html), [ip-address(8)](https://man7.org/linux/man-pages/man8/ip-address.8.html), and [Linux IP sysctls](https://docs.kernel.org/networking/ip-sysctl.html)
- [iptables(8)](https://man7.org/linux/man-pages/man8/iptables.8.html) and [nftables manual](https://netfilter.org/projects/nftables/manpage.html)
- [firewalld policies](https://firewalld.org/documentation/man-pages/firewalld.policies) and [firewall-cmd](https://firewalld.org/documentation/man-pages/firewall-cmd)
- [tcpdump(8)](https://man7.org/linux/man-pages/man8/tcpdump.8.html), [pcap-filter(7)](https://man7.org/linux/man-pages/man7/pcap-filter.7.html), and [curl command-line reference](https://curl.se/docs/manpage.html)

## Issues Found

- The route examples were not explicitly scoped to Linux and IPv4. The mapping reads only the primary `.spec.podCIDR`, whereas dual-stack Nodes expose both families through `.spec.podCIDRs` and may list multiple `InternalIP` addresses. Added an explicit scope statement and directed dual-stack users to pair every Pod CIDR with a same-family next hop.
- The post stated that Flannel's Kubernetes subnet manager consumes only `.spec.podCIDR`. Current Flannel reads `.spec.podCIDRs` when populated and falls back to `.spec.podCIDR` when the list is empty. Corrected the claim.
- The source-preservation explanation did not state that the request and reply must share the owning node's conntrack path. Qualified the claim to require the same owning node and conntrack zone and clarified that Netfilter applies the first packet's NAT decision to the rest of the connection.
- The post stated categorically that Pod IPs change when workloads are recreated. Kubernetes does not guarantee reuse or change, so this was corrected to say that Pod IPs can change.

## Review Notes

- The review was performed against Flannel v0.28.9, the current release on 2026-08-21, whose upstream manifest uses Flannel CNI plugin v1.9.1-flannel3, enables `--ip-masq`, and defaults to the iptables traffic manager.
- Plain Flannel still does not enforce NetworkPolicy. The documented optional `kube-network-policies` integration is available in Flannel v0.25.5 and later.
- The post correctly assumes the conventional Linux bridge delegate and `cni0`; deployments with a custom delegate or bridge name must adapt the interface-specific checks.
- The Netfilter Hacking HOWTO is legacy documentation, but its first-packet NAT explanation remains consistent with current nftables documentation and Flannel's current traffic-manager source.
- `iptables -L FORWARD` shows the jump and ordering in the built-in chain. On iptables-legacy systems, a complete audit should also inspect `FLANNEL-FWD` and the NAT chains, for example with `iptables-save`.
- Kubernetes Node `Ready` status alone is not proof that the Flannel data path is healthy; automated route publication should use an explicit forwarding-health signal as the post already recommends.
