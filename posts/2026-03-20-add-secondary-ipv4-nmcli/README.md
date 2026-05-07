# How to Add a Secondary IPv4 Address with nmcli - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, nmcli, IPv4, Linux, Network Configuration, NetworkManager

Description: Learn how to add a secondary IPv4 address to a network interface on Linux using the nmcli command-line tool.

---

Adding a secondary IPv4 address to an interface allows a host to be reachable on multiple IP addresses on the same network segment - useful for virtual hosting, failover setups, or running multiple services bound to distinct IPs.

---

## Check Existing Connections

```bash
# List all NetworkManager connections

nmcli connection show

# Show details of a specific connection
nmcli connection show "Wired connection 1"
```

---

## Add a Secondary IPv4 Address

```bash
# Add a secondary static IP to an existing connection
nmcli connection modify "Wired connection 1" \
  +ipv4.addresses "192.168.1.20/24"

# Reactivate the connection to apply the profile change
nmcli connection up "Wired connection 1"
```

The `+` prefix appends to the existing address list rather than replacing it.

---

## Verify the Address Was Added

```bash
# Show addresses on the interface
ip addr show dev <interface-name>

# Or check via nmcli
nmcli connection show "Wired connection 1" | grep ipv4.addresses
```

---

## Add Multiple Secondary Addresses at Once

```bash
nmcli connection modify "Wired connection 1" \
  +ipv4.addresses "192.168.1.21/24" \
  +ipv4.addresses "192.168.1.22/24"

nmcli connection up "Wired connection 1"
```

---

## Remove a Secondary IPv4 Address

```bash
# Use the minus prefix to remove a specific address
nmcli connection modify "Wired connection 1" \
  -ipv4.addresses "192.168.1.20/24"

nmcli connection up "Wired connection 1"
```

---

## Set the Connection Gateway

```bash
# Add an address and set the connection's default gateway
nmcli connection modify "Wired connection 1" \
  +ipv4.addresses "10.0.0.5/24" \
  ipv4.gateway "10.0.0.1"

nmcli connection up "Wired connection 1"
```

`ipv4.gateway` sets the default gateway for the connection profile; it is not a per-address setting.

---

## Summary

Use `nmcli connection modify` with the `+ipv4.addresses` argument to append a secondary IPv4 address to any NetworkManager-managed interface. Reactivate the connection with `nmcli connection up` to apply the profile change. This approach is persistent across reboots and integrates with NetworkManager's connection profiles.
