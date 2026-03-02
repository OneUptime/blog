# How to Configure VLANs with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, VLAN, Configuration

Description: Configure VLAN interfaces on Ubuntu using Netplan, with examples for single and multiple VLANs, VLAN trunking, and combining VLANs with bonding.

---

VLANs (Virtual Local Area Networks) let you segment network traffic over the same physical infrastructure by tagging Ethernet frames with an ID (1-4094). On Ubuntu servers, you create virtual VLAN interfaces that handle the tagging automatically - your applications just talk to the VLAN interface and the kernel handles the 802.1Q tag insertion and stripping.

This is standard in data center environments where a single trunk link carries traffic for multiple networks - management, storage, application traffic, and so on.

## Prerequisites

Your switch port must be configured as a trunk (802.1Q) port that passes the VLAN tags through to the server. If the port is configured as an access port, VLAN tagging at the server level will not work.

```bash
# Load the 8021q kernel module for VLAN support
sudo modprobe 8021q

# Make it persistent across reboots
echo "8021q" | sudo tee /etc/modules-load.d/8021q.conf

# Verify it loaded
lsmod | grep 8021q
```

## Basic VLAN Configuration

Here is a server connected via trunk port carrying VLAN 10 (management) and VLAN 20 (data):

```yaml
# /etc/netplan/01-vlans.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # The parent interface - no IP address, just carries trunk traffic
    enp3s0:
      dhcp4: false
  vlans:
    # VLAN 10 - management network
    enp3s0.10:          # conventional name: parent_interface.vlan_id
      id: 10
      link: enp3s0      # parent interface
      dhcp4: false
      addresses:
        - 192.168.10.100/24
      routes:
        - to: default   # management VLAN provides the default gateway
          via: 192.168.10.1
      nameservers:
        addresses:
          - 192.168.10.1
    # VLAN 20 - data/application network
    enp3s0.20:
      id: 20
      link: enp3s0
      dhcp4: false
      addresses:
        - 10.20.0.50/24
      # No default route here - only one default route needed
```

Apply and verify:

```bash
sudo netplan apply

# Check that VLAN interfaces were created
ip link show type vlan

# Verify IP addresses
ip addr show enp3s0.10
ip addr show enp3s0.20
```

## VLAN Interface Naming

The naming convention `enp3s0.10` is just a convention - Netplan lets you use any name you want:

```yaml
vlans:
  mgmt:          # friendly name instead of enp3s0.10
    id: 10
    link: enp3s0
    dhcp4: false
    addresses:
      - 192.168.10.100/24
  data:
    id: 20
    link: enp3s0
    dhcp4: false
    addresses:
      - 10.20.0.50/24
```

Using friendly names like `mgmt` and `data` can make the configuration more readable, but the numeric naming makes it obvious which VLAN ID is in use.

## Multiple VLANs with DHCP

If your DHCP server handles different subnets per VLAN (common in enterprise environments):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
  vlans:
    enp3s0.10:
      id: 10
      link: enp3s0
      dhcp4: true           # get address via DHCP on VLAN 10
      dhcp4-overrides:
        route-metric: 100   # primary default route
    enp3s0.20:
      id: 20
      link: enp3s0
      dhcp4: true           # get address via DHCP on VLAN 20
      dhcp4-overrides:
        route-metric: 200   # secondary, only used if VLAN 10 fails
        use-routes: false   # do not add another default route
```

## VLANs on a Bond Interface

In production, VLANs often ride on top of a bonded interface for redundancy:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: 802.3ad
        mii-monitor-interval: 100
        lacp-rate: fast
  vlans:
    bond0.10:
      id: 10
      link: bond0           # parent is the bond, not physical interface
      dhcp4: false
      addresses:
        - 192.168.10.100/24
      routes:
        - to: default
          via: 192.168.10.1
    bond0.20:
      id: 20
      link: bond0
      dhcp4: false
      addresses:
        - 10.20.0.50/24
    bond0.30:
      id: 30
      link: bond0
      dhcp4: false
      addresses:
        - 10.30.0.50/24
```

This is the most common pattern in rack servers: two physical interfaces bonded with LACP, with multiple VLANs on top.

## Verifying VLAN Configuration

```bash
# List all VLAN interfaces
ip link show type vlan

# Show VLAN details including ID and parent
cat /proc/net/vlan/config

# Check if VLAN tags are being sent/received
ip -s link show enp3s0.10

# Capture tagged traffic to verify tags are present
sudo tcpdump -i enp3s0 -e vlan

# Check routing for each VLAN
ip route show table main
```

## Troubleshooting VLAN Issues

**VLAN interface exists but no connectivity:**

```bash
# Verify the parent interface is up
ip link show enp3s0

# Check the VLAN interface is up
ip link show enp3s0.10

# Verify the IP is assigned
ip addr show enp3s0.10

# Test if frames are getting tagged and reaching the switch
# Capture on the parent interface and look for VLAN-tagged frames
sudo tcpdump -i enp3s0 -nn -e | grep -i vlan

# Try to ping the gateway
ping -I enp3s0.10 192.168.10.1
```

**No response from gateway:**

The switch port configuration is usually the culprit. Verify:
1. The switch port is configured as a trunk (not access mode)
2. The VLAN is allowed on the trunk port
3. The VLAN exists in the switch's VLAN database

For Cisco switches:
```
show interfaces GigabitEthernet0/1 trunk
show vlan brief
```

**Wrong VLAN getting default traffic:**

Check the routing table and route metrics:

```bash
ip route show
# Look for multiple default routes and their metrics
# The one with the lowest metric wins

# Or check which route a specific destination would use
ip route get 8.8.8.8
```

## VLAN with Static and DHCP Mix

Some servers need one VLAN managed by DHCP and others with static addresses:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
  vlans:
    enp3s0.10:
      id: 10
      link: enp3s0
      dhcp4: true           # management VLAN uses DHCP
    enp3s0.20:
      id: 20
      link: enp3s0
      dhcp4: false          # application VLAN uses static
      addresses:
        - 10.20.0.50/24
    enp3s0.30:
      id: 30
      link: enp3s0
      dhcp4: false          # storage VLAN uses static + jumbo frames
      mtu: 9000
      addresses:
        - 10.30.0.50/24
```

## Removing a VLAN

To remove a VLAN, delete it from the Netplan configuration and apply:

```bash
# Edit the Netplan config and remove the VLAN section
sudo nano /etc/netplan/01-vlans.yaml

# Apply - the interface will be removed
sudo netplan apply

# Verify it's gone
ip link show type vlan
```

VLANs in Netplan are one of the cleaner aspects of the configuration - the YAML structure makes the parent-child relationship between physical interfaces and VLAN interfaces visually obvious. Combined with bonding and the right switch configuration, you can build robust, well-segmented network infrastructure from a single pair of physical links.
