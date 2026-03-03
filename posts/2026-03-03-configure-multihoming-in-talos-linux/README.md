# How to Configure Multihoming in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Multihoming, Networking, Kubernetes, Network Configuration

Description: A practical guide to configuring multihoming in Talos Linux so your nodes can operate across multiple network interfaces and subnets.

---

Multihoming refers to configuring a machine with multiple network interfaces, each connected to a different network or subnet. In Talos Linux, multihoming is useful when you need to separate management traffic from workload traffic, connect nodes to both public and private networks, or isolate storage network traffic. This guide covers the practical steps to get multihoming working correctly in a Talos Linux environment.

## When You Need Multihoming

There are several common scenarios where multihoming makes sense in a Talos Linux cluster. The most frequent one is separating the control plane network from the data plane. You might want the Talos API and etcd traffic on one interface while pod-to-pod traffic flows through a different, higher-bandwidth interface.

Another common case is running storage traffic on a dedicated network. If you are using Ceph, Longhorn, or any distributed storage solution, isolating replication traffic to its own interface prevents it from competing with application traffic.

You might also need multihoming when your nodes sit at the boundary between networks, for example connecting to both an internal management network and a network that provides external access.

## Understanding Network Interface Configuration in Talos

Talos Linux manages network configuration through its machine configuration file. Unlike traditional Linux distributions where you might edit files in `/etc/network/interfaces` or use NetworkManager, Talos handles everything declaratively through its config.

Each network interface is defined under `machine.network.interfaces` in the machine configuration. You can configure static IPs, DHCP, routes, and other parameters for each interface independently.

## Basic Dual-Interface Configuration

Here is a machine configuration snippet that sets up two network interfaces. The first interface handles the primary cluster traffic, while the second handles a dedicated storage network:

```yaml
# Machine configuration with dual network interfaces
machine:
  network:
    interfaces:
      # Primary interface for cluster and API traffic
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
            # This is the default route
            metric: 100
        mtu: 1500

      # Secondary interface for storage network
      - interface: eth1
        dhcp: false
        addresses:
          - 192.168.100.20/24
        routes:
          - network: 192.168.100.0/24
            gateway: 192.168.100.1
            metric: 200
        mtu: 9000  # Jumbo frames for storage traffic
```

The `metric` value on routes determines priority. Lower values mean higher priority, so traffic that does not match a specific route will use the default route on `eth0` (metric 100).

## Configuring DNS for Multihomed Nodes

When you have multiple interfaces, you need to think about which nameservers are reachable from which network. Talos lets you configure nameservers at the machine level:

```yaml
machine:
  network:
    nameservers:
      - 10.0.1.1       # Reachable via eth0
      - 192.168.100.1   # Reachable via eth1 (backup)
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
      - interface: eth1
        dhcp: false
        addresses:
          - 192.168.100.20/24
```

## Setting Up VLAN Interfaces

In many multihoming scenarios, you do not have separate physical interfaces. Instead, you use VLANs to create logical separation on a single physical link. Talos supports VLAN configuration natively:

```yaml
machine:
  network:
    interfaces:
      # Physical interface as a trunk port
      - interface: eth0
        dhcp: false
        vlans:
          # Management VLAN
          - vlanId: 10
            addresses:
              - 10.10.0.20/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.10.0.1
            mtu: 1500

          # Storage VLAN
          - vlanId: 20
            addresses:
              - 10.20.0.20/24
            routes:
              - network: 10.20.0.0/16
                gateway: 10.20.0.1
            mtu: 9000

          # Pod network VLAN
          - vlanId: 30
            addresses:
              - 10.30.0.20/24
            mtu: 1500
```

This creates three logical interfaces on top of one physical interface. Each VLAN can have its own IP address, routes, and MTU settings.

## Bonding with Multihoming

For high availability, you can combine interface bonding with multihoming. This gives you redundant paths on each network:

```yaml
machine:
  network:
    interfaces:
      # Bond for primary network using two physical interfaces
      - interface: bond0
        bond:
          mode: 802.3ad  # LACP
          lacpRate: fast
          interfaces:
            - eth0
            - eth1
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1

      # Bond for storage network using two other physical interfaces
      - interface: bond1
        bond:
          mode: 802.3ad
          lacpRate: fast
          interfaces:
            - eth2
            - eth3
        addresses:
          - 192.168.100.20/24
        routes:
          - network: 192.168.100.0/24
            gateway: 192.168.100.1
        mtu: 9000
```

## Configuring Kubelet for Multihoming

When a node has multiple IPs, Kubernetes needs to know which IP to use for the kubelet. By default, Kubernetes picks the IP associated with the default route, but you can override this:

```yaml
machine:
  kubelet:
    nodeIP:
      validSubnets:
        - 10.0.1.0/24  # Use the primary network for kubelet
```

This tells the kubelet to register with an IP from the 10.0.1.0/24 subnet, ignoring any addresses on the storage network.

## Configuring etcd for Multihoming

Similarly, etcd needs to know which interface to advertise for peer communication. You can configure this with:

```yaml
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24  # etcd should communicate over the primary network
```

This is important because if etcd tries to communicate over the storage network (which might have different firewall rules or higher latency), you could run into cluster stability issues.

## Network Policies for Multihomed Nodes

When running multihomed nodes, you should consider network policies to control traffic flow. Here is an example Kubernetes NetworkPolicy that restricts storage traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-storage-access
  namespace: storage-system
spec:
  podSelector:
    matchLabels:
      app: ceph-osd
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - ipBlock:
            cidr: 192.168.100.0/24
  egress:
    - to:
        - ipBlock:
            cidr: 192.168.100.0/24
```

## Routing Considerations

One of the trickiest parts of multihoming is getting the routing right. Here are some important things to keep in mind.

First, make sure you only have one default route. If both interfaces try to set a default route, traffic behavior becomes unpredictable. Use the `metric` field to prioritize one over the other, or better yet, only configure a default route on the primary interface.

Second, add specific routes for each network. If the storage network needs to reach other subnets, add explicit routes rather than relying on the default route:

```yaml
machine:
  network:
    interfaces:
      - interface: eth1
        addresses:
          - 192.168.100.20/24
        routes:
          # Route to storage network
          - network: 192.168.100.0/24
            gateway: 192.168.100.1
          # Route to backup storage network
          - network: 192.168.200.0/24
            gateway: 192.168.100.1
```

Third, test connectivity from the node after applying configuration. Use `talosctl` to run diagnostics:

```bash
# Check the routing table on a node
talosctl get routes --nodes 10.0.1.20

# Check all configured addresses
talosctl get addresses --nodes 10.0.1.20

# Check interface link status
talosctl get links --nodes 10.0.1.20
```

## Troubleshooting Common Issues

If traffic is not flowing on the secondary interface, check these things in order:

1. Verify the physical link is up with `talosctl get links`
2. Confirm the IP address is assigned with `talosctl get addresses`
3. Check routing with `talosctl get routes` and make sure traffic for the secondary network is routed through the correct interface
4. Look at firewall rules if applicable - Talos has its own firewall configuration that might need to allow traffic on the secondary interface

If nodes can reach each other on the primary network but not the secondary, the problem is almost always routing or firewall related. Double-check that the gateway on the secondary network is reachable and that there are no conflicting routes.

## Conclusion

Multihoming in Talos Linux is a powerful feature that lets you design network architectures that match your operational requirements. The declarative configuration model makes it straightforward to define multiple interfaces, VLANs, and bonds. The key is to be deliberate about routing, DNS resolution, and which interfaces your cluster services use for communication. Start with a simple dual-interface setup, verify everything works, and then add complexity like VLANs and bonding as needed.
