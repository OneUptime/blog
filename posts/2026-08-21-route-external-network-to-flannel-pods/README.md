# Route External Networks to Flannel Pod CIDRs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Static Routing, Pod CIDR, Source IP, Bare Metal

Description: Route an external private network directly to Flannel Pod CIDRs using per-node routes, source-IP preservation, forwarding policy, and failure-aware route management.

---

## Introduction

Kubernetes normally exposes workloads through Services, Ingress, or Gateway APIs. On a controlled private network, it is also possible to route external clients directly to Pod IPs without a `LoadBalancer`. With Flannel, the external router must know which node owns each Pod CIDR, and pod replies must retain their source IP.

This design exposes ephemeral workload addresses as routed infrastructure. It does not provide Service load balancing, stable discovery, health-based endpoint selection, or NetworkPolicy by itself. Use it only when clients and operations are designed for those constraints.

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

Check for duplicate or missing Node CIDRs before publishing routes. Flannel's Kubernetes subnet manager consumes `.spec.podCIDR`; it does not make duplicate assignments safe.

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

An aggregate route such as `10.244.0.0/16` can point to a deliberate cluster gateway, which then follows Flannel routes to the owning node, but that gateway becomes an extra hop and failure domain. Per-node routes avoid that ambiguity for a small cluster.

## Verify the Owning Node's Local Route

On each node:

```bash
ip route show <that-node-pod-cidr>
ip route get <local-pod-ip>
ip -4 address show dev cni0
sysctl net.ipv4.ip_forward
```

With the usual Flannel bridge delegate, local pods attach to `cni0`, and the node routes their addresses through that bridge. The bridge may not exist until the first ordinary pod is created.

For a remote Pod CIDR, a VXLAN node routes through `flannel.1`; `host-gw` uses a direct node next hop. Sending each external prefix to its owning node avoids unnecessary traversal of that inter-node path.

## Preserve Pod Source Addresses on Replies

The default upstream Flannel manifest enables `--ip-masq`. A reply from a pod to an external client is destined outside the Flannel network and can therefore be masqueraded to the node address. The client connected to a Pod IP but sees a reply from another address, which breaks a direct routed session.

For direct bidirectional routing:

1. Disable Flannel's outside-network `--ip-masq` behavior.
2. Set `delegate.ipMasq` explicitly to false in the Flannel CNI configuration; otherwise the plugin derives the inverse of `FLANNEL_IPMASQ` and can ask the bridge delegate to masquerade.
3. Roll the Flannel DaemonSet and recreate workload pods in a controlled window so the new subnet file and CNI configuration take effect.
4. Inventory the resulting iptables or nftables rules. Disabling the flag does not guarantee that same-backend Flannel MASQ rules from the earlier configuration are removed; reconcile only identified stale rules with a version-tested, tightly scoped procedure, and never flush the NAT table.
5. Confirm that firewalld, an egress gateway, or a cloud NAT layer does not translate the same path.

Verify at the external client or router:

```bash
sudo tcpdump -ni <external-interface> \
  "host <pod-ip> and host <external-client-ip>"
```

Requests and replies should retain the external client and Pod IPs respectively.
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

Allow the external client CIDR to reach only the intended Pod CIDRs and ports, and allow stateful return traffic. Do not set a global `FORWARD ACCEPT` policy. If firewalld is active, model the traffic direction with zones and policies rather than adding transient rules that a reload removes.

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

Pod IPs change when workloads are recreated. External clients need an authorized discovery mechanism and must tolerate endpoint churn. A headless Service can publish Pod IPs inside cluster DNS, but it does not automatically publish secure external DNS or remove the need for health checks.

For stable public or general application exposure, Services, Ingress, or Gateway are usually the better abstraction even when no cloud `LoadBalancer` exists. Direct Pod CIDR routing is best suited to controlled infrastructure integrations that need real pod addresses.

## Official Documentation

- [Kubernetes cluster networking model](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes Service types and ClusterIP behavior](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Flannel configuration and `--ip-masq`](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel CNI plugin delegate behavior](https://github.com/flannel-io/cni-plugin)
- [Flannel backend routing behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [firewalld policy concepts](https://firewalld.org/documentation/man-pages/firewalld.policies)

## Conclusion

Route an external network to Flannel pods by publishing each Node Pod CIDR through its owning node, enabling narrowly scoped forwarding, and preserving Pod IPs on replies at both Flannel and CNI delegate layers. Add lifecycle automation and security controls because Flannel does not advertise external routes, stabilize pod endpoints, or enforce policy by itself.
