# How to Add a Secondary IPv4 Address with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, nmcli, NetworkManager, IPv4, Secondary IP, Networking

Description: Add a secondary (additional) IPv4 address to an existing network interface using nmcli, enabling an interface to respond to multiple IP addresses.

## Introduction

Adding a secondary IPv4 address allows an interface to be reachable at multiple IPs - useful for virtual hosting, service redundancy, or separating management and data traffic. nmcli supports multiple `ipv4.addresses` entries per connection.

## Add a Secondary IP Address

```bash
# Show current connection

nmcli connection show "Wired connection 1" | grep ipv4.addresses

# Append a secondary IP (+ prefix = add without removing existing)
nmcli connection modify "Wired connection 1" \
    +ipv4.addresses 192.168.1.101/24

# Apply
nmcli connection up "Wired connection 1"
```

## Verify Both IPs Are Assigned

```bash
# Show all IPs on the interface
ip addr show eth0

# Should show:
# inet 192.168.1.100/24 ...
# inet 192.168.1.101/24 ...
```

## Add Multiple Secondary IPs at Once

```bash
nmcli connection modify "Wired connection 1" \
    +ipv4.addresses 192.168.1.102/24 \
    +ipv4.addresses 192.168.1.103/24

nmcli connection up "Wired connection 1"
```

## Add Secondary IP on a Different Subnet

```bash
# Secondary IP on a different directly connected subnet
nmcli connection modify "Wired connection 1" \
    +ipv4.addresses 10.0.0.50/24

nmcli connection up "Wired connection 1"
```

## Remove a Secondary IP Address

```bash
# Use - prefix to remove a specific IP
nmcli connection modify "Wired connection 1" \
    -ipv4.addresses 192.168.1.101/24

nmcli connection up "Wired connection 1"
```

## Replace All IPs (Primary + Secondary)

```bash
# Set only these stored IPv4 addresses, removing all others from the profile
nmcli connection modify "Wired connection 1" \
    ipv4.addresses "192.168.1.100/24, 192.168.1.101/24, 192.168.1.102/24"

nmcli connection up "Wired connection 1"
```

## View All Addresses in the Connection Profile

```bash
# Show stored connection details
nmcli connection show "Wired connection 1" | grep ipv4

# Show live interface addresses
ip addr show eth0
```

## Conclusion

Secondary IPv4 addresses in nmcli are added with the `+ipv4.addresses` modifier syntax. Multiple addresses can be added to a single connection, and each is applied to the interface when the connection is activated. Remove individual addresses with `-ipv4.addresses <addr>`.
