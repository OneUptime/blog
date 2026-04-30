# How to Understand ICMPv6 Redirect Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Redirect, NDP, IPv6, Router, RFC 4861

Description: Understand ICMPv6 Redirect messages (Type 137), when routers send them, how hosts update their destination cache, and when to block redirects for security.

## Introduction

ICMPv6 Redirect (Type 137) is sent by a router to inform a host that a better first-hop exists for a particular destination. When a host sends a packet to a router, and that router knows a better route via another on-link router, it forwards the packet but also sends a Redirect to the host. The host updates its destination cache to use the better next-hop for future packets to that destination.

## Redirect Message Format

```text
ICMPv6 Redirect (Type 137):

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=137  |   Code = 0    |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            Reserved                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                         Target Address                        +
|                (the better next-hop address)    (128 bits)    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
+                      Destination Address                      +
|               (the destination of the original packet)        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Options: Target Link-Layer Address and Redirected Header    |

IPv6 Header:
  Source:      Router's link-local address (fe80::...)
  Destination: Source of the original packet (host being redirected)
  Hop Limit:   255 (mandatory)
```

## When Redirects Are Sent

```text
Redirect conditions (RFC 4861 Section 8.2):

A router SHOULD send a Redirect, subject to rate limiting, when ALL of
the following are true:

1. The router is forwarding a packet that is not explicitly addressed
   to itself
   → For example, the packet is not source-routed through the router

2. The Source Address of the forwarded packet identifies a neighbor
   → The sending host is on the same link as the router

3. The router knows a better first-hop node for the packet's
   Destination Address on that same link
   → The better next-hop is on-link to the sending host

4. The Destination Address of the forwarded packet is not multicast

Target field rules:
- If the better first-hop is a router, Target = that router's
  link-local address
- If the better first-hop is the destination host itself,
  Target = Destination

Example scenario:
  Host: 2001:db8::100 (gateway = Router-A fe80::1)
  Router-A has: traffic to 2001:db8:2::/64 goes via Router-B (fe80::2)
  Router-B is on the same link as Host

  Flow:
  1. Host sends to 2001:db8:2::1, via Router-A
  2. Router-A forwards to Router-B (same link)
  3. Router-A sends Redirect to Host: "use fe80::2 for 2001:db8:2::1"
  4. Host caches: dest 2001:db8:2::1 → next-hop fe80::2
  5. Future packets skip Router-A and go directly to Router-B
```

## Processing Redirects

```bash
# Show IPv6 cached routes; redirect-learned entries may appear here
ip -6 route show cache

# Example: a cached entry can show a destination-specific next-hop
# 2001:db8:2::1 via fe80::2 dev eth0 src 2001:db8::100
#   cache  expires 60sec

# Accept redirects from routers (default behavior)
cat /proc/sys/net/ipv6/conf/eth0/accept_redirects
# 1 = accept (default on hosts)

# Disable accepting redirects (useful on routers)
sudo sysctl -w net.ipv6.conf.all.accept_redirects=0
sudo sysctl -w net.ipv6.conf.default.accept_redirects=0

# Enable on hosts (restoring default)
sudo sysctl -w net.ipv6.conf.all.accept_redirects=1
```

## Security Considerations for Redirects

```bash
# Redirects can be used for traffic hijacking:
# 1. Attacker on the same link sends forged Redirect to host
# 2. Redirect says: "use attacker's address for destination X"
# 3. Host routes all traffic to X through attacker

# Defense 1: Accept redirects only from the current first-hop router
# RFC 4861 requires the redirect source to match the current first-hop
# router for that destination

# Defense 2: Disable redirects on hosts that don't need them
sudo sysctl -w net.ipv6.conf.eth0.accept_redirects=0

# Defense 3: On a single-router host, allow Redirects only from that router
DEFAULT_GW=$(ip -6 route show default | awk '/via/ {print $3; exit}')
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type redirect \
    -s "$DEFAULT_GW" -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type redirect -j DROP

# Defense 4: Some switches offer ND inspection / IPv6 first-hop security,
# but Redirect validation support is vendor-specific
```

## Conclusion

ICMPv6 Redirect is a network optimization mechanism that allows routers to inform hosts about better first-hop paths on the same link. The Hop Limit 255 requirement ensures redirects can only come from local-link nodes. On Linux, redirect-learned next-hops may appear as cached routes rather than persistent route-table entries. From a security perspective, Redirect messages should be accepted only from the current first-hop router for the destination, and on hosts where routing optimization is not needed, redirects can be disabled entirely with `net.ipv6.conf.*.accept_redirects=0`.
