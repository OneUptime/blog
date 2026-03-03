# How to Use the ip Command Instead of ifconfig on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, ip command, ifconfig, Linux

Description: A complete reference for replacing deprecated ifconfig commands with their modern ip command equivalents on Ubuntu systems.

---

`ifconfig` has been deprecated for years, yet many administrators still reach for it out of habit. On Ubuntu 18.04 and later, it is not even installed by default. The `ip` command from the `iproute2` package replaces it and is more capable, more consistent, and actively maintained.

This guide maps common `ifconfig` operations to their `ip` equivalents and covers some `ip` features that have no `ifconfig` counterpart.

## Why ifconfig Was Replaced

`ifconfig` was part of the `net-tools` package, which was declared obsolete and unmaintained. It lacks support for modern Linux networking features like network namespaces, policy routing, and proper IPv6 handling. The `iproute2` suite - which includes `ip`, `ss`, `tc`, and others - is the current standard.

## Installing iproute2

On Ubuntu, `iproute2` is installed by default. Verify:

```bash
ip --version
```

If you still want `ifconfig` for legacy reasons:

```bash
sudo apt install net-tools
```

But the goal is to stop relying on it.

## Viewing Network Interfaces

One of the most common uses of `ifconfig` is listing network interfaces and their addresses.

```bash
# ifconfig equivalent - show all interfaces
ifconfig -a

# ip equivalent - show all interfaces with addresses
ip address show
# Shorthand works too
ip addr show
ip addr
ip a
```

To show a specific interface:

```bash
# ifconfig equivalent
ifconfig eth0

# ip equivalent
ip addr show eth0
ip addr show dev eth0
```

### Understanding ip addr Output

```text
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 52:54:00:ab:cd:ef brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86354sec preferred_lft 86354sec
    inet6 fe80::5054:ff:feab:cdef/64 scope link
       valid_lft forever preferred_lft forever
```

The output includes the interface index, flags, MTU, MAC address, IPv4 address with prefix length, broadcast address, and IPv6 link-local address.

## Assigning and Removing IP Addresses

```bash
# ifconfig: assign an IP address
ifconfig eth0 192.168.1.50 netmask 255.255.255.0

# ip equivalent - use CIDR notation
sudo ip addr add 192.168.1.50/24 dev eth0

# ifconfig: remove an IP address
ifconfig eth0 0.0.0.0

# ip equivalent
sudo ip addr del 192.168.1.50/24 dev eth0

# Add a secondary IP address (ip handles this naturally)
sudo ip addr add 192.168.1.51/24 dev eth0
```

## Bringing Interfaces Up and Down

```bash
# ifconfig: bring interface up
ifconfig eth0 up

# ip equivalent
sudo ip link set eth0 up

# ifconfig: bring interface down
ifconfig eth0 down

# ip equivalent
sudo ip link set eth0 down
```

## Viewing and Setting the MTU

```bash
# ifconfig: view MTU (shown in output)
ifconfig eth0

# ip: view MTU
ip link show eth0

# ifconfig: set MTU
ifconfig eth0 mtu 9000

# ip equivalent
sudo ip link set eth0 mtu 9000
```

## Working with Routes

`ifconfig` had no route management capability - you needed the separate `route` command. The `ip` command handles both.

```bash
# Old way - using route command
route -n
route add default gw 192.168.1.1
route add -net 10.0.0.0/8 gw 192.168.1.254

# ip equivalents
ip route show
sudo ip route add default via 192.168.1.1
sudo ip route add 10.0.0.0/8 via 192.168.1.254 dev eth0

# Delete a route
sudo ip route del 10.0.0.0/8

# Show the route for a specific destination
ip route get 8.8.8.8
```

The `ip route get` command is particularly useful - it shows exactly which interface and gateway would be used to reach a destination.

## Managing the ARP Cache

```bash
# Old way - arp command
arp -n

# ip equivalent - show neighbor table (ARP + NDP)
ip neighbour show
ip neigh show

# Add a static ARP entry
sudo ip neigh add 192.168.1.1 lladdr 00:11:22:33:44:55 dev eth0

# Delete an ARP entry
sudo ip neigh del 192.168.1.1 dev eth0

# Flush the ARP cache for an interface
sudo ip neigh flush dev eth0
```

## Viewing Link Statistics

```bash
# ifconfig shows RX/TX stats in its output
ifconfig eth0

# ip link shows brief stats
ip -s link show eth0

# For more detail
ip -s -s link show eth0
```

The `-s` flag adds statistics. Using it twice adds error counters.

## Setting Interface Promiscuous Mode

```bash
# ifconfig
ifconfig eth0 promisc    # enable
ifconfig eth0 -promisc   # disable

# ip equivalent
sudo ip link set eth0 promisc on
sudo ip link set eth0 promisc off
```

## Working with VLANs and Virtual Interfaces

The `ip` command can create virtual interfaces that `ifconfig` could not:

```bash
# Create a VLAN interface
sudo ip link add link eth0 name eth0.100 type vlan id 100
sudo ip link set eth0.100 up
sudo ip addr add 192.168.100.1/24 dev eth0.100

# Create a bridge
sudo ip link add name br0 type bridge
sudo ip link set eth0 master br0
sudo ip link set br0 up

# Create a dummy interface (useful for testing)
sudo ip link add dummy0 type dummy
sudo ip link set dummy0 up
sudo ip addr add 10.0.0.1/32 dev dummy0
```

## Filtering ip Output

The `ip` command supports filtering output, which `ifconfig` did not:

```bash
# Show only IPv4 addresses
ip -4 addr show

# Show only IPv6 addresses
ip -6 addr show

# Show only UP interfaces
ip link show up

# Show interfaces of a specific type
ip link show type ether

# Use -br for brief output (good for scripting)
ip -br addr show
ip -br link show
```

Brief output is particularly clean:

```text
lo               UNKNOWN        127.0.0.1/8 ::1/128
eth0             UP             192.168.1.100/24 fe80::5054:ff:feab:cdef/64
```

## JSON Output for Scripting

A major advantage of `ip` over `ifconfig` for automation:

```bash
# Get JSON output for parsing with jq
ip -j addr show | jq '.[].addr_info[] | select(.family == "inet") | .local'

# Get all interface names that are UP
ip -j link show | jq '.[] | select(.operstate == "UP") | .ifname'

# Get the primary IP of eth0
ip -j addr show eth0 | jq -r '.[0].addr_info[] | select(.scope == "global") | .local'
```

This makes automation and monitoring scripts far more reliable than parsing `ifconfig`'s text output.

## Quick Reference Card

| ifconfig | ip |
|----------|----|
| `ifconfig` | `ip addr` |
| `ifconfig eth0` | `ip addr show eth0` |
| `ifconfig eth0 192.168.1.10 netmask 255.255.255.0` | `ip addr add 192.168.1.10/24 dev eth0` |
| `ifconfig eth0 up` | `ip link set eth0 up` |
| `ifconfig eth0 mtu 1500` | `ip link set eth0 mtu 1500` |
| `route -n` | `ip route show` |
| `route add default gw 1.2.3.4` | `ip route add default via 1.2.3.4` |
| `arp -n` | `ip neigh show` |

The `ip` command is richer and more consistent once you get past the initial unfamiliarity. For scripting or any serious network management, there is no reason to continue using `ifconfig`.
