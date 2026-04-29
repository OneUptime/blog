# How to Configure IS-IS on FRRouting for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, FRRouting, Linux, IPv6, Routing

Description: Learn how to configure IS-IS for IPv6 routing on Linux using FRRouting's isisd daemon, including multi-topology and verification.

## Overview

FRRouting's `isisd` daemon provides full IS-IS support for Linux, including IPv6 via multi-topology extensions. This guide covers installation, NET address setup, interface activation, and verification.

## Installation

```bash
# Debian/Ubuntu

sudo apt install frr

# Enable zebra and isisd
sudo sed -i 's/^zebra=no/zebra=yes/' /etc/frr/daemons
sudo sed -i 's/^isisd=no/isisd=yes/' /etc/frr/daemons

# Restart FRR
sudo systemctl restart frr
```

## Enable IPv6 Forwarding

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
```

## Basic IS-IS IPv6 Configuration

```bash
vtysh
configure terminal

! Enable IS-IS process
router isis CORE
 net 49.0001.0000.0000.0001.00  ! NET address
 is-type level-2-only
 !
 ! Enable IPv6 Multi-Topology
 topology ipv6-unicast

! Enable IS-IS on interfaces
interface eth0
 ip router isis CORE      ! IPv4 IS-IS
 ipv6 router isis CORE    ! IPv6 IS-IS
 isis metric 10           ! Interface metric
 isis network point-to-point  ! If not a broadcast network

interface eth1
 ip router isis CORE
 ipv6 router isis CORE
 isis metric 20          ! Different interface metric

interface lo
 ip router isis CORE
 ipv6 router isis CORE
 isis passive            ! No hellos on loopback

end
write memory
```

## Computing the NET Address from a Loopback

```bash
# Convert loopback 1.1.1.1 to IS-IS System ID
# 1.1.1.1 → pad to 3 groups of 4 digits → 0001.0001.0001
# NET = 49.<area>.<sysid>.00
# Example: 49.0001.0001.0001.0001.00

# Or use the MAC address of the management interface:
ip link show eth0 | grep "link/ether"
# aa:bb:cc:dd:ee:ff → aabb.ccdd.eeff
# NET = 49.0001.aabb.ccdd.eeff.00
```

## Verification Commands

```bash
# Show IS-IS neighbors
vtysh -c "show isis neighbor"

# Show IS-IS database (LSPs)
vtysh -c "show isis database"

# Show IS-IS IPv6 routes
vtysh -c "show ipv6 route isis"

# Show IS-IS topology
vtysh -c "show isis topology level-2"

# Show IS-IS interface status
vtysh -c "show isis interface"
```

## Sample Output

```text
Router# show isis neighbor

Area CORE:
  System Id           Interface   L  State        Holdtime SNPA
  0000.0000.0002      eth0        2  Up            29       * PPP *

Router# show ipv6 route isis

Codes: K - kernel route, C - connected, S - static, R - RIPng,
       O - OSPFv3, I - IS-IS, B - BGP

I>* 2001:db8:2::/64 [115/20] via fe80::2, eth0, weight 1, 00:45:12
I>* 2001:db8:3::/48 [115/30] via fe80::2, eth0, weight 1, 00:30:05
```

## Redistributing Routes into IS-IS

```bash
vtysh
configure terminal

router isis CORE
 ! Redistribute IPv6 routes from the main Linux table into Level-2 IS-IS
 redistribute ipv6 table 254 level-2

end
write memory
```

## IS-IS Authentication

```bash
vtysh
configure terminal

router isis CORE
 ! Area/domain authentication
 area-password md5 MyAreaPassword    ! Level 1
 domain-password md5 MyDomainPassword  ! Level 2

! Or per-interface
interface eth0
 isis password md5 MyInterfacePassword

end
```

## Summary

FRRouting IS-IS for IPv6 requires enabling `zebra` and `isisd`, configuring a NET address, and activating IS-IS on interfaces with `ipv6 router isis` (and `ip router isis` if you also want IPv4). Enable `topology ipv6-unicast` for multi-topology support. Verify with `show isis neighbor` and `show ipv6 route isis`. IS-IS on FRRouting is production-ready and commonly used in Linux-based network appliances.
