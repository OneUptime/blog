# How to Configure VIP Across Multiple Subnets in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, Subnet, Networking, High Availability, Kubernetes

Description: Understanding the limitations and workarounds for using Talos Linux VIP when control plane nodes are spread across different network subnets.

---

One of the most common questions about Talos Linux VIP is whether it can work when control plane nodes are on different subnets. The short answer is no - the built-in VIP mechanism relies on Layer 2 (gratuitous ARP), which only works within a single broadcast domain. But that does not mean you are stuck without options. There are several approaches to achieving API server high availability when your control plane nodes span multiple subnets.

This guide explains why VIP has subnet limitations and presents practical alternatives for multi-subnet environments.

## Why VIP Requires a Single Subnet

Talos Linux VIP works by assigning a shared IP address to one control plane node at a time. When the owning node needs to announce this to the network, it sends a gratuitous ARP packet. This packet says "the IP address 192.168.1.100 is now at MAC address AA:BB:CC:DD:EE:FF."

The problem is that ARP operates at Layer 2 (the data link layer). ARP packets are broadcast frames that do not cross router boundaries. A router connecting two subnets will not forward ARP broadcasts from one subnet to the other.

```
Subnet A: 192.168.1.0/24          Subnet B: 192.168.2.0/24
+----------+  +----------+         +----------+
| CP Node 1|  | CP Node 2|         | CP Node 3|
| .10      |  | .11      |  [Router]  | .10      |
+----------+  +----------+    |     +----------+
                               |
VIP: 192.168.1.100            ARP cannot cross here
```

In this scenario, if the VIP (192.168.1.100) is on Subnet A and fails over, only devices on Subnet A will learn about the new MAC address. Devices on Subnet B would need to reach the VIP through the router, and the router's ARP cache for 192.168.1.100 might not update correctly.

## What Happens If You Try Anyway

If you configure the same VIP on nodes in different subnets, several things can go wrong:

- The VIP address might not be valid on some nodes' subnets
- Gratuitous ARP announcements will not reach nodes on other subnets
- Traffic from clients on the wrong subnet may be misrouted
- Failover may appear to work on one subnet but not the other

```yaml
# This configuration will NOT work correctly
# Node on 192.168.1.0/24
- interface: eth0
  addresses:
    - 192.168.1.10/24
  vip:
    ip: 192.168.1.100    # VIP on subnet A

# Node on 192.168.2.0/24
- interface: eth0
  addresses:
    - 192.168.2.10/24
  vip:
    ip: 192.168.1.100    # Same VIP - but this node is on subnet B!
```

## Alternative 1: External Load Balancer

The most robust solution for multi-subnet control planes is an external load balancer that sits in front of all control plane nodes:

```
                     Clients
                        |
                  [Load Balancer]
                   VIP: 10.0.0.100
                  /      |       \
            Subnet A   Subnet B   Subnet C
            CP Node 1  CP Node 2  CP Node 3
            .1.10      .2.10      .3.10
```

Options for external load balancers:

### HAProxy

```
# haproxy.cfg
frontend kubernetes-api
    bind *:6443
    mode tcp
    default_backend kubernetes-cp

backend kubernetes-cp
    mode tcp
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.10:6443 check
    server cp2 192.168.2.10:6443 check
    server cp3 192.168.3.10:6443 check
```

### Nginx Stream

```
# nginx.conf
stream {
    upstream kubernetes_api {
        server 192.168.1.10:6443;
        server 192.168.2.10:6443;
        server 192.168.3.10:6443;
    }

    server {
        listen 6443;
        proxy_pass kubernetes_api;
    }
}
```

Configure Talos to use the load balancer as the cluster endpoint:

```yaml
# Machine config pointing to external load balancer
cluster:
  controlPlane:
    endpoint: https://10.0.0.100:6443    # Load balancer VIP
```

## Alternative 2: DNS-Based Load Balancing

Use DNS round-robin to distribute traffic across control plane nodes on different subnets:

```
# DNS records
k8s-api.example.com  A  192.168.1.10
k8s-api.example.com  A  192.168.2.10
k8s-api.example.com  A  192.168.3.10
```

Configure health checks in your DNS server to remove unhealthy nodes:

```yaml
# Machine config using DNS endpoint
cluster:
  controlPlane:
    endpoint: https://k8s-api.example.com:6443
```

DNS-based failover is simpler than a load balancer but has limitations:

- DNS TTL affects failover speed (lower TTL = faster failover but more DNS queries)
- Some clients cache DNS aggressively
- No active health checking unless your DNS provider supports it

## Alternative 3: KubeSpan with VIP

If you enable KubeSpan in Talos Linux, it creates a WireGuard mesh network between all nodes. This effectively puts all nodes on the same virtual Layer 2 network, which could allow VIP to work across physical subnets:

```yaml
# Enable KubeSpan in machine config
machine:
  network:
    kubespan:
      enabled: true
```

With KubeSpan, nodes communicate over WireGuard tunnels regardless of their physical network location. The VIP would be announced on the KubeSpan interface rather than the physical interface. However, this approach has caveats:

- External clients not on the KubeSpan network cannot reach the VIP directly
- You still need another mechanism for external API access
- KubeSpan adds complexity and overhead

## Alternative 4: Move Nodes to the Same Subnet

If possible, the simplest solution is to put all control plane nodes on the same subnet. This might mean:

- Extending a VLAN across your network infrastructure
- Using a dedicated management VLAN that spans all racks or sites
- Moving control plane nodes to a common network segment

```yaml
# All control plane nodes on the same management VLAN
# Node 1 (Rack A)
- interface: eth0.100
  addresses:
    - 10.100.0.10/24
  vlan:
    vlanId: 100
  vip:
    ip: 10.100.0.50

# Node 2 (Rack B)
- interface: eth0.100
  addresses:
    - 10.100.0.11/24
  vlan:
    vlanId: 100
  vip:
    ip: 10.100.0.50

# Node 3 (Rack C)
- interface: eth0.100
  addresses:
    - 10.100.0.12/24
  vlan:
    vlanId: 100
  vip:
    ip: 10.100.0.50
```

As long as VLAN 100 is trunked across all racks, the VIP will work because all nodes share the same broadcast domain.

## Alternative 5: Anycast with BGP

For advanced deployments, you can use BGP anycast. Each control plane node announces the same IP address via BGP, and the network routes traffic to the nearest healthy node:

```
# Each node announces the same /32 route
Node 1 (AS 65000) -> Router: announces 10.0.0.100/32
Node 2 (AS 65000) -> Router: announces 10.0.0.100/32
Node 3 (AS 65000) -> Router: announces 10.0.0.100/32
```

This requires BGP-capable routers and a more sophisticated network setup, but it provides true multi-subnet high availability with fast failover.

You would not use Talos VIP in this case. Instead, each node would have the API server VIP as a loopback address, and BGP would handle the traffic routing:

```yaml
# Loopback address for anycast
machine:
  network:
    interfaces:
      - interface: lo
        addresses:
          - 10.0.0.100/32    # Anycast address
```

## Comparison of Approaches

| Approach | Complexity | Failover Speed | External Access | Best For |
|----------|-----------|---------------|-----------------|----------|
| External LB | Medium | Fast (health checks) | Yes | Production multi-subnet |
| DNS Round Robin | Low | Slow (TTL dependent) | Yes | Simple setups |
| KubeSpan + VIP | Medium | Fast (etcd-based) | Limited | Internal access only |
| Same Subnet (VLAN) | Low | Fast (etcd-based) | Yes | When VLAN spanning is possible |
| BGP Anycast | High | Fast (BGP convergence) | Yes | Large-scale deployments |

## Making the Decision

Choose your approach based on your environment:

- **Small deployment, single site**: Extend a VLAN and use native VIP
- **Multi-site or multi-rack without VLAN spanning**: External load balancer
- **Cloud or edge deployment**: DNS-based load balancing
- **Large-scale with network team support**: BGP anycast

## Conclusion

While Talos Linux's built-in VIP cannot work across different subnets due to the Layer 2 ARP limitation, there are solid alternatives for every scenario. The most practical approach for most organizations is either extending a VLAN to keep control plane nodes on the same broadcast domain or deploying an external load balancer. Both solutions are well-proven and provide the high availability your Kubernetes API server needs. Choose the approach that matches your network infrastructure and operational complexity budget.
