# How to Set Up MacVLAN Interfaces on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Macvlan, Virtual Interfaces

Description: A practical guide to creating and configuring MacVLAN interfaces on Ubuntu, covering modes, use cases, and persistent configuration with netplan and systemd-networkd.

---

MacVLAN (MAC VLAN) is a Linux network driver that lets you create virtual network interfaces that share a physical network interface but each have their own unique MAC address. From the network switch's perspective, these virtual interfaces look like separate physical machines. This is different from traditional VLANs which tag traffic at layer 2 - MacVLAN creates truly independent interfaces at layer 2.

## What MacVLAN Is Good For

MacVLAN is commonly used to:

- Give containers or VMs IP addresses directly on the physical network without NAT
- Create multiple network identities on a single physical interface
- Assign multiple IPs to a host that each appear as separate network clients to DHCP
- Bridge containers to the physical network for direct layer-2 access

The main limitation: by default, a MacVLAN interface cannot communicate with its parent interface. Traffic from the MacVLAN interface can reach other machines on the network, but not the host the interface is on. This is a kernel design choice related to the MAC address filtering logic.

## MacVLAN Modes

MacVLAN has four modes:

**private** - MacVLAN sub-interfaces can't communicate with each other (even on the same host) or the parent

**vepa** (Virtual Ethernet Port Aggregator) - All traffic is sent to the external switch, which handles forwarding. Sub-interfaces on the same host communicate via the switch.

**bridge** - Sub-interfaces can communicate directly with each other without going to the switch. Most common for container networking.

**passthru** - Only one MacVLAN interface per parent, passes all traffic including the parent MAC. Used for hardware acceleration.

For most use cases, `bridge` mode is what you want.

## Creating a MacVLAN Interface Manually

```bash
# Create a MacVLAN interface in bridge mode

# Parent interface: eth0, new interface: macvlan0
sudo ip link add macvlan0 link eth0 type macvlan mode bridge

# Assign an IP address
sudo ip addr add 192.168.1.150/24 dev macvlan0

# Bring it up
sudo ip link set macvlan0 up

# Add a default route if needed
sudo ip route add default via 192.168.1.1 dev macvlan0

# Verify
ip link show macvlan0
ip addr show macvlan0
```

Check that the new interface has a different MAC than the parent:

```bash
# Compare MAC addresses
ip link show eth0 | grep link/ether
ip link show macvlan0 | grep link/ether
```

They will be different. The kernel generates a unique MAC for each MacVLAN interface.

## Creating Multiple MacVLAN Interfaces

```bash
# You can create several MacVLAN interfaces on the same parent
sudo ip link add macvlan0 link eth0 type macvlan mode bridge
sudo ip link add macvlan1 link eth0 type macvlan mode bridge
sudo ip link add macvlan2 link eth0 type macvlan mode bridge

# Each gets its own IP
sudo ip addr add 192.168.1.150/24 dev macvlan0
sudo ip addr add 192.168.1.151/24 dev macvlan1
sudo ip addr add 192.168.1.152/24 dev macvlan2

# Bring them all up
sudo ip link set macvlan0 up
sudo ip link set macvlan1 up
sudo ip link set macvlan2 up
```

## Persistent Configuration with Netplan

Netplan does not currently expose MacVLAN as a top-level device type (the supported device types are `ethernets`, `bonds`, `bridges`, `dummy-devices`, `modems`, `tunnels`, `virtual-ethernets`, `vlans`, `vrfs`, `wifis`, and `nm-devices`). On Ubuntu systems that use netplan with the `networkd` renderer, drop a systemd-networkd `.netdev` and `.network` snippet alongside your netplan-generated configuration as shown in the next section - netplan will leave non-netplan-managed networkd units in place.

## Persistent Configuration with systemd-networkd

If you prefer systemd-networkd directly, create two files:

```bash
# Create the MacVLAN netdev file
sudo tee /etc/systemd/network/30-macvlan0.netdev << 'EOF'
[NetDev]
Name=macvlan0
Kind=macvlan

[MACVLAN]
Mode=bridge
EOF

# Create the network file for the MacVLAN interface
sudo tee /etc/systemd/network/40-macvlan0.network << 'EOF'
[Match]
Name=macvlan0

[Network]
Address=192.168.1.150/24
Gateway=192.168.1.1
DNS=8.8.8.8

[Link]
RequiredForOnline=yes
EOF

# Also configure the parent interface to have the MacVLAN attached
sudo tee /etc/systemd/network/20-eth0.network << 'EOF'
[Match]
Name=eth0

[Network]
MACVLAN=macvlan0
EOF

# Restart networkd to apply
sudo systemctl restart systemd-networkd

# Check status
networkctl status macvlan0
```

## Using MacVLAN with DHCP

If you want the MacVLAN interface to get its IP from DHCP (it will get a different IP than the parent since it has a different MAC), use a systemd-networkd `.network` file with `DHCP=yes` instead of a static `Address=`:

```ini
# /etc/systemd/network/40-macvlan0.network
[Match]
Name=macvlan0

[Network]
DHCP=yes
```

The `.netdev` file and the parent-interface `MACVLAN=` snippet from the previous section are still required. Each MacVLAN interface with DHCP will get its own IP from the DHCP server because it presents a unique MAC address.

## The Host-to-MacVLAN Communication Problem

As mentioned, MacVLAN interfaces can't communicate with the parent interface by default. This is frustrating if you want the host to communicate with services running on the MacVLAN IP.

The standard workaround is to create a second MacVLAN interface on the host (a "shim") that shares the same parent. Because both children sit on the same MacVLAN bridge, they can talk to each other even though neither can talk to the parent directly. Then route the target MacVLAN IPs through the shim:

```bash
# Create a host-side MacVLAN that shares the same parent
sudo ip link add macvlan-shim link eth0 type macvlan mode bridge

# Give the shim its own IP in the same subnet (a /32 avoids overlapping the eth0 subnet route)
sudo ip addr add 192.168.1.250/32 dev macvlan-shim
sudo ip link set macvlan-shim up

# Route traffic destined for the other MacVLAN IP through the shim
sudo ip route add 192.168.1.150/32 dev macvlan-shim
```

Alternatively, use `ipvlan` in L2 mode instead, which doesn't have this restriction (covered separately).

## Testing the MacVLAN Setup

```bash
# Verify interface is up and has the right MAC
ip link show macvlan0

# Verify IP is assigned
ip addr show macvlan0

# Test external connectivity
ping -I macvlan0 8.8.8.8

# Check that it appears as a separate host to the network
# From another machine on the network, arp -n should show both IPs
# with different MACs

# Verify routing
ip route show dev macvlan0

# Check if DHCP got a lease (if using DHCP mode)
journalctl -u systemd-networkd | grep macvlan0
```

## Removing MacVLAN Interfaces

```bash
# Take down and remove a manual MacVLAN
sudo ip link set macvlan0 down
sudo ip link delete macvlan0

# For persistent configs, remove the systemd-networkd files
sudo rm /etc/systemd/network/30-macvlan0.netdev
sudo rm /etc/systemd/network/40-macvlan0.network
sudo systemctl restart systemd-networkd
```

MacVLAN is a clean solution when you need multiple network identities on a single physical interface without the overhead of full virtualization. It's particularly well-suited for container networking scenarios where you want containers to appear as first-class citizens on the physical network.
