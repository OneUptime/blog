# Validation Summary: How to Set Up Network Address Translation in Rancher (2)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher / Kubernetes
- Calico CNI (IPPool, Egress Gateway)
- iptables (nat table, DNAT, SNAT, MASQUERADE)
- Linux netfilter / nf_conntrack
- kubectl

## Sources Consulted
- [Calico — IP pool resource reference](https://docs.tigera.io/calico/latest/reference/resources/ippool)
- [Calico — Resource definitions overview](https://docs.tigera.io/calico/latest/reference/resources/overview)
- [Calico Cloud — Configure egress gateways, on-premises](https://docs.tigera.io/calico-cloud/networking/egress/egress-gateway-on-prem)
- [Calico Cloud — Egress gateway policy](https://docs.tigera.io/calico-cloud/reference/resources/egressgatewaypolicy)
- [Calico — Use a specific IP address with a pod](https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip)
- [Calico — Configure the Calico CNI plugins](https://docs.projectcalico.org/reference/cni-plugin/configuration)
- [Tigera — Calico Egress Gateway product page](https://www.tigera.io/tigera-products/egress-gateway/)
- [tigera-solutions/calico-egress-gateway-public-source-ip-anchoring (reference manifests)](https://github.com/tigera-solutions/calico-egress-gateway-public-source-ip-anchoring)
- iptables(8) and conntrack-tools manuals (`iptables -t nat`, `/proc/sys/net/netfilter/nf_conntrack_count`)

## Issues Found

1. **Step 2 — Fictional `EgressIPSet` resource.** The post defined a resource `kind: EgressIPSet` under `apiVersion: projectcalico.org/v3`. This is not a real Calico API resource — Calico's `projectcalico.org/v3` API exposes BGPConfiguration, BGPPeer, FelixConfiguration, GlobalNetworkPolicy, GlobalNetworkSet, HostEndpoint, IPPool, NetworkPolicy, NetworkSet, Node, Profile, and WorkloadEndpoint. Egress traffic is steered to gateway pods by annotating namespaces or pods with `egress.projectcalico.org/selector` (and optionally `egress.projectcalico.org/namespaceSelector`). I replaced the bogus block with the actual mechanism (a `kubectl annotate ns ... egress.projectcalico.org/selector=...` example) and added `nodeSelector: "!all()"` to the egress IPPool — the documented setting that prevents the public-IP pool from being used by ordinary cluster workloads.

2. **Step 3 — Incorrect egress gateway image.** The post used `image: calico/egress-gateway:latest`. The Calico egress gateway is a Tigera (Calico Cloud / Calico Enterprise) component published at `quay.io/tigera/egress-gateway:<version>`, and pulling it requires `imagePullSecrets: [tigera-pull-secret]`. I changed the image to `quay.io/tigera/egress-gateway:v3.28.0` and added the pull secret.

3. **Step 3 — `cni.projectcalico.org/ipAddrs` cannot be used with `replicas: 2`.** The annotation accepts at most one IPv4 (and one IPv6) address; two replicas annotated with the same single IP would conflict. The correct annotation for a multi-replica egress gateway Deployment is `cni.projectcalico.org/ipv4pools`, which references the dedicated egress IPPool so Calico IPAM hands each replica a distinct IP from that pool. I changed the annotation to `cni.projectcalico.org/ipv4pools: '["egress-pool"]'` and also added the missing `selector.matchLabels` and template labels so the Deployment is valid and so the namespace selector annotation from Step 2 (`egress-code == 'red'`) actually matches gateway pods.

## Review Notes

- The remaining technical content (Step 1 SNAT verification, Step 4 `natOutgoing: false` with `nodeSelector: all()`, Step 5 iptables `-t nat -A PREROUTING -j DNAT`, and Step 6 monitoring via `iptables -t nat -L` and `/proc/sys/net/netfilter/nf_conntrack_count`) is accurate.
- Caveat for readers: Calico's egress gateway feature is part of Calico Cloud / Calico Enterprise (Tigera), not the open-source Calico distribution. A Rancher cluster running upstream Calico will not have access to this feature without the Tigera operator and a valid pull secret.
- Caveat for readers: the Step 5 iptables DNAT rule will be added to the host's `nat` table but will not survive `kube-proxy` periodically reconciling its own iptables chains, nor a node reboot. Persisting it via a privileged DaemonSet (as the comment hints) or an init container is the realistic production approach; on most modern clusters using `Service` + `LoadBalancer` / `NodePort` / `ExternalIPs` is preferred over hand-rolled DNAT.
- Title contains a trailing "(2)" which appears to be a slug/numbering artifact rather than meaningful content; left untouched as it was not a technical issue.
