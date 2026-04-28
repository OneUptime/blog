# How to Prevent NDP Exhaustion Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP Exhaustion, IPv6 Security, DoS, Neighbor Discovery, IPv6 Performance

Description: Prevent NDP exhaustion attacks where an attacker floods the neighbor discovery process to exhaust router memory or cause packet loss, using rate limiting and binding table limits.

## Introduction

NDP exhaustion (also called the "NDP neighbor cache exhaustion" attack) occurs when an attacker sends traffic to many unused IPv6 addresses within a subnet, forcing a router to send Neighbor Solicitations for all of them. Since a /64 prefix contains 2^64 addresses, the router's neighbor discovery state machine can be overwhelmed. Modern routers implement mitigations, but understanding and configuring them is essential for secure IPv6 deployments.

## How NDP Exhaustion Works

```text
NDP Exhaustion Attack:

IPv6 subnet: 2001:db8::/64 (2^64 = 18 quintillion addresses)
Router handles the subnet on its interface.

Normal operation:
  Traffic to 2001:db8::1 → router sends NS for ::1 → gets NA → forwards

Attack:
  Attacker sends 10,000 packets/sec to:
    2001:db8::dead:beef:1
    2001:db8::dead:beef:2
    2001:db8::dead:beef:3
    ... (all different, all unused)

  For each destination, the router:
  1. Creates an INCOMPLETE neighbor cache entry
  2. Sends NS to solicited-node multicast
  3. Waits for NA (which never comes)
  4. Retries NS 3 times (default)
  5. Marks FAILED

  With 10,000 unique destinations/sec:
  → 10,000 INCOMPLETE entries created/sec
  → Router's neighbor cache fills up
  → Legitimate entries evicted
  → Legitimate traffic dropped
  → Router CPU spiked (NS generation + table management)
```

## Linux Router: Neighbor Cache Tuning

Linux has several sysctl parameters to control neighbor cache size and eviction.

```bash
# Show current neighbor cache statistics

ip -6 neigh show | wc -l
cat /proc/net/stat/ndisc_cache

# Increase neighbor cache size (default gc_thresh3 = 1024)
# gc_thresh1: below this, no GC runs
# gc_thresh2: GC runs 5 sec after threshold exceeded
# gc_thresh3: hard limit, entries rejected above this
sudo sysctl -w net.ipv6.neigh.default.gc_thresh1=1024
sudo sysctl -w net.ipv6.neigh.default.gc_thresh2=2048
sudo sysctl -w net.ipv6.neigh.default.gc_thresh3=4096

# Reduce INCOMPLETE entry lifetime (evict unresolved entries faster)
# Default retrans_time_ms = 1000ms (1 second between NS retries)
# Default retransmit attempts = 3 (about 3 seconds per entry)
sudo sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=500

# Reduce base_reachable_time (entries become STALE sooner, then collected)
# Default: 30000ms (30 sec)
sudo sysctl -w net.ipv6.neigh.default.base_reachable_time_ms=15000

# Reduce gc_interval (run garbage collection more often)
# Default: 30000ms
sudo sysctl -w net.ipv6.neigh.default.gc_interval=10000

# Reduce gc_stale_time (how long before a stale entry is collected)
# Default: 60 seconds
sudo sysctl -w net.ipv6.neigh.default.gc_stale_time=30
```

## Rate Limiting NS Generation

Limit the rate at which the router generates Neighbor Solicitations.

```bash
# Rate limit outbound Neighbor Solicitations to 100/sec per destination
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbor-solicitation \
    -m hashlimit \
    --hashlimit-above 100/sec \
    --hashlimit-burst 200 \
    --hashlimit-mode dstip \
    --hashlimit-name NS_RATE \
    -j DROP

# Rate limit Neighbor Solicitations per destination subnet
# (limit exploration of any single /64 to 50/sec)
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbor-solicitation \
    -m hashlimit \
    --hashlimit-above 50/sec \
    --hashlimit-burst 100 \
    --hashlimit-mode dstip \
    --hashlimit-dstmask 64 \
    --hashlimit-name NS_SUBNET \
    -j LOG --log-prefix "NDP-EXHAUSTION: "

# Log and drop excess NS
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type neighbor-solicitation \
    -m hashlimit \
    --hashlimit-above 50/sec \
    --hashlimit-burst 100 \
    --hashlimit-mode dstip \
    --hashlimit-dstmask 64 \
    --hashlimit-name NS_SUBNET2 \
    -j DROP
```

## Switch-Level ND Inspection Limits

Limit the number of addresses per port to prevent table exhaustion.

```text
! Cisco: Limit addresses per access port
ipv6 snooping policy LIMIT_POLICY
 security-level guard
 limit address-count 10     ← Max 10 IPv6 per port
 tracking enable

! Apply to all access ports
interface range GigabitEthernet1/0/1 - 23
 ipv6 snooping attach-policy LIMIT_POLICY

! When a host exceeds 10 addresses:
! New address resolution is blocked at the switch level
! Before sending NS for the 11th address, switch drops it

! Monitor address count per port
show ipv6 neighbor binding count

! Alert on ports near the limit
show ipv6 snooping counters | include limit
```

## Cisco Router NDP Throttle

Cisco IOS has built-in NDP throttle for routers.

```text
! On Cisco IOS router: limit ND resolution rate
ipv6 nd cache interface-limit 512

! Limit per-interface NS rate
interface GigabitEthernet0/0
 ipv6 nd cache expire 30 refresh   ← 30 sec expiry, refresh on use
 ipv6 nd nud retry 2 1000 3        ← backoff base 2, 1000ms interval, 3 max attempts

! Monitor NDP table
show ipv6 neighbors
show ipv6 neighbors statistics

! Set global ND resolution limit
ipv6 nd resolution data limit 512  ← Max 512 pending ND resolutions
```

## Filtering Inbound Traffic to Unused Space

The most effective mitigation is to not attempt NDP for traffic to unused addresses.

```bash
# On a Linux router: only forward traffic to known active addresses
# Use a whitelist ACL for the subnets that have actual hosts

# Block traffic to unallocated addresses within the subnet
# If hosts are in 2001:db8::1 - 2001:db8::ff range:
sudo ip6tables -A FORWARD -d 2001:db8::/64 \
    -m iprange --dst-range 2001:db8::100-2001:db8::ffff:ffff:ffff:ffff \
    -j DROP

# This prevents NDP resolution for large parts of the address space
# Attacker traffic to 2001:db8::dead:beef is dropped without triggering ND

# Better: use a specific range for host allocation
# and drop everything outside that range before it hits the NDP code
sudo ip6tables -A FORWARD -d 2001:db8::/64 \
    ! -d 2001:db8::1/120 \
    -j DROP
```

## Conclusion

NDP exhaustion attacks exploit the huge IPv6 address space to overwhelm a router's neighbor discovery process. Mitigations include reducing neighbor cache entry lifetimes, setting gc_thresh limits, rate limiting NS generation with ip6tables, and using switch-level ND Inspection address-count limits per port. The most effective mitigation is dropping traffic to unused address space before it triggers NDP resolution. On Cisco routers, `ipv6 nd resolution data limit` provides a built-in throttle. Monitor for NDP exhaustion with `ip -6 neigh show` size spikes and CPU utilization increases on routers.
