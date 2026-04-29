# How to Use a Linux Bridge for KVM Virtual Machine Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, KVM, Network Bridge, Virtualization, Libvirt, Networking, QEMU

Description: Configure a Linux bridge for KVM virtual machines so that VMs get direct access to the physical network with IP addresses on the same subnet as the host.

## Introduction

By default, libvirt commonly uses a NAT-based virtual network (virbr0) which isolates VMs from the physical network. For production environments where VMs need to be directly accessible on the network - with their own IP addresses - a bridge interface connects VM tap interfaces directly to the physical network.

## Prerequisites

- KVM/QEMU and libvirt installed
- Wired Ethernet interface connected to the network
- Root access

## Step 1: Create the Bridge Interface

```bash
# Flush IP from eth0

ip addr flush dev eth0

# Create bridge
ip link add br0 type bridge
ip link set br0 type bridge stp_state 0

# Add eth0 to bridge
ip link set eth0 master br0
ip link set eth0 up
ip link set br0 up

# Assign host IP to bridge
ip addr add 192.168.1.50/24 dev br0
ip route replace default via 192.168.1.1 dev br0
```

## Step 2: Optionally Define the Bridge Network in libvirt

```xml
<!-- /tmp/br0-network.xml -->
<network>
  <name>br0-network</name>
  <forward mode='bridge'/>
  <bridge name='br0'/>
</network>
```

```bash
# Define and start the network
virsh net-define /tmp/br0-network.xml
virsh net-start br0-network
virsh net-autostart br0-network
```

## Step 3: Attach VMs to the Bridge

When creating a new VM with virt-install:

```bash
virt-install \
    --name myvm \
    --memory 2048 \
    --vcpus 2 \
    --disk path=/var/lib/libvirt/images/myvm.qcow2,size=20 \
    --os-variant ubuntu22.04 \
    --network bridge=br0 \
    --graphics none \
    --cdrom /path/to/ubuntu.iso
```

For an existing VM, edit its XML:

```bash
virsh edit myvm

# Change:
# <interface type='network'>
#   <source network='default'/>
# </interface>
# To:
# <interface type='bridge'>
#   <source bridge='br0'/>
#   <model type='virtio'/>
# </interface>
```

## Persistent Bridge with Netplan (Ubuntu)

```yaml
# /etc/netplan/01-kvm-bridge.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  bridges:
    br0:
      interfaces: [eth0]
      addresses: [192.168.1.50/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
      parameters:
        stp: false
```

## Verify VM Connectivity

```bash
# Check bridge has tap interfaces for running VMs
bridge link show

# From inside a VM, verify it got a network IP
# VM should receive DHCP from the physical network or be configured statically
# If the guest has a serial console configured:
virsh console myvm
# ip addr show
```

## Conclusion

KVM bridge networking connects VMs directly to the physical LAN by inserting the tap interfaces as bridge ports alongside the physical interface. The bridge forwards Layer 2 frames between VMs and physical hosts transparently. VMs can then receive DHCP from the real network DHCP server and are accessible from any host on the subnet.
