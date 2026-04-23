# How to Configure RIPng on Linux with FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, FRRouting, Linux, IPv6, Routing

Description: Learn how to configure RIPng on Linux using FRRouting's ripngd daemon for IPv6 distance-vector routing in small networks.

## Overview

FRRouting's `ripngd` daemon provides RIPng support on Linux. Configuration is done via `vtysh`, and RIPng is enabled on interfaces with `network <interface>` under `router ripng`.

## Installation and Setup

```bash
# Debian/Ubuntu

sudo apt install frr

# Enable the ripngd daemon
sudo sed -i 's/^ripngd=no/ripngd=yes/' /etc/frr/daemons

# Start FRR
sudo systemctl restart frr

# Verify ripngd is running
sudo systemctl status frr
ps aux | grep ripngd
```

## Enable IPv6 Forwarding

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
```

## Basic RIPng Configuration

```bash
vtysh
configure terminal

router ripng
 ! Enable RIPng on interfaces
 network eth0
 network eth1

 ! Redistribute connected routes
 redistribute connected

 ! Set timers (update/timeout/garbage collection in seconds)
 timers basic 30 180 120

end
write memory
```

## Interface-Based Configuration

```bash
vtysh
configure terminal

router ripng
 network eth0
 network eth1

 ! Make eth2 passive (suppress RIPng updates on this interface)
 passive-interface eth2

end
write memory
```

## Configuration File Method

Alternatively, edit the integrated config directly:

```text
# /etc/frr/frr.conf
router ripng
 network eth0
 network eth1
 redistribute connected
 redistribute static metric 3
!
```

## Administrative Distance

FRR uses zebra's protocol administrative distance when selecting routes. RIPng uses the RIP default distance of 120; current `ripngd` does not provide a `distance` subcommand under `router ripng`.

## Generating a Default Route

```bash
vtysh
configure terminal

router ripng
 ! Advertise default route to neighbors
 default-information originate

end
```

## Verification Commands

```bash
# Show RIPng routes
vtysh -c "show ipv6 ripng"

# Show RIPng status and configuration
vtysh -c "show ipv6 ripng status"

# Show routes in FRR's routing table from RIPng
vtysh -c "show ipv6 route ripng"

# Show routes in Linux kernel from RIPng
ip -6 route show proto ripng
```

## Sample Output

```text
Router# show ipv6 ripng

Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIPng, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct
Sub-codes:
      (n) - normal, (s) - static, (d) - default, (r) - redistribute,
      (i) - interface, (a/S) - aggregated/Suppressed

   Network      Next Hop                      Via     Metric Tag Time
C(i) 2001:db8:1::/64
                  ::                          self       1    0
C(i) 2001:db8:2::/64
                  ::                          self       1    0
R(n) 2001:db8:3::/64
                  fe80::1234:5678:abcd:1      eth0       2    0  02:48
```

## Redistribution

```bash
vtysh
configure terminal

router ripng
 ! Redistribute OSPFv3 routes with metric 5
 redistribute ospf6 metric 5

 ! Redistribute static routes
 redistribute static metric 3

 ! Redistribute BGP routes
 redistribute bgp metric 8

end
write memory
```

## Debug Commands

```bash
# Enable RIPng debugging
vtysh
debug ripng events
debug ripng packet

# Watch logs
journalctl -u frr -f | grep ripng
```

## Summary

FRRouting RIPng is configured with `router ripng` and `network <interface>` commands in `vtysh`. Enable `ripngd=yes` in `/etc/frr/daemons` first. Verify with `show ipv6 ripng` and confirm routes are in the kernel with `ip -6 route show proto ripng`. RIPng is suitable for small IPv6 networks where OSPFv3 complexity is not needed.
