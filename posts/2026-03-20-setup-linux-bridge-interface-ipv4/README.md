# How to Set Up a Linux Bridge Interface for IPv4 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Bridge, IPv4, ip command, Virtualization

Description: Create a Linux software bridge, add physical interfaces as bridge members, assign an IPv4 address to the bridge, and configure it persistently for use with virtual machines or containers.

## Introduction

A Linux bridge acts as a virtual Layer 2 switch, connecting multiple interfaces at the Ethernet level. It is commonly used for virtual machine networking (KVM/QEMU), container networking, and creating network segments that share the same IPv4 subnet.

## Creating a Bridge Interface

```bash
# Create a bridge named br0

sudo ip link add name br0 type bridge

# Bring the bridge up
sudo ip link set br0 up

# Verify
ip link show br0
```

## Adding a Physical Interface to the Bridge

```bash
# First, remove any IP address from the physical interface
# (the bridge will hold the IP instead)
sudo ip addr flush dev eth0

# Add eth0 as a bridge member (slave)
sudo ip link set eth0 master br0
sudo ip link set eth0 up

# Verify the bridge members
ip link show master br0
```

## Assigning an IP Address to the Bridge

```bash
# Assign the IP to the bridge, not the physical interface
sudo ip addr add 192.168.1.100/24 dev br0
sudo ip route replace default via 192.168.1.1 dev br0

# Verify
ip addr show br0
ip route show
```

## Checking Bridge State

```bash
# Show bridge details including member ports and STP state
bridge link show

# Show bridge properties
ip -d link show br0
```

## Making the Bridge Persistent with Netplan

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false

  bridges:
    br0:
      dhcp4: false
      interfaces: [eth0]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
      parameters:
        stp: false
        forward-delay: 0
```

```bash
sudo netplan apply
```

## Making the Bridge Persistent with /etc/network/interfaces (Debian)

```bash
# Install bridge-utils
sudo apt install bridge-utils

# /etc/network/interfaces
auto br0
iface br0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0
```

## Connecting a VM to the Bridge

When creating a KVM VM, specify `br0` as the network interface:

```bash
# Create a VM connected to br0
virt-install --name myvm --memory 1024 --disk size=10 \
  --network bridge=br0 --os-variant ubuntu22.04 --cdrom /path/to/ubuntu.iso
```

The VM can appear on the same subnet as the host and receive a DHCP address from the network's DHCP server if DHCP is available and the guest is configured to use it.

## Conclusion

A Linux bridge lets physical and virtual interfaces share the same Layer 2 domain and IPv4 subnet. Assign the IP address to the bridge, not the member interfaces, and use Netplan or `/etc/network/interfaces` for persistent configuration.
