# How to Set Up VLANs with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VLANs, Netplan, Networking, Network Segmentation

Description: Configure IEEE 802.1Q VLANs on Ubuntu using Netplan, including tagged trunk interfaces, multiple VLANs, DHCP on VLANs, and bridge integration.

---

VLANs (Virtual LANs) segment a physical network into multiple isolated logical networks without requiring separate physical infrastructure. On Ubuntu, Netplan makes VLAN configuration straightforward with native support for VLAN subinterfaces following the IEEE 802.1Q standard.

## How VLANs Work on Linux

Linux VLAN support is provided by the `8021q` kernel module. When you create a VLAN interface (e.g., `eth0.100`), the kernel:

1. Listens on the physical interface for frames tagged with the specified VLAN ID
2. Strips the VLAN tag and passes the frame to the VLAN interface
3. Adds the VLAN tag to outgoing frames before sending them on the physical interface

The physical interface carries multiple tagged VLANs as a trunk. The VLAN interfaces appear as separate network interfaces to the operating system.

## Prerequisites

Make sure the 8021q module is loaded:

```bash
# Load the VLAN module
sudo modprobe 8021q

# Verify it's loaded
lsmod | grep 8021q

# Make it load at boot
echo "8021q" | sudo tee -a /etc/modules
```

On Ubuntu 20.04+, the module loads automatically when a VLAN interface is created, so this step may be optional.

## Basic VLAN Configuration in Netplan

The Netplan configuration for VLANs uses the `vlans` section:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # The physical (trunk) interface
    eth0:
      dhcp4: false        # No IP on the trunk interface itself
      # The physical interface carries tagged traffic - no address needed
  vlans:
    # VLAN 100 - Management network
    eth0.100:
      id: 100             # VLAN ID (1-4094)
      link: eth0          # Physical interface this VLAN rides on
      addresses:
        - 192.168.100.10/24
      routes:
        - to: default
          via: 192.168.100.1
      nameservers:
        addresses: [192.168.100.53]
```

Apply the configuration:

```bash
sudo netplan generate && sudo netplan apply
```

Verify the VLAN interface was created:

```bash
ip link show eth0.100
ip addr show eth0.100
```

## Multiple VLANs on One Interface

A server connected to a trunk port can have multiple VLAN interfaces:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false    # Trunk - no IP directly on eth0

  vlans:
    # VLAN 10 - Management
    eth0.10:
      id: 10
      link: eth0
      addresses: [10.10.0.100/24]
      nameservers:
        addresses: [10.10.0.1]
      routes:
        - to: default
          via: 10.10.0.1

    # VLAN 20 - Application servers
    eth0.20:
      id: 20
      link: eth0
      addresses: [10.20.0.100/24]

    # VLAN 30 - Database network
    eth0.30:
      id: 30
      link: eth0
      addresses: [10.30.0.100/24]

    # VLAN 40 - DMZ
    eth0.40:
      id: 40
      link: eth0
      dhcp4: true     # DHCP on this VLAN
```

Each VLAN interface appears as a separate network interface with its own IP address, routing table entries, and firewall rules.

## VLAN with DHCP

If the VLAN has a DHCP server:

```yaml
vlans:
  eth0.100:
    id: 100
    link: eth0
    dhcp4: true
    dhcp4-overrides:
      # Optional: override DHCP-provided settings
      use-dns: true
      use-routes: true
```

## VLANs on a Bonded Interface

VLANs are commonly deployed on bonded interfaces for redundancy. The VLAN rides on top of the bond:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false

  bonds:
    bond0:
      interfaces: [eth0, eth1]
      dhcp4: false    # Trunk - no IP on bond0 itself
      parameters:
        mode: active-backup
        mii-monitor-interval: 100

  vlans:
    bond0.10:
      id: 10
      link: bond0     # Link to the bond, not physical NIC
      addresses: [10.10.0.100/24]
      routes:
        - to: default
          via: 10.10.0.1

    bond0.20:
      id: 20
      link: bond0
      addresses: [10.20.0.100/24]
```

This gives you both link redundancy (from bonding) and network segmentation (from VLANs).

## VLAN Bridging

For virtualization hosts, bridge VLAN interfaces to make them available to VMs:

```yaml
# /etc/netplan/01-network.yaml
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
      dhcp4: false    # No IP - will be bridged

  bridges:
    br-vlan100:
      # Bridge the VLAN interface
      interfaces: [eth0.100]
      addresses: [192.168.100.1/24]
      parameters:
        stp: false
        forward-delay: 0
```

VMs can then be configured to use `br-vlan100` as their bridge, giving them access to VLAN 100.

## Custom VLAN Interface Names

The default naming convention is `<parent>.<vlanid>` (e.g., `eth0.100`), but you can use any name:

```yaml
vlans:
  mgmt:           # Custom name for VLAN 10
    id: 10
    link: eth0
    addresses: [10.10.0.100/24]

  prod:           # Custom name for VLAN 20
    id: 20
    link: eth0
    addresses: [10.20.0.100/24]
```

The interface name `mgmt` and `prod` are what the OS uses. The VLAN ID is still 10 and 20 respectively.

## Verifying VLAN Configuration

```bash
# List all interfaces including VLANs
ip link show

# Show VLAN interfaces specifically
ip link show type vlan

# Check VLAN details (shows VLAN ID and parent)
ip -d link show eth0.100

# Check addresses on VLAN interfaces
ip addr show eth0.100
ip addr show eth0.20

# Verify routing through VLANs
ip route show
```

Output of `ip -d link show eth0.100`:

```
3: eth0.100@eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 52:54:00:ab:cd:01 brd ff:ff:ff:ff:ff:ff promiscuity 0 minmtu 0 maxmtu 65535
    vlan protocol 802.1Q id 100 <REORDER_HDR> addrgenmode eui64 numtxqueues 1 numrxqueues 1 gso_max_size 65536 gso_max_segs 65535
```

The `vlan protocol 802.1Q id 100` line confirms this is a VLAN 100 interface.

## Switch Configuration Requirements

For VLAN traffic to work, the switch port connected to your Ubuntu server must be configured as a **trunk port**:

- The port should allow (not restrict) the VLAN IDs you configured
- The native VLAN (untagged traffic) should match any untagged configuration on the physical interface
- VLAN IDs must exist on the switch

For Cisco-style switches:

```
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,40,100
```

For Juniper-style switches:

```
set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members [VLAN-10 VLAN-20 VLAN-30]
```

## Testing Connectivity

After setup, test connectivity through each VLAN:

```bash
# Ping the gateway on each VLAN
ping -I eth0.10 10.10.0.1
ping -I eth0.20 10.20.0.1

# Check which VLAN traffic uses for a specific destination
ip route get 10.20.0.50

# Capture tagged traffic on the trunk
sudo tcpdump -i eth0 -e vlan
```

## Troubleshooting

**No connectivity on VLAN interface:** Check that the switch port is configured as trunk with the correct VLAN IDs allowed.

**VLAN interface exists but gets no DHCP address:** The DHCP server must be reachable on that VLAN. Check that the VLAN ID on the switch and in Netplan match, and that a DHCP server is running on that VLAN.

**Interface shows but no traffic passes:** Verify the 8021q module is loaded and the parent interface (eth0) is up.

```bash
# Check parent interface state
ip link show eth0

# Verify 8021q is loaded
lsmod | grep 8021q

# Check for packet drops
ip -s link show eth0.100
```

VLANs are a clean and low-overhead way to segment networks without additional hardware. Combined with Netplan's straightforward configuration syntax, getting multiple isolated networks on a single physical interface is a quick configuration change.
