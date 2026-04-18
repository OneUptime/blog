# How to Add a VLAN to a Bridge Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, Bridge, 802.1Q, Networking, Virtualization, KVM

Description: Configure VLAN subinterfaces on a Linux bridge to extend VLAN segments to virtual machines or containers attached to the bridge.

## Introduction

Adding VLANs to a bridge is essential when you need to extend tagged VLAN traffic to virtual machines or containers. There are two approaches: creating a VLAN subinterface on the physical interface and bridging that, or using a VLAN-aware bridge with VLAN filtering. This guide covers both.

## Method 1: VLAN Subinterface Bridged

Create a VLAN subinterface from the physical NIC, then create a bridge and add the VLAN subinterface to it. VMs attached to the bridge get VLAN 100 connectivity:

```bash
modprobe 8021q

# Create VLAN 100 on eth0

ip link add link eth0 name eth0.100 type vlan id 100
ip link set eth0 up
ip link set eth0.100 up

# Create a bridge
ip link add br-vlan100 type bridge
ip link set br-vlan100 up

# Add the VLAN interface to the bridge
ip link set eth0.100 master br-vlan100

# Assign IP to the bridge (for host access to VLAN 100)
ip addr add 192.168.100.1/24 dev br-vlan100
```

## Method 2: VLAN-Aware Bridge with VLAN Filtering

A VLAN-aware bridge can handle multiple VLANs on a single bridge without separate subinterfaces:

```bash
# Create a VLAN-filtering bridge
ip link add br0 type bridge vlan_filtering 1
ip link set br0 up

# Add the trunk interface to the bridge
ip link set eth0 master br0
ip link set eth0 up

# Configure VLANs on the bridge port (eth0)
# Allow VLAN 10 and 20 on the port connected to the trunk (tagged by default)
bridge vlan add dev eth0 vid 10
bridge vlan add dev eth0 vid 20

# For a VM virtual interface (e.g., vnet0) - assign to VLAN 10 (untagged/access)
bridge vlan add dev vnet0 vid 10 untagged pvid

# Assign an IP to VLAN 10 on the bridge for host access
ip link add br0.10 type vlan link br0 id 10
ip addr add 10.10.0.1/24 dev br0.10
ip link set br0.10 up
```

## Verify Bridge VLAN Configuration

```bash
# Show VLAN assignments on bridge ports
bridge vlan show

# Show bridge forwarding table
bridge fdb show br br0

# Check bridge details
ip -d link show br0
```

## KVM VM Networking with Bridge VLANs

When using KVM, attach VMs to the bridge. Each VM's tap interface gets assigned to a VLAN:

```bash
# VM tap interface (vnet0) gets VLAN 10 access
bridge vlan add dev vnet0 vid 10 untagged pvid
bridge vlan del dev vnet0 vid 1  # Remove default VLAN 1
```

## Persistent Configuration with Netplan

```yaml
# /etc/netplan/01-bridge-vlan.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      dhcp4: false

  vlans:
    eth0.100:
      id: 100
      link: eth0

  bridges:
    br-vlan100:
      interfaces: [eth0.100]
      addresses: [192.168.100.1/24]
      parameters:
        stp: false
```

## Conclusion

VLANs on bridges allow you to extend specific VLAN segments to virtual machines or containers. Method 1 (VLAN subinterface on bridge) is simpler but requires a bridge per VLAN. Method 2 (VLAN-aware bridge with filtering) is more scalable, handling multiple VLANs on a single bridge with per-port VLAN assignments.
