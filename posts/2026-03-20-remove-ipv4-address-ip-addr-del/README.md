# How to Remove an IPv4 Address from an Interface with ip addr del

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, IPv4, Networking

Description: Remove an IPv4 address from a Linux network interface using ip addr del, including removing specific addresses, all addresses, and managing secondary IPs.

## Introduction

`ip addr del` removes an IPv4 address from a network interface. The exact address and prefix length must match what was assigned. This is immediate but not persistent - use persistent network configuration tools for permanent changes. Run these commands as root or with `sudo`.

## Remove an IP Address

```bash
# Remove a specific IP address

ip addr del 192.168.1.100/24 dev eth0

# Verify removal
ip addr show eth0
```

## Remove a Secondary IP Address

```bash
# Show all IPs on the interface first
ip -4 addr show eth0

# Remove only the secondary IP
ip addr del 192.168.1.101/24 dev eth0

# Primary IP remains
ip -4 addr show eth0
```

## Remove a Labeled Address

```bash
# If the address was added with a label
ip addr del 192.168.1.101/24 label eth0:1 dev eth0
```

## Remove All IPv4 Addresses from an Interface

```bash
# Flush all IPv4 addresses from eth0
ip -4 addr flush dev eth0

# Verify
ip -4 addr show eth0
# Should show no inet lines
```

## Remove Host Route IP

```bash
# Remove /32 address from loopback
ip addr del 10.0.0.1/32 dev lo
```

## Verify After Removal

```bash
# Check the address is gone
ip -4 addr show eth0

# Check whether the connected route was also removed
ip route show
# If no other address on eth0 still uses 192.168.1.0/24 and the address was not added with noprefixroute,
# the 192.168.1.0/24 dev eth0 route should be gone
```

## Remove IP Safely (Check Before Deleting)

```bash
# Check if IP exists before trying to remove
if ip addr show eth0 | grep -q "192.168.1.100"; then
    ip addr del 192.168.1.100/24 dev eth0
    echo "Removed 192.168.1.100/24 from eth0"
else
    echo "Address not found on eth0"
fi
```

## Remove from Persistent Configuration

After removing with `ip addr del`, also update persistent config to prevent re-addition on reboot:

```bash
# Netplan: edit /etc/netplan/01-netcfg.yaml and remove the address line
# Then: netplan apply

# nmcli:
nmcli connection modify "myconn" -ipv4.addresses "192.168.1.101/24"
nmcli connection up "myconn"

# systemd-networkd: remove [Address] section and run networkctl reload
```

## Conclusion

`ip addr del <address>/<prefix> dev <interface>` removes an IP immediately. Use `ip -4 addr flush dev <interface>` to remove all IPv4 addresses at once. Remember that `ip addr del` changes are not persistent - update your network configuration files to prevent the address from returning after a reboot.
