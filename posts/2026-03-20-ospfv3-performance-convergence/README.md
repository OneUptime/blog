# How to Monitor OSPFv3 Performance and Convergence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Performance, Convergence, Monitoring

Description: Learn how to monitor OSPFv3 convergence times, SPF calculations, and LSA flooding performance using FRRouting and Cisco IOS tools.

## Overview

OSPFv3 convergence time is the duration from a topology change to when all routers have updated routing tables. Monitoring SPF timers, LSA flooding, and neighbor state changes helps optimize network reliability and response time.

## Key OSPFv3 Performance Timers

| Timer | Default | Effect |
|-------|---------|--------|
| Hello Interval | 10s (broadcast), 30s (NBMA) | Frequency of Hello packets |
| Dead Interval | 4 × Hello | Time before neighbor declared dead |
| SPF Delay | 0ms (FRR), 5000ms (Cisco) | Wait after topology change before running SPF |
| SPF Initial Hold | 50ms (FRR), 10000ms (Cisco) | Initial hold time between SPF runs |
| LSA Arrival Rate | 1000ms | Minimum time between same LSA retransmissions |

## Monitoring Convergence on FRRouting

```bash
# Show OSPFv3 SPF calculation statistics

vtysh -c "show ipv6 ospf6"

# Output includes SPF timing:
# SPF algorithm last ran: 00:00:05.234 ago
# SPF algorithm ran 15 times
# SPF execution time: 0.002 seconds (last), 0.001 seconds (min), 0.012 seconds (max)
```

## Tuning SPF Timers for Faster Convergence

```bash
# FRRouting - reduce SPF delay for faster convergence
vtysh
configure terminal

router ospf6
 ! timers throttle spf delay initial-hold max-hold (all in milliseconds)
 timers throttle spf 50 200 5000
 ! 50ms delay, 200ms initial hold, 5000ms max hold

! For critical links, reduce hello/dead intervals
interface eth0
 ipv6 ospf6 hello-interval 1
 ipv6 ospf6 dead-interval 3

end
write memory
```

```text
! Cisco - Tune OSPFv3 SPF timers
router ospfv3 1
 address-family ipv6 unicast
  timers throttle spf 50 200 5000

! Reduce hello/dead intervals on a critical link
interface GigabitEthernet0/0
 ospfv3 hello-interval 1
 ospfv3 dead-interval 3
```

## Monitoring LSA Flooding

```bash
# FRRouting - inspect the OSPFv3 LSA database
vtysh -c "show ipv6 ospf6 database"

# Output lists each LSA by type (Router, Network, Inter-Area Prefix,
# AS External, Intra-Area Prefix). Pipe to wc -l or awk to count
# entries by LSA type, e.g.:
vtysh -c "show ipv6 ospf6 database" | awk '/Router/ {n++} END {print n}'
```

## Watching Neighbor State Changes

```bash
# Enable OSPFv3 log adjacency changes in FRRouting
vtysh
configure terminal
router ospf6
 log-adjacency-changes

# Monitor the logs
journalctl -u frr -f | grep "ospf6\|FULL\|DOWN\|2WAY"
```

## OSPFv3 Statistics with SNMP

```bash
# OSPFv3 SNMP OIDs for monitoring (via net-snmp or Prometheus SNMP exporter)
# Per RFC 5643 (OSPFV3-MIB):
# ospfv3AreaSpfRuns:   Per-area SPF calculations (in ospfv3AreaTable)
# ospfv3IfEvents:      Per-interface state changes/errors (in ospfv3IfTable)
# ospfv3NbrEvents:     Per-neighbor state changes (in ospfv3NbrTable)

# These are columnar (table) objects, so walk rather than get:
snmpwalk -v2c -c public router-ip OSPFV3-MIB::ospfv3AreaSpfRuns
```

## Using Prometheus and FRR Exporter

```bash
# Install frr_exporter for Prometheus metrics
# (frr_exporter connects to FRR daemon Unix sockets in /var/run/frr,
#  or optionally via vtysh, to scrape JSON output)
curl -s http://localhost:9342/metrics | grep ospf6

# Key metrics:
# frr_ospf6_spf_calculations_total
# frr_ospf6_neighbor_state_changes_total
# frr_ospf6_lsa_count
```

## Cisco: Enabling OSPFv3 Event Logging

```text
! Enable notification of adjacency changes
router ospfv3 1
 log-adjacency-changes detail

! Show OSPFv3 statistics
Router# show ospfv3 statistics
! Displays: SPF runs, LSAs created, retransmissions, etc.
```

## Summary

OSPFv3 convergence is optimized by tuning SPF throttle timers and reducing Hello/Dead intervals on critical links. Monitor convergence using `show ipv6 ospf6` on FRRouting, `show ospfv3 statistics` on Cisco, and Prometheus with the FRR exporter for continuous observability. Log adjacency changes to catch flapping neighbors early.
