# How to Prevent NDP Cache Overflow Attacks on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Security, Cache Overflow, DoS, Defense

Description: Understand NDP cache overflow (neighbor cache exhaustion) attacks on IPv6 routers and implement defenses including rate limiting, cache tuning, and RA Guard.

## NDP Cache Overflow Attack

IPv6 neighbor discovery is vulnerable to cache exhaustion attacks. An attacker scans or sends traffic to many addresses within a /64 prefix:

```text
Attacker sends packets to:
  2001:db8:1::1, 2001:db8:1::2, ..., 2001:db8:1::ffff
```

The router must:
1. Check neighbor cache - not found
2. Send NS to solicited-node multicast
3. Create INCOMPLETE cache entry

With /64 = 2^64 addresses, an attacker can flood the router's neighbor cache with INCOMPLETE entries, consuming memory and CPU until legitimate traffic fails.

## Detecting an NDP Overflow Attack

```bash
# Check number of INCOMPLETE/FAILED NDP entries

ip -6 neigh show nud incomplete | wc -l
ip -6 neigh show nud failed | wc -l

# High INCOMPLETE count = active attack
INCOMPLETE=$(ip -6 neigh show nud incomplete | wc -l)
echo "INCOMPLETE entries: ${INCOMPLETE}"
[ ${INCOMPLETE} -gt 500 ] && echo "WARNING: Possible NDP cache attack!"

# Monitor NS flood rate
tcpdump -i eth0 -n 'icmp6 and ip6[40]==135' -q 2>/dev/null | \
    pv -l -r > /dev/null  # pv shows rate in packets/sec

# Check CPU usage from NDP softirq processing
mpstat -P ALL 1 1   # %soft column shows softirq load per CPU
cat /proc/softirqs  # NET_RX counters increase under NS flood
```

## Defense 1: Reduce NDP Cache Size and Aggressiveness

```bash
# Limit incomplete NDP entries time
# Default 3 retries × 1s = 3 seconds
sysctl -w net.ipv6.neigh.eth0.ucast_solicit=1    # Reduce retries
sysctl -w net.ipv6.neigh.eth0.mcast_solicit=1    # Reduce retries
sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=200 # Faster timeout

# Aggressive GC to clear overflow
sysctl -w net.ipv6.neigh.default.gc_interval=5   # GC every 5s
sysctl -w net.ipv6.neigh.default.gc_stale_time=10 # Clear stale after 10s
```

## Defense 2: Rate Limit NS Messages with nftables

```bash
# Limit NS rate from any single source
nft add table ip6 ndp_protection
nft add chain ip6 ndp_protection input '{ type filter hook input priority 0; }'

# Rate limit: max 10 NS per second per source
nft add rule ip6 ndp_protection input \
    icmpv6 type nd-neighbor-solicit \
    meter ndp_rate '{ ip6 saddr limit rate 10/second burst 20 packets }' \
    accept

# Block excess NS
nft add rule ip6 ndp_protection input \
    icmpv6 type nd-neighbor-solicit \
    drop

# Show meter state
nft list meter ip6 ndp_protection ndp_rate
```

## Defense 3: Block Scanning on Router

```bash
# Use ip6tables to limit NS generation for unknown hosts
# Limit INCOMPLETE entries: router generates NS to unknown addresses
ip6tables -A FORWARD -m state --state INVALID -j DROP

# Rate limit new connection attempts per source prefix
ip6tables -A INPUT -p udp --dport 1:1023 \
    -m hashlimit \
    --hashlimit-above 100/sec \
    --hashlimit-burst 200 \
    --hashlimit-mode srcip \
    --hashlimit-name ndp-throttle \
    -j DROP

# Block traffic to unallocated parts of prefix
# (Only allow legitimate host range)
ip6tables -A FORWARD -d 2001:db8:1::/64 \
    -m comment --comment "known hosts only" \
    -j LOG --log-prefix "NDP-unknown: "
```

## Defense 4: Cisco First Hop Security

```text
! Cisco IOS - IPv6 First Hop Security (NDP Inspection)
ipv6 nd inspection policy INSPECT
 validate source-mac
 !

interface GigabitEthernet0/1
 ipv6 nd inspection attach-policy INSPECT

! Limit neighbor discovery cache size and entry lifetime
ipv6 nd cache interface-limit 1024
ipv6 nd cache expire 60
```

## Defense 5: Limit Address Space per Prefix

```bash
# Create firewall rules to only allow a /96 subset for hosts
# (Reduces attack surface from 2^64 to 2^32)

# Only allow traffic to documented host range
ip6tables -A FORWARD \
    -d 2001:db8:1::/96 \
    -j ACCEPT

ip6tables -A FORWARD \
    -d 2001:db8:1::/64 \
    ! -d 2001:db8:1::/96 \
    -j DROP  # Block other addresses in the /64
```

## Monitoring for Ongoing Attacks

```bash
#!/bin/bash
# ndp-attack-monitor.sh

THRESHOLD=1000
ALERT_EMAIL="netops@example.com"

while true; do
    INCOMPLETE=$(ip -6 neigh show nud incomplete | wc -l)
    FAILED=$(ip -6 neigh show nud failed | wc -l)
    TOTAL=$((INCOMPLETE + FAILED))

    if [ ${TOTAL} -gt ${THRESHOLD} ]; then
        MSG="NDP cache attack detected: ${TOTAL} incomplete/failed entries"
        echo "$(date): ${MSG}"
        # mail -s "NDP Attack Alert" ${ALERT_EMAIL} <<< "${MSG}"

        # Emergency: flush incomplete/failed entries
        ip -6 neigh flush nud incomplete
        ip -6 neigh flush nud failed
    fi

    sleep 30
done
```

## Conclusion

NDP cache overflow attacks exploit the 2^64 address space of /64 prefixes to exhaust router neighbor tables. Defenses are layered: reduce NDP retransmit counts (1 retry vs 3), aggressive GC settings, nftables rate limiting on NS messages, and first-hop security features on Cisco/Juniper. Monitoring INCOMPLETE entry counts is the primary detection method - alert when exceeding 500-1000 entries. Consider limiting the effective host space to a /96 subset to reduce attack surface from 2^64 to a manageable 2^32 addresses.
