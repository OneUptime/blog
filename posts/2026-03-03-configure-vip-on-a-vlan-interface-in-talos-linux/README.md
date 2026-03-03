# How to Configure VIP on a VLAN Interface in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VIP, VLAN, Networking, High Availability, Kubernetes

Description: Step-by-step guide to configuring a Virtual IP address on a VLAN-tagged interface in Talos Linux for segmented network environments.

---

In many enterprise and data center environments, network traffic is segmented using VLANs. When running Talos Linux in such environments, you often need to place the Kubernetes API server's Virtual IP (VIP) on a specific VLAN rather than on the untagged default network. Configuring a VIP on a VLAN interface in Talos Linux is supported but requires careful attention to the machine configuration to get it right.

This guide walks through the setup process, common pitfalls, and verification steps.

## Why VIP on a VLAN?

There are several reasons to put your VIP on a VLAN interface:

- **Network segmentation**: Management traffic should be on a dedicated VLAN, separate from application or storage traffic
- **Security**: VLANs provide network isolation, and placing the Kubernetes API endpoint on a management VLAN limits exposure
- **Organizational requirements**: Many IT teams mandate specific VLAN assignments for different types of traffic
- **Multi-tenant environments**: Different clusters or services may use different VLANs for their control plane traffic

## Understanding the Network Layout

A typical setup with VIP on a VLAN looks like this:

- Physical interface: eth0 (trunk port, no IP)
- Management VLAN: eth0.100 (192.168.100.0/24) - where the VIP will live
- Application VLAN: eth0.200 (192.168.200.0/24) - for application traffic
- Storage VLAN: eth0.300 (10.10.0.0/24) - for storage traffic

The VIP will be on the management VLAN (192.168.100.0/24), shared across all control plane nodes.

## Machine Configuration

Here is the machine configuration for a control plane node with VIP on a VLAN:

```yaml
# Control plane node 1 - VIP on VLAN 100
machine:
  network:
    interfaces:
      # Physical trunk interface - no IP address assigned directly
      - interface: eth0
        mtu: 9000    # Jumbo frames if supported
      # Management VLAN - carries the VIP
      - interface: eth0.100
        addresses:
          - 192.168.100.10/24    # Node's own IP on the management VLAN
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.100.1
        vlan:
          vlanId: 100
        vip:
          ip: 192.168.100.50    # Shared VIP address
      # Application VLAN
      - interface: eth0.200
        addresses:
          - 192.168.200.10/24
        vlan:
          vlanId: 200
      # Storage VLAN
      - interface: eth0.300
        addresses:
          - 10.10.0.10/24
        vlan:
          vlanId: 300
    nameservers:
      - 192.168.100.1
```

Repeat this for each control plane node, changing only the node-specific addresses:

```yaml
# Control plane node 2
- interface: eth0.100
  addresses:
    - 192.168.100.11/24    # Different node IP
  vip:
    ip: 192.168.100.50      # Same VIP

# Control plane node 3
- interface: eth0.100
  addresses:
    - 192.168.100.12/24    # Different node IP
  vip:
    ip: 192.168.100.50      # Same VIP
```

## Applying the Configuration

```bash
# Apply to control plane node 1
talosctl -n 192.168.100.10 apply-config --file cp-01.yaml

# Apply to control plane node 2
talosctl -n 192.168.100.11 apply-config --file cp-02.yaml

# Apply to control plane node 3
talosctl -n 192.168.100.12 apply-config --file cp-03.yaml
```

## Verifying the Setup

After applying the configuration, verify that the VLAN interface is up and the VIP is assigned:

```bash
# Check VLAN interfaces are created
talosctl -n 192.168.100.10 get links | grep "eth0\."

# Verify addresses on the VLAN interface
talosctl -n 192.168.100.10 get addresses | grep "192.168.100"

# Find which node currently holds the VIP
for node in 192.168.100.10 192.168.100.11 192.168.100.12; do
  echo -n "Node $node: "
  talosctl -n $node get addresses 2>/dev/null | grep "192.168.100.50" && echo "HAS VIP" || echo "no VIP"
done

# Test API server access through the VIP
curl -sk https://192.168.100.50:6443/healthz
```

## Switch Configuration

The switch ports connected to your Talos nodes must be configured as trunk ports carrying the required VLANs. Here is an example for common switch types:

### Cisco IOS

```text
interface GigabitEthernet0/1
  description Talos-CP-01
  switchport mode trunk
  switchport trunk allowed vlan 100,200,300
  switchport trunk native vlan 999
  spanning-tree portfast trunk
```

### Arista EOS

```text
interface Ethernet1
  description Talos-CP-01
  switchport mode trunk
  switchport trunk allowed vlan 100,200,300
  switchport trunk native vlan 999
  spanning-tree portfast
```

Make sure the native VLAN does not conflict with any of your tagged VLANs. Many administrators use an unused VLAN (like 999) as the native VLAN.

## Using VIP on a Bond+VLAN Setup

In production environments, you often combine bonding with VLANs. Here is how to configure VIP on a VLAN that sits on top of a bond:

```yaml
# Bond + VLAN + VIP configuration
machine:
  network:
    interfaces:
      # Bond interface
      - interface: bond0
        mtu: 9000
        bond:
          mode: 802.3ad
          lacpRate: fast
          hashPolicy: layer3+4
          interfaces:
            - eth0
            - eth1
      # Management VLAN on bond with VIP
      - interface: bond0.100
        addresses:
          - 192.168.100.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.100.1
        vlan:
          vlanId: 100
        vip:
          ip: 192.168.100.50
      # Other VLANs on bond
      - interface: bond0.200
        addresses:
          - 192.168.200.10/24
        vlan:
          vlanId: 200
```

This gives you both link redundancy (through the bond) and network segmentation (through VLANs) with a highly available API server endpoint (through the VIP).

## Kubeconfig Configuration

Make sure your kubeconfig references the VIP address:

```bash
# Generate a kubeconfig using the VIP
talosctl -n 192.168.100.10 kubeconfig --force-context-name my-cluster

# Verify the server endpoint in kubeconfig
kubectl config view | grep server
# Should show: server: https://192.168.100.50:6443
```

If your kubeconfig was generated before configuring the VIP, update it manually:

```bash
# Update the server URL in kubeconfig
kubectl config set-cluster my-cluster --server=https://192.168.100.50:6443
```

## Troubleshooting

### VIP Not Appearing on Any Node

```bash
# Check if the VLAN interface exists
talosctl -n 192.168.100.10 get links | grep "eth0.100"

# Check etcd health (VIP election requires healthy etcd)
talosctl -n 192.168.100.10 service etcd
talosctl -n 192.168.100.10 get etcdmembers

# Check for VIP-related errors in logs
talosctl -n 192.168.100.10 dmesg | grep -i "vip\|arp"
```

### VIP Assigned but Not Reachable

```bash
# Verify the VIP address is actually on the interface
talosctl -n 192.168.100.10 get addresses | grep "192.168.100.50"

# Check that gratuitous ARP was sent
talosctl -n 192.168.100.10 pcap --interface eth0.100 --bpf-filter "arp" --duration 10s -o arp.pcap

# Verify the VLAN is configured correctly on the switch
# From another machine on the same VLAN:
ping 192.168.100.50
arping 192.168.100.50
```

### Failover Not Working on VLAN

If failover works on an untagged interface but not on a VLAN, check:

1. The switch allows the management VLAN on all control plane node ports
2. The VLAN ID matches between the Talos config and the switch config
3. All control plane nodes have the same VIP configuration
4. ARP/NDP traffic is not being filtered on the VLAN

```bash
# Test failover by rebooting the VIP owner
talosctl -n <vip-owner> reboot

# Watch VIP movement
watch -n 1 "for n in 192.168.100.10 192.168.100.11 192.168.100.12; do echo -n \"\$n: \"; talosctl -n \$n get addresses 2>/dev/null | grep 192.168.100.50 || echo 'no VIP'; done"
```

## Best Practices

1. **Dedicated management VLAN**: Put the VIP on a management VLAN that is separate from application traffic. This reduces the blast radius if application traffic causes network congestion.

2. **Consistent VLAN configuration**: Make sure all control plane nodes are on the same VLAN for the VIP. The VIP uses Layer 2 (ARP) for failover, so all participants must be in the same broadcast domain.

3. **Document your VLAN layout**: Keep a clear record of which VLANs are used for what purpose, including VLAN IDs, subnets, and gateway addresses.

4. **Test failover on the VLAN**: After setup, test that VIP failover works correctly on the VLAN interface specifically. Do not assume it works just because it worked on an untagged interface.

5. **MTU consistency**: If you are using jumbo frames, make sure the MTU is set correctly on the physical interface, the VLAN interface, and all intermediate switch ports.

## Conclusion

Configuring a VIP on a VLAN interface in Talos Linux is a natural extension of both the VIP and VLAN features. The key is making sure the VLAN interface is properly configured before adding the VIP on top of it, and ensuring that all control plane nodes share the same VLAN and VIP configuration. With bonding added into the mix, you get a robust setup with link redundancy, network segmentation, and API server high availability all working together. Test your failover on the VLAN interface to verify everything works in your specific network environment.
