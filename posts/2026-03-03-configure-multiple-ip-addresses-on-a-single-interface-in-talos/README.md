# How to Configure Multiple IP Addresses on a Single Interface in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, IP Configuration, Kubernetes, Multi-IP

Description: Learn how to assign multiple IP addresses to a single network interface in Talos Linux for flexible service hosting and network design.

---

There are plenty of situations where a single network interface needs more than one IP address. You might need to host multiple services that each require their own IP, run both IPv4 and IPv6, or put a node on multiple subnets without adding physical interfaces. Talos Linux supports multiple addresses per interface through a simple YAML list in the machine configuration.

This post explains how to configure multiple IP addresses on a single interface, covers common use cases, and walks through the details you need to get right.

## Basic Multi-IP Configuration

Adding multiple IP addresses to an interface in Talos is straightforward. Just list them in the `addresses` field:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - 192.168.1.11/24
          - 192.168.1.12/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
```

All three addresses are assigned to `eth0`. The node responds to traffic sent to any of these addresses. The first address in the list is typically used as the source address for outgoing traffic, though the kernel may choose differently depending on routing rules.

## Dual-Stack Configuration (IPv4 and IPv6)

One of the most common reasons to have multiple addresses on an interface is dual-stack networking:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - fd00::10/64
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
          - network: ::/0
            gateway: fd00::1
```

This gives the interface both an IPv4 address and an IPv6 address. Kubernetes can be configured for dual-stack operation with this setup, allowing pods to have both IPv4 and IPv6 addresses.

## Multiple Subnets on One Interface

Sometimes your network design puts multiple subnets on the same physical segment. This is common in environments transitioning between address ranges or where different services use different subnets:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          # Production subnet
          - 10.1.0.10/24
          # Management subnet
          - 10.2.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.1.0.1
          - network: 10.2.0.0/16
            gateway: 10.2.0.1
```

Each subnet gets its own route. The default gateway goes through the production subnet, while management traffic is routed through its own gateway.

## Virtual IP Addresses for High Availability

In high-availability setups, a virtual IP (VIP) address floats between control plane nodes. The VIP is an additional address that moves to whichever node is currently the leader:

```yaml
# Control plane node configuration
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        vip:
          ip: 192.168.1.100
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The `vip` configuration is separate from the regular `addresses` list because it is managed by Talos - the VIP automatically moves to another control plane node if the current holder goes down. The regular address stays permanently assigned.

## Use Case - Load Balancer Integration

Some bare-metal load balancer solutions (like MetalLB in L2 mode) assign additional IP addresses to nodes. While MetalLB handles this through Kubernetes, understanding how multiple IPs work at the machine level helps with troubleshooting:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          # Node's primary address
          - 192.168.1.10/24
          # Additional addresses for services (if manually managed)
          - 192.168.1.200/24
          - 192.168.1.201/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

In practice, MetalLB manages the service IPs dynamically, but if you need static external IPs on the node, you can add them this way.

## Applying the Configuration

For new clusters, include the multi-IP configuration in your patches:

```bash
# Create a patch with multiple addresses
cat > multi-ip-patch.yaml << 'EOF'
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - 192.168.1.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
EOF

talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @multi-ip-patch.yaml
```

For existing nodes:

```bash
# Add an address to a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "addresses": ["192.168.1.10/24", "192.168.1.11/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

Remember that the `addresses` field is a list, and patches replace lists entirely. Include all addresses you want the interface to have, not just the new one.

## Verifying Multiple Addresses

Check that all addresses are assigned:

```bash
# View all addresses on the node
talosctl get addresses --nodes 192.168.1.10

# Test reachability of each address
ping 192.168.1.10
ping 192.168.1.11
ping 192.168.1.12
```

You should see each address listed with its associated interface.

## Routing with Multiple Addresses

When a node has multiple addresses, outgoing traffic uses the source address based on the routing table. The kernel picks the address that best matches the destination route. You can influence this with specific routes:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.1.0.10/24
          - 10.2.0.10/24
        routes:
          # Default route uses the first subnet
          - network: 0.0.0.0/0
            gateway: 10.1.0.1
          # Traffic to the 10.2.0.0/16 range uses the second subnet
          - network: 10.2.0.0/16
            gateway: 10.2.0.1
```

## Multiple Addresses Across Multiple Interfaces

If you have multiple physical interfaces, you can assign multiple addresses to each:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - 192.168.1.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      - interface: eth1
        addresses:
          - 10.0.0.10/24
          - 10.0.0.11/24
        routes:
          - network: 10.0.0.0/8
            gateway: 10.0.0.1
```

## Kubernetes Node Addresses

Kubernetes uses the node's primary IP for its internal communications. When you have multiple addresses, kubelet picks one as the "node IP." You can explicitly set which address Kubernetes should use:

```yaml
machine:
  kubelet:
    extraArgs:
      node-ip: "192.168.1.10"
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - 10.0.0.10/24
```

The `node-ip` kubelet argument tells Kubernetes to use `192.168.1.10` as the node's address, regardless of what other addresses are configured.

## Common Pitfalls

**Forgetting the CIDR notation** - Every address needs a subnet mask in CIDR format. Writing `192.168.1.10` without `/24` will cause errors.

**Conflicting addresses** - Do not assign the same IP to multiple interfaces on the same node. This causes routing confusion and unpredictable behavior.

**Missing routes** - If you add addresses from multiple subnets, make sure you have routes for each subnet. Without routes, traffic destined for a subnet may go out the wrong interface or default route.

**ARP issues** - When multiple addresses are on the same subnet, ARP can sometimes respond on the wrong interface. This is usually not an issue with a single interface, but be aware of it with multiple interfaces on the same subnet.

## Removing an Address

To remove an address from an interface, update the configuration to exclude it:

```bash
# Update the addresses list without the one you want to remove
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "addresses": ["192.168.1.10/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

This replaces the entire addresses list with just the one address you want to keep.

## Conclusion

Configuring multiple IP addresses on a single interface in Talos Linux is as simple as adding entries to the addresses list. Whether you need dual-stack networking, multiple subnets on one physical link, or additional IPs for services, the configuration is clean and declarative. Pay attention to routing when mixing addresses from different subnets, and explicitly set the Kubernetes node IP when you have multiple addresses to avoid ambiguity. As with all Talos network changes, verify the configuration after applying and keep out-of-band access available in case something goes wrong.
