# How to Create a VLAN Interface with an IPv4 Address on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, VLAN, IPv4, 802.1Q, ip command

Description: Create an 802.1Q VLAN subinterface on a Linux physical interface, assign an IPv4 address, and configure it persistently with Netplan or /etc/network/interfaces.

## Introduction

Linux supports 802.1Q VLAN tagging natively through the kernel's `8021q` module. A VLAN subinterface tags all outgoing frames with a VLAN ID and accepts only frames with that tag, enabling a single physical NIC to participate in multiple VLANs.

## Creating a VLAN Subinterface

```bash
# Create VLAN 10 subinterface on eth0

sudo ip link add link eth0 name eth0.10 type vlan id 10

# Bring it up
sudo ip link set eth0.10 up

# Assign an IP address
sudo ip addr add 192.168.10.1/24 dev eth0.10

# Verify
ip addr show eth0.10
ip -d link show eth0.10   # Shows VLAN ID and parent interface
```

## Creating Multiple VLANs

```bash
# VLAN 10: Engineering subnet
sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip link set eth0.10 up
sudo ip addr add 192.168.10.1/24 dev eth0.10

# VLAN 20: Marketing subnet
sudo ip link add link eth0 name eth0.20 type vlan id 20
sudo ip link set eth0.20 up
sudo ip addr add 192.168.20.1/24 dev eth0.20

# VLAN 30: Management subnet
sudo ip link add link eth0 name eth0.30 type vlan id 30
sudo ip link set eth0.30 up
sudo ip addr add 192.168.30.1/24 dev eth0.30
```

## Verifying VLAN Interfaces

```bash
# List all VLAN interfaces
ip -d link show type vlan

# Confirm tagging is correct
cat /proc/net/vlan/eth0.10
```

## Persistent Configuration with Netplan

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false

  vlans:
    eth0.10:
      id: 10
      link: eth0
      addresses: [192.168.10.1/24]
    eth0.20:
      id: 20
      link: eth0
      addresses: [192.168.20.1/24]
```

```bash
sudo netplan apply
```

## Persistent Configuration with /etc/network/interfaces

```bash
# Install vlan package if not already installed
sudo apt install vlan

# /etc/network/interfaces
auto eth0.10
iface eth0.10 inet static
    address 192.168.10.1
    netmask 255.255.255.0
    vlan-raw-device eth0

auto eth0.20
iface eth0.20 inet static
    address 192.168.20.1
    netmask 255.255.255.0
    vlan-raw-device eth0
```

## Switch Configuration Requirement

The connected switch port must be configured as a **trunk** (802.1Q) to pass VLAN-tagged frames:

```text
! Cisco switch port facing the Linux host
interface GigabitEthernet0/1
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
```

## Removing a VLAN Interface

```bash
# Take down and remove the VLAN subinterface
sudo ip link set eth0.10 down
sudo ip link del eth0.10
```

## Conclusion

Linux VLAN subinterfaces require only the kernel `8021q` module (built into all modern kernels and auto-loaded by `ip link add ... type vlan`) and the `ip link add ... type vlan` command. Ensure the connected switch port is configured as a trunk, and use Netplan or `/etc/network/interfaces` for persistence.
