# How to Use Talos Linux with Layer 2 Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Layer 2, Networking, VLAN, Bare Metal, Kubernetes

Description: Guide to deploying and operating Talos Linux in Layer 2 network environments including VLANs, bonding, bridging, and ARP-based service discovery.

---

Layer 2 networking is fundamental in bare metal Talos Linux deployments. Unlike cloud environments where networking is abstracted away, running Talos on bare metal means you need to deal with VLANs, bonded interfaces, ARP, MAC addresses, and broadcast domains directly. Getting Layer 2 right is critical because it forms the foundation on which everything else - IP addressing, routing, Kubernetes networking, and load balancing - is built.

This guide covers how to effectively use Talos Linux in Layer 2 network environments, including practical configuration examples for common scenarios.

## Layer 2 Fundamentals in Talos Linux

Talos Linux handles Layer 2 networking through its networkd service, which configures interfaces, bonds, VLANs, and bridges based on the machine configuration. Since Talos is immutable, all network configuration is declarative and applied at boot time or when the config is updated.

Key Layer 2 features supported by Talos include:

- Physical interface configuration (addresses, routes, MTU, and link state)
- Interface bonding (LACP, active-backup, etc.)
- VLAN tagging (802.1Q)
- Bridge interfaces
- Virtual IP addresses with Layer 2 advertisement

## Configuring Physical Interfaces

Start with the basics. Each physical interface needs to be configured in the machine config:

```yaml
# Basic physical interface configuration
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - gateway: 192.168.1.1
mtu: 9000    # Jumbo frames if your switches support it
```

To find out what interfaces are available on a node:

```bash
# List all network links
talosctl -n <node-ip> get links

# Get detailed info about a specific interface
talosctl -n <node-ip> get links eth0 -o yaml

# Check link status (carrier detect, speed, duplex)
talosctl -n <node-ip> get links -o yaml | grep -E "name:|carrier:|speed:|duplex:"
```

## Setting Up VLANs

VLANs are essential in environments where you need to separate traffic types. Talos supports 802.1Q VLAN tagging natively:

```yaml
# VLAN configuration
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
mtu: 9000
---
# Management VLAN
apiVersion: v1alpha1
kind: VLANConfig
name: eth0.100
parent: eth0
vlanID: 100
addresses:
  - address: 10.100.0.10/24
routes:
  - gateway: 10.100.0.1
---
# Storage VLAN
apiVersion: v1alpha1
kind: VLANConfig
name: eth0.200
parent: eth0
vlanID: 200
addresses:
  - address: 10.200.0.10/24
---
# Pod network VLAN
apiVersion: v1alpha1
kind: VLANConfig
name: eth0.300
parent: eth0
vlanID: 300
addresses:
  - address: 10.300.0.10/24
```

Make sure your physical switch ports are configured as trunks carrying the appropriate VLANs. A common mistake is having the switch port in access mode when the Talos node expects trunk mode.

```bash
# Verify VLAN interfaces are created
talosctl -n <node-ip> get links | grep "eth0\."

# Check VLAN interface addresses
talosctl -n <node-ip> get addresses | grep "eth0\."
```

## Configuring Interface Bonding

For redundancy and throughput, bond multiple physical interfaces together:

```yaml
# LACP bond configuration
apiVersion: v1alpha1
kind: BondConfig
name: bond0
links:
  - eth0
  - eth1
bondMode: 802.3ad       # LACP
lacpRate: fast
xmitHashPolicy: layer3+4
miimon: 100
updelay: 200
downdelay: 200
addresses:
  - address: 192.168.1.10/24
routes:
  - gateway: 192.168.1.1
```

Different bond modes for different scenarios:

```yaml
# Active-backup for simple redundancy (no switch configuration needed)
apiVersion: v1alpha1
kind: BondConfig
name: bond0
links:
  - eth0
  - eth1
bondMode: active-backup
primaryReselect: always
---
# Balance-XOR for load distribution
apiVersion: v1alpha1
kind: BondConfig
name: bond0
links:
  - eth0
  - eth1
bondMode: balance-xor
xmitHashPolicy: layer3+4
```

Verify the bond is working:

```bash
# Check bond interface status
talosctl -n <node-ip> get links bond0 -o yaml

# Verify member interfaces
talosctl -n <node-ip> get links -o yaml | grep -A 5 "bond0\|eth0\|eth1"
```

## Combining Bonds with VLANs

A common production setup uses bonded interfaces with VLANs on top:

```yaml
# Bond + VLAN configuration
apiVersion: v1alpha1
kind: BondConfig
name: bond0
mtu: 9000
links:
  - eth0
  - eth1
bondMode: 802.3ad
lacpRate: fast
xmitHashPolicy: layer3+4
---
# Management VLAN on bond
apiVersion: v1alpha1
kind: VLANConfig
name: bond0.100
parent: bond0
vlanID: 100
addresses:
  - address: 10.100.0.10/24
routes:
  - gateway: 10.100.0.1
---
# Storage VLAN on bond
apiVersion: v1alpha1
kind: VLANConfig
name: bond0.200
parent: bond0
vlanID: 200
addresses:
  - address: 10.200.0.10/24
```

## Layer 2 Load Balancing with MetalLB

In bare metal environments, MetalLB's Layer 2 mode is the simplest way to expose Kubernetes services with external IP addresses. MetalLB responds to ARP requests for IPv4 service IPs and NDP requests for IPv6 service IPs. In Layer 2 mode, one elected node receives traffic for a service IP, and kube-proxy then forwards traffic to the service's pods:

```yaml
# MetalLB L2 advertisement configuration
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
  interfaces:
    - eth0    # Advertise on this interface
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250    # Range of IPs for services
```

## Virtual IP (VIP) on Layer 2

Talos Linux supports a built-in Virtual IP feature that uses Layer 2 (gratuitous ARP) for failover on control plane nodes:

```yaml
# VIP configuration for control plane
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
---
apiVersion: v1alpha1
kind: Layer2VIPConfig
name: 192.168.1.100    # Shared VIP among control plane nodes
link: eth0
```

The VIP uses gratuitous ARP announcements to move the virtual IP between control plane nodes during failover. This only works within a single Layer 2 broadcast domain - the VIP and the node's primary address must be on the same subnet. Talos uses etcd elections for VIP ownership, so the VIP comes up only after etcd is available.

## Troubleshooting Layer 2 Issues

### ARP Not Resolving

If you cannot reach a node even though the IP configuration looks correct, check ARP:

```bash
# Check ARP/neighbor entries
talosctl -n <node-ip> get neighbors

# Look for ARP-related kernel messages
talosctl -n <node-ip> dmesg | grep -i "arp\|neigh"

# Capture ARP traffic
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "$(tcpdump -dd -y EN10MB 'arp')" --duration 30s -o arp.pcap
```

### VLAN Traffic Not Getting Through

```bash
# Verify VLAN interface exists and has correct ID
talosctl -n <node-ip> get links -o yaml | grep -A 10 "vlan"

# Check the parent interface is up
talosctl -n <node-ip> get links eth0 -o yaml | grep -i "state\|carrier"

# Capture tagged traffic
talosctl -n <node-ip> pcap --interface eth0 --bpf-filter "$(tcpdump -dd -y EN10MB 'vlan')" --duration 10s -o vlan.pcap
```

### Bond Failover Not Working

```bash
# Check bond member status
talosctl -n <node-ip> get links -o yaml | grep -B 2 -A 10 "bond"

# Verify LACP negotiation (for 802.3ad mode)
talosctl -n <node-ip> dmesg | grep -i "lacp\|bond"

# Simulate a failover by checking if traffic shifts when one link goes down
```

## Best Practices for Layer 2 in Talos Linux

1. **Use jumbo frames consistently**: If you enable jumbo frames (MTU 9000) on your Talos nodes, make sure every switch and device in the path also supports them. A single device with a lower MTU will cause packet fragmentation or drops.

2. **Match switch configuration**: Talos node and switch port configurations must agree on VLAN mode (access vs trunk), LACP parameters, and speed/duplex settings.

3. **Keep broadcast domains small**: Large Layer 2 domains with hundreds of nodes lead to ARP storms and broadcast traffic overhead. Use VLANs to segment your network.

4. **Document your VLAN assignments**: Keep a clear mapping of VLAN IDs to purposes (management, storage, pod network, etc.) so that anyone working on the infrastructure knows what goes where.

5. **Test failover regularly**: If you are using bonds or VIPs, test failover periodically to make sure it actually works. Do not wait for a real failure to discover your redundancy is broken.

## Conclusion

Layer 2 networking in Talos Linux is flexible enough to handle everything from simple single-interface setups to complex bond-plus-VLAN configurations. The declarative configuration model means your entire network setup is reproducible and version-controlled, which is a significant advantage over manually configuring switches and servers. Get your Layer 2 foundation right, and everything else - IP addressing, routing, Kubernetes networking, and load balancing - will be much easier to build on top of.
