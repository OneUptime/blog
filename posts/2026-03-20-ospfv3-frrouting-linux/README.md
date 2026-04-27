# How to Configure OSPFv3 on Linux with FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, FRRouting, Linux, IPv6, Routing

Description: Learn how to install and configure OSPFv3 on Linux using FRRouting (FRR) to enable dynamic IPv6 routing between Linux routers.

## Overview

FRRouting (FRR) is the leading open-source routing suite for Linux, providing OSPFv3 via its `ospf6d` daemon. It is widely used in network appliances, NFV environments, and lab setups.

## Installation

```bash
# Debian/Ubuntu

sudo apt install frr

# RHEL/CentOS/Fedora
sudo dnf install frr

# Enable the ospf6d daemon
sudo sed -i 's/^ospf6d=no/ospf6d=yes/' /etc/frr/daemons

# Start FRR
sudo systemctl enable --now frr
```

## Enable IPv6 Forwarding

OSPFv3 requires IPv6 forwarding to be enabled on the Linux router:

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.d/99-ipv6.conf
```

## Basic OSPFv3 Configuration

Access the FRR CLI and configure OSPFv3:

```bash
# Enter the FRR configuration shell
vtysh

# Configure OSPFv3
configure terminal

! Set the Router ID (mandatory if no IPv4 loopback)
router ospf6
 ospf6 router-id 1.1.1.1

! Enable OSPFv3 on interfaces - specify the area
interface eth0
 ipv6 ospf6 area 0.0.0.0

interface eth1
 ipv6 ospf6 area 0.0.0.0

! Set passive on loopback (don't send Hellos)
interface lo
 ipv6 ospf6 passive

end
write memory
```

## Configuration File Method

Alternatively, edit the FRR configuration file directly:

```text
# /etc/frr/ospf6d.conf
router ospf6
 ospf6 router-id 1.1.1.1
!
interface eth0
 ipv6 ospf6 area 0.0.0.0
 ipv6 ospf6 hello-interval 10
 ipv6 ospf6 dead-interval 40
 ipv6 ospf6 cost 10
!
interface eth1
 ipv6 ospf6 area 0.0.0.0
!
interface lo
 ipv6 ospf6 passive
!
```

## Multi-Area Configuration

```bash
vtysh
configure terminal

router ospf6
 ospf6 router-id 1.1.1.1

! Area 0 interfaces
interface eth0
 ipv6 ospf6 area 0.0.0.0

! Area 1 interfaces (ABR configuration)
interface eth1
 ipv6 ospf6 area 0.0.0.1

end
write memory
```

## Verification Commands

```bash
# Enter vtysh
vtysh

# Show OSPFv3 neighbor state
show ipv6 ospf6 neighbor

# Show OSPFv3 interfaces
show ipv6 ospf6 interface

# Show OSPFv3 Link State Database
show ipv6 ospf6 database

# Show OSPFv3 routes
show ipv6 ospf6 route

# Show IPv6 routing table including OSPFv3 routes
show ipv6 route ospf6
```

## Sample Output

```text
Router# show ipv6 ospf6 neighbor

Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
2.2.2.2           1    00:00:34    Full/BDR              00:18:21 eth0[DR]
3.3.3.3           1    00:00:38    Full/PointToPoint     00:15:45 eth1[PointToPoint]
```

## Redistributing Static Routes

```bash
vtysh
configure terminal

router ospf6
 redistribute static

! Create a route map to control which routes are redistributed
route-map STATIC_TO_OSPF permit 10
 match ipv6 address prefix-list MY_PREFIXES

router ospf6
 redistribute static route-map STATIC_TO_OSPF

end
write memory
```

## Checking FRR Logs

```bash
# View FRR OSPFv3 daemon logs
journalctl -u frr -f

# Or if using file logging
tail -f /var/log/frr/ospf6d.log
```

## Summary

FRRouting OSPFv3 is configured through `vtysh` or the `/etc/frr/ospf6d.conf` file. Enable the `ospf6d` daemon, set a Router ID, and assign interfaces to areas with `ipv6 ospf6 area <id>`. Verify with `show ipv6 ospf6 neighbor` and confirm IPv6 routes appear in the routing table with `show ipv6 route ospf6`.
