# How to Bring a Network Interface Up or Down with ip link set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, ip command, Network Interfaces, Network Configuration

Description: Use ip link set to bring a Linux network interface up or down, change its state, and modify link-layer properties such as MTU and MAC address.

## Introduction

The `ip link set` command controls the administrative link state of network interfaces. Bringing an interface up marks it administratively up; whether it can pass traffic depends on carrier and operational state. Taking it down administratively disables the interface. This is essential for applying configuration changes, troubleshooting, and simulating link failures in testing.

## Bringing an Interface Up

```bash
# Bring eth0 up

sudo ip link set eth0 up

# Verify
ip link show eth0
# Look for the UP flag; operational state may still vary depending on carrier
```

## Bringing an Interface Down

```bash
# Take eth0 down (all traffic stops immediately)
sudo ip link set eth0 down

# Verify
ip link show eth0
# The UP flag should be absent; state is typically DOWN
```

## Toggling an Interface (Down + Up)

A common operation to apply changes or reset the link:

```bash
# Bounce the interface
sudo ip link set eth0 down && sudo ip link set eth0 up
```

This administratively resets the interface. Whether it renews DHCP, re-sends multicast membership reports, or renegotiates link depends on the driver and network-management software in use.

## Enabling/Disabling Promiscuous Mode

```bash
# Enable promiscuous mode (receive all frames, used for packet capture)
sudo ip link set eth0 promisc on

# Disable promiscuous mode
sudo ip link set eth0 promisc off
```

## Changing the MTU

```bash
# Set MTU to 9000 for jumbo frames
sudo ip link set eth0 mtu 9000

# Revert to standard Ethernet MTU
sudo ip link set eth0 mtu 1500
```

## Changing the MAC Address

```bash
# Some drivers require taking the interface down before changing the MAC
sudo ip link set eth0 down
sudo ip link set eth0 address 02:00:00:00:00:01
sudo ip link set eth0 up

# Verify
ip link show eth0 | grep "link/ether"
```

## Enabling/Disabling ARP

```bash
# Disable ARP (useful for point-to-point links or tunnel interfaces)
sudo ip link set eth0 arp off

# Re-enable ARP
sudo ip link set eth0 arp on
```

## Checking All Interface States

```bash
# Show state for all interfaces in one view
ip link show | grep -E "^[0-9]+:|state"

# Show only administratively UP interfaces
ip link show up
```

## Applying Changes to Virtual Interfaces

The same commands work for virtual interfaces:

```bash
# Bring up a VLAN subinterface
sudo ip link set eth0.10 up

# Bring down a bond member
sudo ip link set eth1 down
```

## Conclusion

`ip link set <interface> up|down` is the core command for controlling administrative interface state. Combine it with `ip addr`, `ip route`, and `ip link set mtu` to fully manage interface configuration from the command line. Remember to update persistent config files to make changes survive reboots.
