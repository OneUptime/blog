# Why kube-hunter Reaches a Private NodePort: Firewall Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes Security, Network Security, Firewall

Description: Trace unexpected NodePort reachability through DNS, routes, cloud firewalls, load balancers, host rules, kube-proxy, and service configuration without confusing a connection with exploitation.

---

A Kubernetes `NodePort` is designed to be reachable on node addresses unless another control restricts the path. Kubernetes allocates a port-by default from `30000-32767`-and each node proxies that same port to ready Service endpoints. Therefore “private” must be enforced by node addressing, routes, firewalls, and Service design; the label is not inherent in `type: NodePort`.

If kube-hunter reaches one unexpectedly, trace the packet path before changing rules.

## Verify What kube-hunter Actually Tested

Preserve the raw report, target, scanner source, time, tool revision, and DNS answers. Current kube-hunter port discovery tests a fixed list that includes port `30000`; it is not a general scan of the entire default NodePort range. Confirm the reported numeric port and service classification in the exact source revision.

From the same scanner, capture a bounded connection result:

~~~bash
NODE=203.0.113.20
PORT=30000
date -u
getent ahosts "$NODE" || true
nc -vz -w 3 "$NODE" "$PORT"
~~~

A successful TCP handshake proves reachability, not that kube-hunter exploited the backend. An HTTP response, TLS certificate, or kube-hunter service classification adds protocol evidence but still does not establish authorization bypass.

## Inspect the Service

Identify the Service that owns the port:

~~~bash
kubectl get services --all-namespaces \
  -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type,NODEPORT:.spec.ports[*].nodePort,PORT:.spec.ports[*].port,PROTO:.spec.ports[*].protocol'

NAMESPACE=application
SERVICE=example
kubectl -n "$NAMESPACE" get service "$SERVICE" -o yaml
kubectl -n "$NAMESPACE" get endpointslices \
  -l "kubernetes.io/service-name=$SERVICE" -o wide
~~~

Check `type`, `nodePort`, protocol, selectors, endpoints, `externalTrafficPolicy`, and whether a LoadBalancer Service also allocated a node port. Do not delete it until you know what depends on it. If external clients never need direct node access, consider a ClusterIP or an ingress/gateway architecture instead.

## Trace the Path Layer by Layer

### Address and route

Determine whether DNS returned a public node address, private address reachable by VPN/peering, load-balancer address, or NAT address. Capture `traceroute` or cloud flow evidence where approved. “Outside the cluster” can still be inside a routed trusted network.

### Cloud edge

Inspect security groups, network security groups, VPC firewall rules, network ACLs, load balancer listeners, target groups, and NAT/forwarding rules. Look for:

- source `0.0.0.0/0` or `::/0`;
- broad corporate, runner, NAT, or peered-network CIDRs;
- a rule attached through a shared node group rather than the expected group;
- a load balancer health or forwarding rule that exposes the NodePort;
- IPv6 rules when only IPv4 was reviewed.

Resolve the scanner's **observed egress address**, not merely its Pod or VM address. NAT can make a restrictive-looking allowlist accept a much larger population.

### Host and Kubernetes dataplane

Review the node firewall and kube-proxy or replacement dataplane. Kubernetes documents the `--nodeport-addresses` kube-proxy option for limiting which local address blocks serve NodePorts. When unset, it defaults to all node addresses in iptables and IPVS modes, but to the node's primary address or dual-stack primary addresses in nftables mode. Whether your distribution exposes that setting, and how an eBPF dataplane implements NodePort, is provider-specific.

Do not assume a host `LISTEN` socket must appear. iptables, nftables, IPVS, or eBPF can forward traffic before a conventional process listener. Use the supported diagnostics for the installed dataplane.

### Backend

Verify which EndpointSlice received the connection and whether source IP was preserved or translated. This explains why application logs may show a node or proxy address rather than the original scanner.

## Understand Why NetworkPolicy May Not Help

Kubernetes NetworkPolicy governs traffic involving Pods and is implemented by the CNI. NodePort traffic may be translated before or after policy evaluation, with behavior that varies by plugin and provider. The Kubernetes documentation explicitly warns that source/destination rewriting around external traffic can affect what policy sees.

Use infrastructure firewalls to restrict node ingress. Use NetworkPolicy as an additional backend-Pod control only after verifying how the CNI handles the specific NodePort path.

## Remediate at the Owning Layer

Prefer eliminating unnecessary NodePort exposure. Otherwise:

1. Narrow cloud or physical firewall sources to exact approved ranges.
2. Remove accidental load balancer, NAT, or forwarding rules.
3. Ensure nodes lack public addresses when public node access is unnecessary.
4. Restrict NodePort-serving interfaces through supported dataplane configuration.
5. Apply backend NetworkPolicy and application authentication.
6. Manage changes in infrastructure as code so node replacement cannot restore exposure.

Avoid blocking the full NodePort range blindly; inventory every Service and health-check dependency first. Canary the change and watch load balancer health, connection errors, and application availability.

## Validate the Boundary

Repeat the same connection and pinned passive kube-hunter command from the original source, an approved source, and an unrelated namespace or network. The unapproved source should time out or be rejected at the intended layer. The approved path should remain healthy and require application authentication where applicable.

Retain flow logs showing the enforcing rule and target. Add a continuous check for public node addresses and NodePort firewall rules, because a clean scan today does not prevent later infrastructure drift.

## Conclusion

Unexpected NodePort reachability usually comes from an incorrect assumption about a route, source address, firewall attachment, load balancer, or dataplane-not from NodePort secretly being private. Confirm the exact port, trace each translation layer, remediate the owner of exposure, and validate from both denied and allowed zones.

## Official References

- [Kubernetes Service and NodePort behavior](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport)
- [Kubernetes virtual IPs and service proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes NetworkPolicy behavior](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [kube-hunter port discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/ports.py)
- [Kubernetes ports and protocols](https://kubernetes.io/docs/reference/networking/ports-and-protocols/)
