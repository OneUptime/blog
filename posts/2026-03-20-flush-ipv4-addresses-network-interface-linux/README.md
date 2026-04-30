# How to Flush All IPv4 Addresses from a Network Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, ip command, Network Configuration

Description: Remove all IPv4 addresses from a Linux network interface using ip addr flush, and understand when flushing is needed versus deleting individual addresses.

## Introduction

Flushing all IPv4 addresses from an interface at once is faster than deleting them one by one. It is commonly used during network reconfiguration, when switching from DHCP to static (or vice versa), or when cleaning up after a failed dhclient run.

## Flush All IPv4 Addresses from an Interface

```bash
# Remove all IPv4 addresses from eth0

sudo ip -4 addr flush dev eth0

# Verify the interface is now address-free
ip -4 addr show dev eth0
# Should show no inet lines
```

## Flush All Addresses (Including IPv6)

```bash
# Remove all addresses (IPv4 and IPv6) from eth0
sudo ip addr flush dev eth0
```

## Flush by Scope

Addresses have a scope (global, link, host). Flush only global addresses to preserve link-local:

```bash
# Remove only globally-scoped IPv4 addresses
sudo ip -4 addr flush dev eth0 scope global
```

## Flush by Label

If addresses were assigned with labels:

```bash
# Remove all addresses with the label eth0:web
sudo ip -4 addr flush dev eth0 label eth0:web
```

## What Happens After a Flush

- Kernel-generated connected routes for the removed subnets disappear
- Manually added routes, such as a default route, may need to be removed separately
- The interface remains UP (link state is not affected)

```bash
# Confirm routes are also removed
ip route show
# Kernel-generated connected routes for the flushed subnet should be gone
```

## Re-Assigning After a Flush

```bash
# Flush and immediately assign a new static address
sudo ip -4 addr flush dev eth0
sudo ip addr add 192.168.2.100/24 dev eth0
sudo ip route add default via 192.168.2.1 dev eth0
```

## Flush During DHCP Reconfiguration

```bash
# Stop dhclient, flush, then restart with new settings
sudo dhclient -r eth0         # Release and stop dhclient
sudo ip -4 addr flush dev eth0 # Clean up any residual addresses
sudo dhclient -v eth0         # Request a fresh lease
```

## Flushing All Interfaces

```bash
# Flush all IPv4 addresses from ALL interfaces (extreme caution)
ip -o -4 addr show | awk '{print $2}' | sort -u | grep -Fxv lo | while read -r iface; do
    sudo ip -4 addr flush dev "$iface"
    echo "Flushed $iface"
done
```

**Warning:** This will break all connectivity immediately.

## Conclusion

`ip -4 addr flush dev <interface>` is the clean way to remove all IPv4 addresses from an interface. Unlike deleting individual addresses, it handles all secondaries and labels in one command. Kernel-generated connected routes for the removed addresses are cleaned up automatically.
