# Detect Flannel Pod CIDR Collisions With LAN and VPN Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Pod CIDR, VPN, Routing, Kubeadm

Description: Detect and prevent overlapping Flannel Pod CIDRs across Kubernetes, host LANs, cloud routes, and corporate VPNs before they cause selective connectivity failures.

---

## Introduction

An address can be syntactically valid and still be unusable as a Kubernetes Pod CIDR. If Flannel's `10.244.0.0/16` overlaps a LAN, VPN, VPC, Docker bridge, Service range, or another connected cluster, Linux longest-prefix routing can send packets to the wrong interface.

Collisions often look selective: only pods in one per-node `/24` fail, failures begin when a VPN connects, or a destination that works from one node is unreachable from another. Kubernetes' kubeadm documentation explicitly requires the Pod network not to overlap host networks and requires the chosen replacement range to match the network plugin configuration.

## Collect Every Address Domain

Build an inventory before changing routes.

### Kubernetes control-plane ranges

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs[*]'

kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

kubectl -n kube-system get configmap kubeadm-config \
  -o jsonpath='{.data.ClusterConfiguration}'
echo
```

On Kubernetes 1.33 or later, also list every ServiceCIDR object. Additional Service ranges can be added without changing kubeadm's stored configuration or the API server's default range:

```bash
kubectl get servicecidrs.networking.k8s.io \
  -o custom-columns='NAME:.metadata.name,CIDRS:.spec.cidrs[*]'
```

On every kubeadm control-plane node, confirm the effective flags rather than trusting stored configuration alone:

```bash
sudo grep -E -- \
  '--(allocate-node-cidrs|cluster-cidr|service-cluster-ip-range|node-cidr-mask-size)' \
  /etc/kubernetes/manifests/kube-controller-manager.yaml \
  /etc/kubernetes/manifests/kube-apiserver.yaml
```

For each enabled address family, Flannel's `Network` or `IPv6Network`, controller-manager's cluster CIDR, and every Node Pod CIDR must describe one consistent Pod address space. Every Service CIDR must be separate from the Pod and node address ranges.

### Host and underlay ranges

Run on every node, not only the control plane:

```bash
ip -4 address show
ip -4 route show table all
ip -4 rule show

ip -6 address show
ip -6 route show table all
ip -6 rule show
```

Include routes installed only when a corporate VPN is connected, policy-routing tables, VRFs, cloud metadata routes, storage networks, hypervisor bridges, and container networks outside Kubernetes.

For NetworkManager-managed VPNs:

```bash
nmcli connection show --active
VPN_CONNECTION='your-vpn-connection-name'
nmcli -f GENERAL,IP4,IP6 connection show "$VPN_CONNECTION"
```

Also export VPC route tables, transit-gateway routes, security appliance networks, peered clusters, and on-premises router prefixes. A host inventory cannot reveal a conflicting route that is installed only upstream.

## Calculate Overlap, Not Just Equality

`10.244.0.0/16` overlaps `10.244.20.0/24` even though the strings differ. Use a CIDR-aware tool. This local Python example reports every overlapping pair without changing the system:

```bash
python3 - <<'PY'
from ipaddress import ip_network

ranges = {
    "flannel-pods": "10.244.0.0/16",
    "services": "10.96.0.0/12",
    "node-lan": "192.0.2.0/24",
    "corporate-vpn": "10.240.0.0/12",
}

parsed = {name: ip_network(cidr, strict=False) for name, cidr in ranges.items()}
names = list(parsed)
for index, left in enumerate(names):
    for right in names[index + 1:]:
        if parsed[left].version == parsed[right].version \
                and parsed[left].overlaps(parsed[right]):
            print(f"OVERLAP: {left} {parsed[left]} <-> {right} {parsed[right]}")
PY
```

Replace every example with real inventory data. The script reports relationships, not automatically faults: aggregate Pod ranges should agree, each per-node Pod CIDR should be contained within them without overlapping another node's Pod CIDR, and deliberately extended Service CIDRs can overlap. Treat overlap between independent address domains as a collision. Check IPv4 and IPv6 independently.

## Prove a Collision in the Live Route Decision

Choose a failing Pod IP and ask the kernel which route wins on the source node:

```bash
POD_IP=10.244.20.17
ip route get "$POD_IP"
ip route show table all match "$POD_IP"
```

The plain `ip route get` lookup models host-originated traffic. If the failing packet is forwarded from a pod and policy routing uses packet attributes, repeat the lookup with its source and ingress interface (`from` and `iif`) plus any relevant `mark`, `vrf`, `ipproto`, or port selectors.

For a remote Flannel VXLAN pod, the `ip route get` result should normally use `flannel.1`. For `host-gw`, it should use the remote node next hop. If it instead uses `tun0`, `wg0`, a LAN interface, or a Docker bridge, the host chose the competing route.

Linux evaluates routing-policy rules in priority order; within each table lookup, it prefers the longest matching prefix before route metric. A policy rule can therefore select a less-specific route from a different table. Flannel normally installs one route per remote node lease, such as `10.244.20.0/24`; when both routes are considered in the same table, a VPN's `10.244.20.0/25` wins for addresses in that more-specific half of the subnet. If both competing routes are `/24`, longest-prefix matching does not decide between them: inspect policy rules, routing tables, metrics, multipath next hops, and the actual `ip route get` result. A route's `proto` value identifies its origin; it is not a general route-selection tie-breaker. A broad VPN route such as `10.240.0.0/12` in the same table normally loses to Flannel's remote `/24` for that destination, so changing only the default-route metric may not address the real collision.

Watch a VPN or network agent change the table:

```bash
ip monitor route
```

Then connect or disconnect the VPN in a controlled test. Do not delete a corporate route on a production node merely to make a ping work; it may carry required security or management traffic.

## Distinguish CIDR Collisions From Other Problems

- Duplicate node Pod CIDRs cause two nodes to claim the same pod subnet; check for duplicates separately.
- A wrong Flannel interface affects the outer node-to-node path even when Pod CIDRs do not overlap.
- Blocking the configured VXLAN UDP port (8472 by default on Linux) affects encapsulated VXLAN traffic between nodes but does not create a competing route.
- Service CIDR failures with working Pod IPs can point toward the Service proxy (`kube-proxy` in a default kubeadm deployment).
- MTU problems usually allow small packets but fail larger ones.

A route collision generally follows destination prefix boundaries and changes with route presence.

## Choose a Durable Remedy

For a new kubeadm cluster, choose a non-overlapping Pod range before initialization:

```bash
sudo kubeadm init --pod-network-cidr=172.30.0.0/16
```

Edit a pinned Flannel manifest so `net-conf.json` uses the exact same `172.30.0.0/16` before applying it.

For an existing cluster, changing the Pod CIDR is a disruptive readdressing project. Existing pods, Node CIDRs, CNI state, routes, policies, and peer systems refer to the old range. Depending on the environment, rebuilding the cluster with a new range is safer than attempting an in-place conversion.

Alternative durable fixes include changing the VPN split-tunnel prefixes, renumbering the conflicting LAN/VPC, or moving another connected cluster's address space. Choose the system with the lowest migration risk; do not stack more-specific host routes indefinitely as a hidden workaround.

## Add Collision Checks to Provisioning

Before admitting a new node or network peer:

1. Export Pod, Service, and Node CIDRs.
2. Export all node route tables with and without VPNs.
3. Query cloud and physical router tables.
4. Run CIDR-aware pairwise overlap checks and classify each result by address domain.
5. Test representative addresses with `ip route get` on each node class.
6. Repeat for both IP families and every connected cluster.

Treat network ranges as change-controlled cluster API, not installation defaults.

## Official Documentation

- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#pod-network)
- [Kubernetes cluster networking and non-overlapping ranges](https://kubernetes.io/docs/concepts/cluster-administration/networking/#kubernetes-ip-address-ranges)
- [Kubernetes dual-stack configuration](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes: Extend Service IP ranges](https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/)
- [Flannel README and custom Pod CIDR requirement](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)

## Conclusion

Detect Flannel CIDR collisions by comparing networks mathematically and checking the live `ip route get` decision for a failing Pod IP. Inventory transient VPN and upstream routes as well as Kubernetes ranges. The durable fix is non-overlapping address space across Pods, Services, nodes, and every connected network, preferably chosen before kubeadm initialization.
