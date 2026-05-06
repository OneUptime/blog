# How to Configure Broadcast Addresses in Linux Network Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Linux, Broadcast, IPv4, ip command, Network Configuration

Description: Configure correct broadcast addresses on Linux network interfaces using the ip command, and understand when custom broadcast addresses are needed.

## Introduction

When you assign an IPv4 address to a broadcast-capable Linux interface, Linux networking tools normally derive the broadcast address from the prefix. However, there are cases where you need to set a custom broadcast - when using non-standard addressing or legacy applications that expect a specific value.

## How Linux Derives the Default Broadcast

For a broadcast-capable IPv4 subnet, the directed broadcast is the last address in the range (all host bits set to 1). If you do not override it, Linux tools typically use that value.

## Assigning an IP with the Default Broadcast

```bash
# Assign 192.168.1.100/24 - standard broadcast is 192.168.1.255

sudo ip addr add 192.168.1.100/24 dev eth0

# Verify the broadcast address assigned
ip addr show dev eth0 | grep "inet "
# Output: inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
```

## Assigning a Custom Broadcast Address

Use the `broadcast` keyword to override the computed value:

```bash
# Assign IP with an explicit non-default broadcast address
sudo ip addr add 10.0.0.5/8 broadcast 10.0.255.255 dev eth0

# Another custom broadcast for software expecting a narrower range
sudo ip addr add 172.16.0.1/12 broadcast 172.16.255.255 dev eth0
```

## Using the + and - Broadcast Shortcuts

The `ip addr` command supports shorthand:

```bash
# "+" means: compute broadcast as all-ones host (standard behavior)
sudo ip addr add 192.168.5.10/24 broadcast + dev eth0

# "-" means: derive the broadcast by clearing the host bits (legacy, rarely used)
sudo ip addr add 192.168.5.10/24 broadcast - dev eth0
```

## Checking the Current Broadcast Address

```bash
# Show all addresses and their broadcast fields
ip addr show

# Show only IPv4 with broadcast for a specific interface
ip -4 addr show dev eth0
```

## Legacy Configuration: /etc/network/interfaces

On Debian/Ubuntu systems using `ifupdown`:

```text
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    broadcast 192.168.1.255
    gateway 192.168.1.1
```

If broadcast is omitted, `ifupdown` computes it automatically.

## Netplan Configuration (Ubuntu)

Netplan does not expose an explicit broadcast field in its YAML schema - the underlying backend derives the broadcast from the configured address and prefix:

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8]
```

## Troubleshooting Wrong Broadcast

If an application is using the wrong broadcast address, check with:

```bash
# Send to the interface's directed broadcast address
python3 -c "
import socket
DEST = ('192.168.1.255', 9999)  # replace with your interface's broadcast address
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
print(f'Sending to {DEST[0]}')
s.sendto(b'test', DEST)
"
```

Then capture on the local interface to confirm the packet appears with the expected destination.

## Conclusion

Linux networking tools normally derive the standard broadcast from the configured prefix. Use the `broadcast` keyword in `ip addr add` only when you need a non-standard value. For most configurations, the default derived broadcast is correct and no manual override is needed.
