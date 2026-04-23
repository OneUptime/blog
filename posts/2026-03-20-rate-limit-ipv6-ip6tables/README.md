# How to Rate Limit IPv6 Connections with ip6tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, Rate Limiting, DoS Protection, Linux

Description: Learn how to implement IPv6 connection rate limiting with ip6tables using the limit, hashlimit, and recent modules to protect against DoS attacks and brute force.

## Overview

Rate limiting with ip6tables restricts how many packets or connections can arrive per unit time. For IPv6, this is important for preventing: ICMPv6 echo-request floods, SSH brute-force attacks, SYN floods, and some control-plane abuse. ip6tables provides three main rate-limiting mechanisms: the `limit` module (global), `hashlimit` module (per-source), and `recent` module (recent address tracking).

## Module 1: limit (Global Rate Limiting)

The `limit` module applies a rate limit globally across all sources:

```bash
# Limit incoming ping requests to 10 per second (global)

ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
  -m limit --limit 10/second --limit-burst 30 \
  -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j DROP

# Limit new SSH connections to 4 per minute
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m limit --limit 4/minute --limit-burst 8 \
  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP

# Limit SYN flood rate
ip6tables -A INPUT -p tcp --syn \
  -m limit --limit 100/second --limit-burst 500 \
  -j ACCEPT
ip6tables -A INPUT -p tcp --syn -j DROP
```

**limit parameters:**
- `--limit N/unit` - Allow N packets per unit (second, minute, hour, day)
- `--limit-burst B` - Initial burst allowance (tokens)

## Module 2: hashlimit (Per-Source Rate Limiting)

The `hashlimit` module applies rates per-source IP address:

```bash
# Limit SSH to 3 new connections per minute per source IPv6
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m hashlimit \
  --hashlimit-name ssh-rate-v6 \
  --hashlimit-upto 3/minute \
  --hashlimit-burst 5 \
  --hashlimit-mode srcip \
  --hashlimit-htable-expire 300000 \
  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP

# Limit HTTP new connections per source
ip6tables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW \
  -m hashlimit \
  --hashlimit-name http-rate-v6 \
  --hashlimit-upto 50/second \
  --hashlimit-burst 200 \
  --hashlimit-mode srcip \
  -j ACCEPT
ip6tables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW -j DROP
```

**hashlimit parameters:**
- `--hashlimit-name` - Unique name for hash table
- `--hashlimit-upto N/unit` - Allow up to N packets per unit
- `--hashlimit-burst B` - Burst allowance
- `--hashlimit-mode srcip` - Track per source IP (or srcport, dstip, dstport)

## Module 3: recent (Recent Address Tracking)

The `recent` module tracks recent source addresses. Pair it with conntrack if you want to count new connection attempts:

```bash
# SSH brute-force protection
# If 4+ new connections from same source in 60 seconds → drop
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m recent --name SSH6 --rcheck --seconds 60 --hitcount 4 \
  -j LOG --log-prefix "SSH-BRUTE-FORCE: "
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m recent --name SSH6 --rcheck --seconds 60 --hitcount 4 \
  -j DROP
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m recent --name SSH6 --set \
  -j ACCEPT
```

## Neighbor Solicitation Flood Protection

Classic IPv6 Neighbor Discovery exhaustion on routers is usually caused by scans to many unused destination addresses, which force address-resolution work and neighbor-cache churn. The rule below only rate-limits incoming Neighbor Solicitations on the local link and should be used with care, since aggressive limits can interfere with normal Neighbor Discovery:

```bash
# Limit incoming Neighbor Solicitations per source on the local link
ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 \
  -m hashlimit \
  --hashlimit-name ndp-limit \
  --hashlimit-upto 10/second \
  --hashlimit-burst 20 \
  --hashlimit-mode srcip \
  -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 -j DROP
```

## ICMPv6 Flood Protection

If you choose to rate-limit ICMPv6, do it narrowly. Blanket ICMPv6 drops break normal IPv6 operation, and even echo-request limiting is an operational tradeoff.

```bash
# Narrower scope: if you rate-limit ICMPv6, target echo requests, not all ICMPv6
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
  -m limit --limit 20/second --limit-burst 50 \
  -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j DROP

# More granular: per-source echo-request limiting
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
  -m hashlimit \
  --hashlimit-name icmpv6-limit \
  --hashlimit-upto 5/second \
  --hashlimit-burst 10 \
  --hashlimit-mode srcip \
  -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j DROP
```

## Log Rate-Limited Drops

```bash
# After the SSH allow rule above, log the remaining over-limit NEW attempts
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
  -m limit --limit 5/minute --limit-burst 10 \
  -j LOG --log-prefix "SSH-RATE-LIMIT: "

ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j DROP
```

## View hashlimit Tables

```bash
# View current IPv6 hashlimit tables created by --hashlimit-name
ls /proc/net/ip6t_hashlimit 2>/dev/null

# View a specific table
cat /proc/net/ip6t_hashlimit/ssh-rate-v6 2>/dev/null
```

## Summary

ip6tables rate limiting uses three modules: `limit` for global rates (all sources combined), `hashlimit` for per-source rates (most useful - limits each attacker individually), and `recent` for tracking repeated connection attempts from the same address. Many operators choose to rate-limit ICMPv6 echo requests and new service connections such as SSH when appropriate, but do not blanket-drop essential ICMPv6 control traffic. Neighbor Discovery cache-exhaustion on routers is usually mitigated by filtering unused destination space rather than by rate-limiting inbound Neighbor Solicitations alone. The `hashlimit` module with `--hashlimit-mode srcip` is the most effective for per-source protection. Log rate-limited drops to detect ongoing attacks.
