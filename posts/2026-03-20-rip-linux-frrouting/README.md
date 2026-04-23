# How to Configure RIP on Linux Using FRRouting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, RIP, FRRouting, Linux, Routing

Description: Learn how to configure RIP (Routing Information Protocol) on Linux using FRRouting, including RIPv2, authentication, and verification commands.

## What Is RIP?

RIP (Routing Information Protocol) is a distance-vector routing protocol. It:
- Uses hop count as its metric (max 15 hops; 16 = unreachable)
- Sends full routing tables every 30 seconds
- Supports VLSM (RIPv2 only)
- Simple to configure but not scalable for large networks
- Good for small, simple networks and lab environments

## Installing FRRouting and Enabling RIP

```bash
# Ubuntu/Debian

apt install frr

# Enable RIP daemon
sed -i 's/ripd=no/ripd=yes/' /etc/frr/daemons
systemctl restart frr
```

## Basic RIPv2 Configuration

```bash
vtysh
configure terminal

router rip

! Use RIPv2 (classless, supports VLSM)
version 2

! Advertise networks via RIP
network 192.168.1.0/24
network 10.0.0.0/30

! Don't send RIP updates on LAN interface (passive)
passive-interface eth0

exit
```

## RIP Interface Configuration

```text
interface eth1
 ! Set split horizon (prevents routing loops)
 ip rip split-horizon poisoned-reverse

exit

router rip
 ! Add 2 to RIP routes learned on eth1
 offset-list RIP_OFFSET in 2 eth1
exit

access-list RIP_OFFSET permit any
```

## RIP Authentication (RIPv2 MD5)

```text
interface eth1
 ip rip authentication mode md5
 ip rip authentication key-chain RIP_KEY
exit

key chain RIP_KEY
 key 1
  key-string mysecretkey
exit
```

## Redistributing Routes into RIP

```text
router rip
 ! Redistribute connected routes
 redistribute connected metric 1

 ! Redistribute static routes with a metric
 redistribute static metric 2

 ! Redistribute OSPF routes
 redistribute ospf metric 5
exit
```

## Verifying RIP Operation

```bash
# Show RIP routes
vtysh -c "show ip rip"

# Show routes installed in zebra
vtysh -c "show ip route"

# Show RIP status, interfaces, and peers
vtysh -c "show ip rip status"
```

Sample `show ip rip` output:

```text
Codes: R - RIP, C - connected, S - Static, O - OSPF, B - BGP

Network         Next Hop         Metric  From            Tag Time
R(n) 10.0.0.0/30     10.0.0.2        2  10.0.0.2          0  00:20
R(n) 192.168.2.0/24  10.0.0.2        2  10.0.0.2          0  00:20
C(i) 192.168.1.0/24  0.0.0.0         1  self              0
```

## RIP vs Modern Protocols

| Feature | RIP | OSPF | BGP |
|---------|-----|------|-----|
| Max diameter | 15 hops | Unlimited | Unlimited |
| Convergence | Slow (30s updates) | Fast (triggered) | Slow (by design) |
| Scalability | Small networks only | Large enterprise | Global internet |
| VLSM support | RIPv2 only | Yes | Yes |
| Authentication | MD5 (RIPv2) | MD5/SHA | MD5 |
| Loop prevention | Split horizon | SPF algorithm | AS path |

## Full RIP Configuration File

```bash
# /etc/frr/frr.conf (saved via vtysh: write memory)
router rip
 version 2
 network 192.168.1.0/24
 network 10.0.0.0/30
 passive-interface eth0
 redistribute connected metric 1
exit
```

## Key Takeaways

- RIP uses hop count (max 15) and sends full table updates every 30 seconds.
- Use RIPv2 (`version 2`) for VLSM support.
- Passive interfaces suppress RIP updates on client-facing interfaces.
- RIP is suitable only for small/simple networks; prefer OSPF for larger ones.

**Related Reading:**

- [How to Configure OSPF on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-ospf-linux-frrouting/view)
- [How to Configure BGP on Linux Using FRRouting](https://oneuptime.com/blog/post/2026-03-20-bgp-linux-frrouting/view)
- [How to Understand Administrative Distance in Routing](https://oneuptime.com/blog/post/2026-03-20-administrative-distance-routing/view)
