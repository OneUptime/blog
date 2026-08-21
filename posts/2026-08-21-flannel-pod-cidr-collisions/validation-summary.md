# Validation Summary: Detect Flannel Pod CIDR Collisions With LAN and VPN Routes

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes networking, Node Pod CIDRs, and Service CIDRs
- kubeadm and Kubernetes control-plane configuration
- Flannel CNI with VXLAN and `host-gw` backends
- Linux routing tables, routing-policy rules, and iproute2
- NetworkManager VPN inspection with `nmcli`
- Python's `ipaddress` module
- IPv4, IPv6, VPN, LAN, VPC, and overlay-network routing

## Sources Consulted

- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#pod-network)
- [Kubernetes: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/#kubernetes-ip-address-ranges)
- [Kubernetes Node API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Kubernetes: kubeadm config](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/), [kubeadm init](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/), and [reconfiguring a kubeadm cluster](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/)
- [Kubernetes kube-controller-manager command reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)
- [Kubernetes IPv4/IPv6 dual-stack documentation](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes: Extend Service IP Ranges](https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/) and [default ServiceCIDR reconfiguration](https://kubernetes.io/docs/tasks/network/reconfigure-default-service-ip-ranges/)
- [Kubernetes Services, Load Balancing, and Networking](https://kubernetes.io/docs/concepts/services-networking/)
- [Kubernetes kubectl JSONPath](https://kubernetes.io/docs/reference/kubectl/jsonpath/) and [kubectl output reference](https://kubernetes.io/docs/reference/kubectl/)
- [Flannel v0.28.9 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.9), [README](https://github.com/flannel-io/flannel/blob/v0.28.9/README.md), [configuration reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md), [backend reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md), and [official manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml)
- [Flannel VXLAN implementation](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/vxlan/vxlan_network.go) and [`host-gw` implementation](https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/backend/hostgw/hostgw.go)
- [iproute2 `ip-route(8)`](https://man7.org/linux/man-pages/man8/ip-route.8.html), [`ip-rule(8)`](https://man7.org/linux/man-pages/man8/ip-rule.8.html), and [`ip-monitor(8)`](https://man7.org/linux/man-pages/man8/ip-monitor.8.html) manual pages
- [RFC 1812: Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812.html)
- [NetworkManager `nmcli` reference](https://networkmanager.dev/docs/api/latest/nmcli.html)
- [Python `ipaddress` documentation](https://docs.python.org/3/library/ipaddress.html)

## Issues Found

- The Kubernetes inventory omitted dynamically added Service ranges. Added a Kubernetes 1.33-or-later `ServiceCIDR` query because additional ServiceCIDR objects do not have to appear in kubeadm's stored configuration or the API server's default range.
- Control-plane verification referred to only one control-plane node and omitted `--allocate-node-cidrs`. Changed the instruction to inspect every kubeadm control-plane node and added that flag to the manifest check because it controls whether the controller manager uses `--cluster-cidr` for Node CIDR allocation.
- The Flannel consistency statement named only the IPv4 `Network` field. Added `IPv6Network` for IPv6 and dual-stack clusters, and clarified that every Service CIDR must remain separate from Pod and node address ranges.
- The `nmcli` example used an angle-bracket placeholder that a shell would parse as input redirection. Replaced it with a quoted `VPN_CONNECTION` variable.
- The pairwise overlap example could make expected containment look like a fault. Clarified that aggregate Pod CIDRs should agree, per-node Pod CIDRs should be contained by the aggregate and mutually non-overlapping, intentionally extended Service CIDRs may overlap, and cross-domain overlaps are the collisions of interest.
- `ip route show match` inspected only the main table, and a destination-only `ip route get` was presented as if it represented every packet. Added `table all` to the route listing and explained that the plain lookup models host-originated traffic; forwarded Pod traffic may require matching `from`, `iif`, mark, VRF, protocol, and port selectors.
- Longest-prefix behavior was described as global across policy-routing tables, and route protocol was listed as though it were a generic tie-breaker. Clarified that routing-policy rules determine table lookup order, longest-prefix and metric comparison happen within a table lookup, examples require the routes to be compared in the same table, and `proto` identifies route origin.
- UDP 8472 was presented as an unconditional VXLAN requirement. Clarified that it is Flannel's configurable default Linux VXLAN port and that blocking it affects encapsulated VXLAN traffic.
- The diagnostic list assumed that Kubernetes Services are always implemented by `kube-proxy`. Changed it to the Service proxy and identified `kube-proxy` as the default kubeadm implementation.

## Review Notes

- The review used current Kubernetes v1.36 documentation and the current Flannel v0.28.9 release as of 2026-08-21.
- The Python example was executed with Python 3.13.1 and produced the expected Flannel/VPN overlap.
- Commands requiring a live Linux Kubernetes cluster were checked against current official command references rather than run against a production cluster.
- The `kube-flannel` namespace, `kube-flannel-cfg` ConfigMap, and `flannel.1` device are correct for Flannel's official default Linux IPv4 VXLAN deployment. Custom namespaces, VNI values, or `DirectRouting` can change those details; the post's existing "normally" qualifier is appropriate.
- No deprecated APIs or unresolved technical issues remain after the corrections.
