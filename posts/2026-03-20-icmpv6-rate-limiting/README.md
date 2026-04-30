# How to Rate Limit ICMPv6 Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Rate Limiting, IPv6 Security, Ip6tables, DoS Protection

Description: Configure ICMPv6 rate limiting to protect against DoS attacks while ensuring essential ICMPv6 messages continue to flow, using kernel sysctl settings and ip6tables.

## Introduction

ICMPv6 rate limiting is essential for protecting against denial-of-service attacks that abuse ICMPv6 (particularly ping floods and excessive ICMPv6 error traffic). The Linux kernel has built-in ICMPv6 error generation rate limiting, and ip6tables provides per-message-type rate limiting. The goal is to limit excessive ICMPv6 without breaking legitimate protocol operations.

## Kernel ICMPv6 Rate Limiting

Linux automatically rate-limits ICMPv6 error message generation:

```bash
# Check current ICMPv6 rate limit settings

cat /proc/sys/net/ipv6/icmp/ratelimit
# Value is the spacing in milliseconds between rate-limited ICMPv6 messages
# For example, 1000 means at most 1 rate-limited message per second to a peer

# Check which message types are rate-limited
cat /proc/sys/net/ipv6/icmp/ratemask
# Current kernels expose this as a comma-separated list of type ranges
# Default: 0-1,3-127 (rate-limit ICMPv6 errors except Packet Too Big, type 2)

# Increase rate limit for high-traffic servers
# Allow up to 100 ICMPv6 errors per second
sudo sysctl -w net.ipv6.icmp.ratelimit=10

# Reduce rate limit for DDoS protection
# At most 1 error per 10 seconds
sudo sysctl -w net.ipv6.icmp.ratelimit=10000

# Neighbor Discovery does not use separate ICMPv6 rate-limit sysctls
# These neighbor-cache GC thresholds help limit cache growth during ND churn/floods
cat /proc/sys/net/ipv6/neigh/default/gc_thresh1
cat /proc/sys/net/ipv6/neigh/default/gc_thresh2
cat /proc/sys/net/ipv6/neigh/default/gc_thresh3

# Limit neighbor table size (prevents memory exhaustion)
sudo sysctl -w net.ipv6.neigh.default.gc_thresh1=128
sudo sysctl -w net.ipv6.neigh.default.gc_thresh2=512
sudo sysctl -w net.ipv6.neigh.default.gc_thresh3=1024
```

## ip6tables Rate Limiting

```bash
# Rate limit incoming ICMPv6 Echo Request (ping flood protection)
# Allow up to 10 pings per second with burst of 20
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -m limit --limit 10/second --limit-burst 20 \
    -j ACCEPT
# Drop excess pings silently
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -j DROP

# Neighbor Solicitation and Neighbor Advertisement are required for
# address resolution, Duplicate Address Detection, and reachability checks
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbor-advertisement -j ACCEPT

# IMPORTANT: Do not drop or blanket rate-limit Packet Too Big (Type 2)
# Dropping it breaks PMTUD
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Router Advertisements are required on host interfaces that use SLAAC
# or learn MTU/default-router information from RA
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
```

## Per-Source Rate Limiting with hashlimit

```bash
# Rate limit per source address (more targeted than global limit)
# Allows 5 ICMPv6 echo requests per second from any single source
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -m hashlimit \
    --hashlimit-upto 5/second \
    --hashlimit-burst 10 \
    --hashlimit-mode srcip \
    --hashlimit-name icmpv6-echo-in \
    -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -j DROP

# Avoid DROP-on-excess rules for Neighbor Solicitation on interfaces
# that rely on Neighbor Discovery, because they can break ND and DAD
```

## Monitoring ICMPv6 Rates

```python
import subprocess
import time
import re

def monitor_icmpv6_rate(interval: int = 5) -> dict:
    """
    Monitor ICMPv6 message rates by comparing /proc/net/snmp6 counters.
    """
    def read_snmp6():
        with open("/proc/net/snmp6") as f:
            data = {}
            for line in f:
                key, val = line.split()
                if "Icmp6" in key:
                    data[key] = int(val)
        return data

    before = read_snmp6()
    time.sleep(interval)
    after = read_snmp6()

    rates = {}
    for key in after:
        delta = after[key] - before[key]
        if delta > 0:
            rates[key] = round(delta / interval, 2)

    return rates

# Monitor for 5 seconds
# rates = monitor_icmpv6_rate(5)
# for key, rate in sorted(rates.items()):
#     print(f"{key}: {rate}/s")
```

## Conclusion

ICMPv6 rate limiting requires distinguishing between message types: inbound Packet Too Big (Type 2) messages should not be dropped or blanket rate-limited because they are needed for PMTUD, while Echo Request is usually the safest ICMPv6 message type to rate-limit. Neighbor Solicitation, Neighbor Advertisement, and Router Advertisement are core Neighbor Discovery traffic and should generally be accepted on interfaces that rely on them. The kernel's built-in error generation rate limiting (`net.ipv6.icmp.ratelimit` together with `net.ipv6.icmp.ratemask`) handles outbound error messages. For inbound traffic, ip6tables with the `--limit` or `--hashlimit` module can rate-limit selected message types such as Echo Request. Always test rate limits under normal production load before applying them to ensure legitimate traffic is not affected.
