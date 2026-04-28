# How to Understand NUD States (REACHABLE, STALE, DELAY, PROBE)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, NUD States, Neighbor Cache, IPv6, RFC 4861

Description: Deep-dive into each NUD state in the IPv6 neighbor cache, what each state means operationally, how to observe state transitions, and how to tune state timers.

## Introduction

The IPv6 Neighbor Unreachability Detection (NUD) state machine has five primary states: INCOMPLETE, REACHABLE, STALE, DELAY, and PROBE (plus FAILED). Each state represents a different level of confidence about a neighbor's reachability. Understanding what each state means operationally is essential for debugging connectivity issues and tuning failover performance in high-availability deployments.

## State-by-State Analysis

```bash
# View all neighbor cache entries with their states

ip -6 neigh show

# Example output (common states you'll see):
# 2001:db8::1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE
# 2001:db8::2 dev eth0 lladdr 00:11:22:aa:bb:cc STALE
# 2001:db8::3 dev eth0                          INCOMPLETE
# 2001:db8::4 dev eth0 lladdr 00:11:22:dd:ee:ff FAILED

# Show entry for specific address
ip -6 neigh show 2001:db8::1 dev eth0

# Show all entries including PERMANENT (static entries)
ip -6 neigh show nud all dev eth0
```

## INCOMPLETE State

```bash
# INCOMPLETE: NS sent, waiting for NA reply
# No MAC address known; packets may be queued

# Trigger INCOMPLETE state by pinging a new address
ping6 -c 1 -W 1 2001:db8::new 2>/dev/null &
sleep 0.1
ip -6 neigh show | grep INCOMPLETE

# INCOMPLETE typically lasts < 1 second (NS/NA round-trip)
# If address is unreachable: stays INCOMPLETE → FAILED
# After MAX_MULTICAST_SOLICIT (default 3) probes: FAILED

# Tune: how many multicast NS probes before FAILED
cat /proc/sys/net/ipv6/neigh/eth0/mcast_solicit
# Default: 3
```

## REACHABLE State

```bash
# REACHABLE: Recently confirmed; MAC known; traffic flows
# State after: NA received, or TCP ACK from neighbor

# Duration is randomized between 0.5x and 1.5x base_reachable_time
cat /proc/sys/net/ipv6/neigh/eth0/base_reachable_time_ms
# Default: 30000 ms = 30 seconds base (actual: 15-45 seconds)

# Force an entry to REACHABLE by sending a ping and getting a reply
ping6 -c 1 2001:db8::1
ip -6 neigh show | grep 2001:db8::1
# Should show REACHABLE immediately after successful ping

# Add a static entry (never expires; state will be PERMANENT, not REACHABLE)
sudo ip -6 neigh add 2001:db8::1 lladdr 00:11:22:33:44:55 dev eth0
ip -6 neigh show | grep PERMANENT
```

## STALE State

```bash
# STALE: REACHABLE_TIME expired; MAC known; no recent confirmation
# Traffic still uses cached MAC (no NS needed unless packet is sent)
# First packet after STALE → moves to DELAY state

# Force STALE by waiting out REACHABLE_TIME (or simulate):
# Or simply observe: entries naturally age to STALE
watch -n 5 'ip -6 neigh show | grep -E "REACHABLE|STALE"'

# STALE entries are NOT immediately probed
# They remain STALE until traffic is sent to that neighbor
# This avoids unnecessary NS traffic for idle neighbors
```

## DELAY State

```bash
# DELAY: First packet sent to a STALE neighbor
# Duration: DELAY_FIRST_PROBE_TIME (default 5 seconds)
# If upper-layer confirms reachability (TCP ACK): → REACHABLE
# If no confirmation: → PROBE state

# Tune DELAY time for faster NUD
cat /proc/sys/net/ipv6/neigh/eth0/delay_first_probe_time
# Default: 5 (seconds)

# Reduce for faster failover (at cost of more NS traffic)
sudo sysctl -w net.ipv6.neigh.eth0.delay_first_probe_time=1

# Observe DELAY state (brief, often hard to catch):
watch -n 0.5 'ip -6 neigh show | grep DELAY'
```

## PROBE State

```bash
# PROBE: Actively sending unicast NS probes to verify reachability
# Duration: up to MAX_UNICAST_SOLICIT × RETRANS_TIMER

cat /proc/sys/net/ipv6/neigh/eth0/ucast_solicit
# Default: 3 (max unicast NS probes)

cat /proc/sys/net/ipv6/neigh/eth0/retrans_time_ms
# Default: 1000 ms between probes

# Total PROBE time: 3 × 1000ms = 3 seconds max before FAILED

# Capture unicast NS probes (PROBE state sends to unicast, not multicast)
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and not dst ff02::/16"

# Tune for faster PROBE detection
sudo sysctl -w net.ipv6.neigh.eth0.ucast_solicit=2
sudo sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=500
# New total: 2 × 500ms = 1 second before FAILED
```

## FAILED State

```bash
# FAILED: All probes failed; neighbor is unreachable
# Traffic to this neighbor is dropped
# ICMPv6 Destination Unreachable Code 3 sent to applications

# Check for FAILED entries (indicates dead neighbors)
ip -6 neigh show | grep FAILED
# FAILED entries are a red flag: check if the neighbor is down

# FAILED entries are removed from cache after gc_stale_time
cat /proc/sys/net/ipv6/neigh/eth0/gc_stale_time
# Default: 60 seconds

# Remove a FAILED entry manually
sudo ip -6 neigh del 2001:db8::1 dev eth0

# Clear all FAILED entries
sudo ip -6 neigh flush nud failed dev eth0
```

## Conclusion

The NUD state machine provides precise visibility into the current status of IPv6 neighbor relationships. REACHABLE means recently confirmed, STALE means aged but cached, DELAY means recently sent to a stale entry, PROBE means actively verifying, and FAILED means all probes exhausted. For high-availability deployments, reduce `base_reachable_time_ms`, `delay_first_probe_time`, `ucast_solicit`, and `retrans_time_ms` to achieve sub-5-second failure detection. Monitor FAILED entries as indicators of unreachable neighbors that require investigation.
