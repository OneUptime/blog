# How to Replace ifconfig Commands with Modern ip Command Equivalents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, ip command, ifconfig, Migration, Network Configuration

Description: Translate common ifconfig commands to their modern ip command equivalents for address management, interface control, routing, and statistics on Linux.

## Introduction

`ifconfig` from the `net-tools` package is deprecated. Modern Linux distributions default to `iproute2`'s `ip` command, which is more powerful, scriptable, and consistent. This guide provides a direct mapping between common `ifconfig` usage and the equivalent `ip` commands.

## Show All Interfaces

```bash
# Old: ifconfig

ifconfig -a

# New: ip
ip addr show
ip a
```

## Show a Specific Interface

```bash
# Old
ifconfig eth0

# New
ip addr show dev eth0
ip a show dev eth0
```

## Assign an IP Address

```bash
# Old
sudo ifconfig eth0 192.168.1.100 netmask 255.255.255.0

# New (CIDR notation)
sudo ip addr add 192.168.1.100/24 dev eth0
```

## Remove an IP Address

```bash
# Old
sudo ifconfig eth0 del 192.168.1.100/24

# New
sudo ip addr del 192.168.1.100/24 dev eth0
```

## Bring Interface Up / Down

```bash
# Old
sudo ifconfig eth0 up
sudo ifconfig eth0 down

# New
sudo ip link set eth0 up
sudo ip link set eth0 down
```

## Set MTU

```bash
# Old
sudo ifconfig eth0 mtu 9000

# New
sudo ip link set eth0 mtu 9000
```

## Enable Promiscuous Mode

```bash
# Old
sudo ifconfig eth0 promisc

# New
sudo ip link set eth0 promisc on
```

## Show Routing Table

```bash
# Old
route -n

# New
ip route show
ip r
```

## Add Default Gateway

```bash
# Old
sudo route add default gw 192.168.1.1

# New
sudo ip route add default via 192.168.1.1
```

## Show ARP Cache

```bash
# Old
arp -n

# New
ip neigh show
```

## Add a Static ARP Entry

```bash
# Old
sudo arp -s 192.168.1.50 aa:bb:cc:dd:ee:ff

# New
sudo ip neigh add 192.168.1.50 lladdr aa:bb:cc:dd:ee:ff dev eth0 nud permanent
```

## Show Interface Statistics

```bash
# Old
ifconfig eth0  # Shows RX/TX byte counts

# New
ip -s link show eth0
```

## Quick Reference Table

| Task | ifconfig / route | ip equivalent |
|---|---|---|
| Show all interfaces | `ifconfig -a` | `ip a` |
| Assign IP | `ifconfig eth0 A.B.C.D netmask M` | `ip addr add A.B.C.D/P dev eth0` |
| Remove IP | `ifconfig eth0 del A.B.C.D/P` | `ip addr del A.B.C.D/P dev eth0` |
| Interface up | `ifconfig eth0 up` | `ip link set eth0 up` |
| Set MTU | `ifconfig eth0 mtu N` | `ip link set eth0 mtu N` |
| Show routes | `route -n` | `ip route show` |
| Add route | `route add -net N gw G` | `ip route add N via G` |
| Show ARP | `arp -n` | `ip neigh show` |

## Conclusion

The `ip` command covers all `ifconfig` and `route` functionality plus more (namespaces, policy routing, tunnel management). Install `iproute2` if it is not present, and update scripts and documentation to use `ip` commands for future compatibility.
