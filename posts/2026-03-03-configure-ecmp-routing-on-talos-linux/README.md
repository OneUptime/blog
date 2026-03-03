# How to Configure ECMP Routing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ECMP, Networking, Load Balancing, Routing, Kubernetes, BGP

Description: Learn how to configure Equal-Cost Multi-Path (ECMP) routing on Talos Linux for improved network throughput and redundancy.

---

Equal-Cost Multi-Path (ECMP) routing is a technique where network traffic is distributed across multiple paths of equal cost to a destination. Instead of picking one best path and using only that, ECMP allows the network to use multiple paths simultaneously. This provides both higher aggregate bandwidth and redundancy - if one path fails, traffic automatically flows through the remaining paths.

For Talos Linux clusters, ECMP is particularly valuable when combined with BGP to distribute traffic across multiple nodes serving the same Kubernetes service. This guide covers how to set up ECMP routing on Talos Linux.

## Understanding ECMP

In traditional routing, each destination has a single next-hop. With ECMP, a destination can have multiple next-hops of equal cost:

```
Without ECMP:
Client -> Router -> Node1 (single path)

With ECMP:
Client -> Router -> Node1 (path 1)
                 -> Node2 (path 2)
                 -> Node3 (path 3)
```

The router distributes traffic across all available paths, typically using a hash of the packet headers (source IP, destination IP, protocol, source port, destination port) to ensure that packets belonging to the same flow follow the same path.

## Kernel-Level ECMP Configuration

Talos Linux runs a standard Linux kernel that supports ECMP natively. Configure the relevant kernel parameters through the machine configuration:

```yaml
machine:
  sysctls:
    # Enable IP forwarding (required for routing)
    net.ipv4.ip_forward: "1"

    # ECMP-related settings
    # Use Layer 3+4 hash for ECMP (considers source/dest IP and port)
    net.ipv4.fib_multipath_hash_policy: "1"

    # For IPv6 ECMP
    net.ipv6.conf.all.forwarding: "1"
    net.ipv6.fib_multipath_hash_policy: "1"

    # Increase connection tracking table size for high-traffic environments
    net.netfilter.nf_conntrack_max: "1048576"
```

The `fib_multipath_hash_policy` setting is critical:

- **0** (default): Hash based on Layer 3 (source and destination IP only)
- **1**: Hash based on Layer 3+4 (source/dest IP plus source/dest port)
- **2**: Hash based on Layer 3+4 plus the inner header for encapsulated traffic

Policy 1 is usually the best choice because it distributes traffic more evenly across paths. Policy 0 means all traffic between the same two IPs goes through the same path, regardless of how many different connections there are.

Apply the configuration:

```bash
# Apply the sysctl settings
talosctl apply-config --nodes 192.168.1.10 --file config.yaml

# Verify the settings took effect
talosctl read --nodes 192.168.1.10 /proc/sys/net/ipv4/fib_multipath_hash_policy
```

## ECMP with Multiple Default Gateways

If your Talos nodes have multiple uplinks, you can configure ECMP at the node level:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
            metric: 100
      - interface: eth1
        addresses:
          - 192.168.2.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.2.1
            metric: 100  # Same metric as eth0 route = ECMP
```

When two default routes have the same metric, the Linux kernel treats them as equal-cost paths and distributes traffic across both.

Verify the routing table:

```bash
# Check the routing table
talosctl get routes --nodes 192.168.1.10

# You should see multiple default routes with equal metrics
```

## ECMP with BGP and MetalLB

The most common ECMP scenario in Kubernetes is using BGP to advertise service IPs from multiple nodes. When a router receives the same route from multiple BGP speakers, it can install all paths as ECMP routes.

### MetalLB Configuration for ECMP

```yaml
# Configure MetalLB to advertise from all nodes
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64501
  peerAddress: 192.168.1.1
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: service-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.100.0.0/24
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: ecmp-advert
  namespace: metallb-system
spec:
  ipAddressPools:
    - service-pool
  # No nodeSelectors means all nodes advertise
```

When MetalLB runs on multiple nodes and all nodes advertise the same service IP, the router sees multiple equal-cost paths and distributes traffic using ECMP.

### Router Configuration for ECMP

The router needs to be configured to support multiple paths. Here is a FRRouting example:

```
router bgp 64501
  neighbor k8s peer-group
  neighbor k8s remote-as 64512
  neighbor 192.168.1.10 peer-group k8s
  neighbor 192.168.1.11 peer-group k8s
  neighbor 192.168.1.12 peer-group k8s
  !
  address-family ipv4 unicast
    neighbor k8s activate
    # Enable ECMP with up to 8 paths
    maximum-paths 8
  exit-address-family
```

The `maximum-paths` setting is the key - it tells the router how many equal-cost paths to install for the same prefix.

## ECMP with Cilium

Cilium also supports ECMP when used as the CNI:

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeeringPolicy
metadata:
  name: ecmp-policy
spec:
  nodeSelector:
    matchLabels:
      kubernetes.io/os: linux
  virtualRouters:
    - localASN: 64512
      exportPodCIDR: true
      neighbors:
        - peerAddress: "192.168.1.1/32"
          peerASN: 64501
      serviceSelector:
        matchExpressions:
          - key: io.cilium/bgp-announce
            operator: Exists
```

When Cilium runs on multiple nodes and all nodes peer with the same router, the router receives the same routes from multiple sources, creating ECMP paths.

## Verifying ECMP Is Working

### On Talos Nodes

```bash
# Check if multipath routes are installed
talosctl read --nodes 192.168.1.10 /proc/net/fib_trie

# Verify ECMP hash policy
talosctl read --nodes 192.168.1.10 /proc/sys/net/ipv4/fib_multipath_hash_policy
```

### On the Router

```bash
# Check the routing table for multipath entries
# FRRouting
show ip route 10.100.0.1

# Output should show multiple next-hops:
# B>* 10.100.0.1/32 [20/0] via 192.168.1.10, eth1, weight 1, 00:05:00
#                           via 192.168.1.11, eth1, weight 1, 00:05:00
#                           via 192.168.1.12, eth1, weight 1, 00:05:00
```

### Testing Traffic Distribution

```bash
# From a client machine, generate traffic to the service IP
# and check which nodes receive it

# Use different source ports to trigger different hash buckets
for i in $(seq 1 100); do
  curl -s --local-port $((10000 + i)) http://10.100.0.1/
done

# On each node, check packet counts
talosctl read --nodes 192.168.1.10 /proc/net/dev
talosctl read --nodes 192.168.1.11 /proc/net/dev
talosctl read --nodes 192.168.1.12 /proc/net/dev
```

## ECMP Hash Behavior

Understanding how ECMP distributes traffic is important for debugging:

### Per-Flow Hashing

ECMP uses a hash of packet headers to determine which path to use. All packets in the same flow (same 5-tuple: source IP, dest IP, protocol, source port, dest port) follow the same path. This prevents packet reordering within a flow.

### Hash Polarization

A common issue with ECMP is hash polarization, where traffic is not evenly distributed because the same hash algorithm is used at multiple layers. To mitigate this, use different hash seeds at each layer.

### Resilient Hashing

When a path goes down in standard ECMP, all flows are rehashed, which can disrupt existing connections. Resilient hashing minimizes flow disruption:

```yaml
machine:
  sysctls:
    # Enable resilient ECMP (available in newer kernels)
    net.ipv4.fib_multipath_hash_policy: "1"
```

## Monitoring ECMP Health

Set up monitoring to detect when ECMP paths fail:

```bash
# Check the number of active paths for a prefix
# This can be done from the router side

# Monitor BGP session status
kubectl logs -n metallb-system -l component=speaker | grep "session"

# Check for route withdrawals
kubectl logs -n metallb-system -l component=speaker | grep "withdraw"
```

## Best Practices

1. **Use L3+4 hashing**: Set `fib_multipath_hash_policy` to 1 for better traffic distribution
2. **Monitor path counts**: Alert when the number of ECMP paths drops below expected
3. **Size your pools**: Make sure your IP address pools are large enough for your services
4. **Test failover**: Regularly test what happens when nodes go down to verify ECMP failover
5. **Match router and node settings**: Ensure the router's maximum-paths setting matches or exceeds the number of nodes advertising each route

## Conclusion

ECMP routing on Talos Linux provides true load balancing and redundancy for Kubernetes service traffic. By configuring the right kernel parameters, setting up BGP peering with MetalLB or Cilium, and ensuring your routers support multipath routing, you get a production-grade networking setup that distributes traffic evenly and handles failures gracefully. The key is configuring both sides of the equation - the Talos nodes and the network infrastructure - to work together.
