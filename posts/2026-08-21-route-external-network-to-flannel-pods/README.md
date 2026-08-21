# Route External Networks to Flannel Pod CIDRs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Static Routing, Pod CIDR, Source IP, Bare Metal

Description: Route an external private network directly to Flannel Pod CIDRs using per-node routes, source-IP preservation, forwarding policy, and failure-aware route management.

---

## Introduction

Kubernetes normally exposes workloads through Services, Ingress, or Gateway APIs. On a controlled private network, it is also possible to route external clients directly to Pod IPs without a `LoadBalancer`. With Flannel, the external router must know which node owns each Pod CIDR, and pod replies must retain their source IP.

This design exposes ephemeral workload addresses as routed infrastructure. It does not provide Service load balancing, stable discovery, health-based endpoint selection, or NetworkPolicy by itself. Use it only when clients and operations are designed for those constraints.

The commands below target Linux nodes and IPv4. For dual-stack clusters, enumerate `.spec.podCIDRs` and pair each CIDR with a reachable next hop of the same address family.

## Map Node Pod CIDRs to Reachable Node Addresses

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,NODE_IP:.status.addresses[?(@.type=="InternalIP")].address'
```

Example mapping:

```text
worker-1  10.244.1.0/24  192.0.2.11
worker-2  10.244.2.0/24  192.0.2.12
worker-3  10.244.3.0/24  192.0.2.13
```

Confirm that the listed node address is reachable from the external router. On multi-NIC nodes, Flannel's selected underlay address and Kubernetes `InternalIP` can differ; choose a documented next hop that forwards the destination Pod CIDR correctly.

Check for duplicate or missing Node CIDRs before publishing routes. Flannel's Kubernetes subnet manager consumes `.spec.podCIDRs` when present and otherwise falls back to `.spec.podCIDR`; it does not make duplicate assignments safe.

## Install Per-Node Routes on the External Router

The simplest deterministic design routes each node subnet to its owning node:

```bash
# Run on the external router, using the real Node CIDR mapping.
sudo ip route add 10.244.1.0/24 via 192.0.2.11
sudo ip route add 10.244.2.0/24 via 192.0.2.12
sudo ip route add 10.244.3.0/24 via 192.0.2.13
```

These commands change live routing. Apply them only on the intended router with a reviewed rollback and management path. Persist routes using that router's supported configuration system after testing.

Do not point the same Pod subnet at multiple unrelated nodes without a routing protocol and equal-cost design that understands ownership. Do not route the Service CIDR this way; ClusterIPs are virtual addresses implemented by kube-proxy or its replacement, not pod interfaces.

An aggregate route such as `10.244.0.0/16` can point to a deliberate cluster gateway, which then follows Flannel routes to the owning node, but that gateway becomes an extra hop and failure domain. With Flannel's default iptables masquerading, a non-owning Flannel node can also SNAT the request before forwarding it to the owner, hiding the external client address from the pod. Per-node routes avoid that behavior and the routing ambiguity for a small cluster.

## Verify the Owning Node's Local Route

On each node:

```bash
ip route show <that-node-pod-cidr>
ip route get <local-pod-ip>
ip -4 address show dev cni0
sysctl net.ipv4.ip_forward
```

With the usual Flannel bridge delegate, local pods attach to `cni0`, and the node routes their addresses through that bridge. The bridge may not exist until the first ordinary pod is created.

For a remote Pod CIDR, the default VXLAN configuration routes through `flannel.1`; when VXLAN `DirectRouting` is enabled, peers on the same subnet use direct routes instead. `host-gw` uses a direct node next hop. Sending each external prefix to its owning node avoids unnecessary traversal of that inter-node path.

## Preserve Pod Source Addresses on Replies

The default upstream Flannel manifest enables `--ip-masq`. This masquerades new pod-initiated connections to destinations outside the Flannel network. Provided both directions traverse the owning node in the same conntrack zone, Flannel does not normally masquerade a reply on a connection initiated by an external client: current Flannel rules exempt the first external packet forwarded directly to that node's Pod CIDR, and Netfilter applies the first packet's resulting NAT decision to the rest of the connection.

Do not disable `--ip-masq` solely for client-initiated direct sessions; removing it can break ordinary pod egress when the upstream network has no return route to Pod CIDRs. If pods must also initiate new connections to the external client CIDR while retaining their Pod source addresses, use a version-tested, CIDR-scoped no-SNAT policy. If the design instead disables Flannel's global masquerading:

1. Confirm that every affected destination has a return route to the Pod CIDRs before removing `--ip-masq`.
2. Set `delegate.ipMasq` explicitly to false in the Flannel CNI configuration; otherwise the plugin derives the inverse of `FLANNEL_IPMASQ` and can ask the bridge delegate to masquerade.
3. Roll the Flannel DaemonSet so the new subnet file and CNI configuration take effect. Recreate only workloads whose original CNI setup enabled delegate masquerading and therefore requires a new CNI `ADD`.
4. Inventory the resulting iptables or nftables rules. Neither disabling the flag nor deleting pods after changing the delegate guarantees that Flannel and CNI MASQ rules from the earlier configuration are removed; reconcile only identified stale rules with a version-tested, tightly scoped procedure, and never flush the NAT table.
5. Confirm that firewalld, an egress gateway, or a cloud NAT layer does not translate the same path.

Verify at the external client or router:

```bash
sudo tcpdump -ni <external-interface> \
  "host <pod-ip> and host <external-client-ip>"
```

Requests and replies should retain the external client and Pod IPs respectively.
Repeat the capture on `cni0` or inside the pod to confirm that the request reaches the pod with the external client source intact.
Use a new connection for this check because an existing conntrack entry can retain the old NAT decision.

## Permit Forwarding Without Trusting Everything

On nodes:

```bash
lsmod | grep -w br_netfilter
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables

sudo iptables -L FORWARD -n -v --line-numbers
sudo nft list ruleset
sudo firewall-cmd --get-active-zones 2>/dev/null || true
```

Allow the external client CIDR to reach only the intended Pod CIDRs and ports, and allow stateful return traffic. Do not set a global `FORWARD ACCEPT` policy. Flannel enables its forward-rule management by default and installs broad accepts for traffic to and from its network, so ensure that the narrower controls have effective ordering relative to those rules or enforce them on the upstream router. If firewalld is active, model the traffic direction with zones and policies rather than adding transient rules that a reload removes.

Plain Flannel connectivity does not enforce Kubernetes NetworkPolicy. If pod-level policy is required, deploy and validate Flannel's documented optional network-policy component or another compatible enforcement design.

## Handle Route Lifecycle and Failure

Static routes are practical only when node membership and CIDRs rarely change. Automate these events:

- Add a route only after the Node has a Pod CIDR and is ready to forward it.
- Withdraw a route before decommissioning or rebuilding its node.
- Update the next hop when a node address changes.
- Detect duplicate Node CIDRs and refuse to advertise them.
- Restore routes after router failover or reboot.

Flannel does not advertise Pod CIDRs to external routers with BGP. If dynamic convergence is required, use a routing daemon or network controller with explicit ownership, filters, authentication, and failure detection. Do not scrape Node objects into privileged route changes without validation and audit controls.

## Test the Complete Path

From an external client:

```bash
ip route get <pod-ip>
ping -c 3 <pod-ip>
curl -v --connect-timeout 3 http://<pod-ip>:<port>/
```

On the router and owning node, capture the same flow. Validate:

1. The router selects the owning node.
2. The node forwards the request to `cni0` and the pod veth.
3. The pod's default route sends the reply back through the node.
4. The node does not SNAT the reply.
5. The external network routes the Pod IP source without anti-spoof rejection.

Test realistic packet sizes. Direct external paths and VXLAN paths can have different MTUs.

## Plan for Ephemeral Pods

Pod IPs can change when workloads are recreated. External clients need an authorized discovery mechanism and must tolerate endpoint churn. A headless Service can publish Pod IPs inside cluster DNS, but it does not automatically publish secure external DNS or remove the need for health checks.

For stable public or general application exposure, Services, Ingress, or Gateway are usually the better abstraction even when no cloud `LoadBalancer` exists. Direct Pod CIDR routing is best suited to controlled infrastructure integrations that need real pod addresses.

## Official Documentation

- [Kubernetes cluster networking model](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes Service types and ClusterIP behavior](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Flannel configuration and `--ip-masq`](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel CNI plugin delegate behavior](https://github.com/flannel-io/cni-plugin)
- [Flannel backend routing behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Netfilter NAT and connection-tracking behavior](https://netfilter.org/documentation/HOWTO/netfilter-hacking-HOWTO-3.html)
- [Flannel NetworkPolicy integration](https://github.com/flannel-io/flannel/blob/master/Documentation/netpol.md)
- [firewalld policy concepts](https://firewalld.org/documentation/man-pages/firewalld.policies)

## Conclusion

Route an external network to Flannel pods by publishing each Node Pod CIDR through its owning node, enabling narrowly scoped forwarding, and verifying source addresses end to end. Keep client-initiated direct sessions distinct from pod-initiated egress when evaluating masquerading. Add lifecycle automation and security controls because Flannel does not advertise external routes, stabilize pod endpoints, or enforce policy by itself.
