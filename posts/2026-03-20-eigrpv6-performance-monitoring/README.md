# How to Monitor EIGRPv6 Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Performance, Monitoring

Description: Learn how to monitor EIGRPv6 performance metrics including convergence time, query scope, SIA routes, and bandwidth utilization on Cisco IOS.

## Overview

EIGRPv6 performance monitoring focuses on convergence speed, query propagation scope, and the detection of Stuck-in-Active (SIA) conditions. These metrics directly impact network availability during topology changes.

## Key Performance Metrics

| Metric | Healthy | Warning |
|--------|---------|---------|
| Active route count | 0 (no routes in DUAL query) | >0 for extended periods |
| SIA routes | 0 | Any SIA = serious issue |
| Query scope | Limited to affected part of the network | Spanning entire network |
| SRTT | <100ms | >500ms |
| RTO | <1000ms | At or near 5000ms |

## Checking Active Routes (DUAL in Progress)

```text
! Check if any routes are in DUAL active state
Router# show ipv6 eigrp topology active

! If this shows routes, DUAL is currently computing
! Routes active for longer than about 1 minute deserve attention
! The default SIA timeout is approximately 3 minutes
```

## Monitoring SIA (Stuck-in-Active) Routes

SIA occurs when a router doesn't receive a Reply to its Query within the allotted time (approximately 3 minutes by default):

```text
! Check for SIA events in logs
Router# show logging | include DUAL-3-SIA

! Typical SIA log message:
! %DUAL-3-SIA: Route 2001:db8:1::/48 stuck-in-active state in IP-EIGRP(0) 1.

! Adjust SIA timer if needed (increase to give more time for replies)
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# timers active-time 4   ! 4 minutes
```

## Monitoring Query Scope

A large query scope indicates poor network design (too flat, missing stub routers or summarization):

```text
! Log repeated EIGRP neighbor warnings during troubleshooting
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# eigrp log-neighbor-warnings 60   ! Log warnings every 60 seconds

! Check how many neighbors are queried during convergence
Router# debug eigrp packets query
! Count "Sending QUERY" lines - fewer is better
! Stub neighbors should not receive transit queries
```

## Bandwidth Utilization

EIGRPv6 limits bandwidth usage on each interface:

```text
! Default: EIGRP uses maximum 50% of interface bandwidth
! Adjust per interface if needed
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 bandwidth-percent eigrp 1 25   ! Limit to 25%

! Check current bandwidth setting
Router# show running-config interface GigabitEthernet0/0
```

## SRTT and RTO Monitoring

SRTT (Smooth Round-Trip Time) indicates neighbor responsiveness:

```text
Router# show ipv6 eigrp neighbors

H   Address           Interface   Hold  Uptime   SRTT   RTO  Q  Seq
0   FE80::2           Gi0/0       14   01:23:45   8    200  0  42
                                              ↑    ↑
                                        SRTT(ms) RTO(ms)

! High SRTT (>200ms) may indicate congested links
! Sustained RTO values near 5000ms indicate delayed acknowledgments
```

## Convergence Time Testing

```text
! Simulate a link failure and measure convergence
! Step 1: Check routes
Router# show ipv6 route eigrp

! Step 2: Shut down an interface
Router# conf t
Router(config)# interface GigabitEthernet0/1
Router(config-if)# shutdown

! Step 3: Measure time until routes converge
! With Feasible Successors: often sub-second convergence
! Without FS: convergence depends on the DUAL query/reply cycle and query scope
```

## SNMP Monitoring for EIGRPv6

```bash
# Poll EIGRP neighbor data via SNMP (CISCO-EIGRP-MIB)

snmpwalk -v2c -c public router-ip CISCO-EIGRP-MIB::cEigrpPeerTable
snmpwalk -v2c -c public router-ip CISCO-EIGRP-MIB::cEigrpTopologyTable

# Key OIDs:
# cEigrpPeerAddr: neighbor address
# cEigrpSrtt: SRTT
# cEigrpRto: retransmission timeout
# cEigrpActive / cEigrpStuckInActive: per-route active/SIA state
```

## Summary

Monitor EIGRPv6 performance with `show ipv6 eigrp topology active` to detect ongoing DUAL computations, `show logging | include DUAL-3-SIA` to catch Stuck-in-Active events, and SRTT values in `show ipv6 eigrp neighbors` to identify slow links. Minimize query scope by deploying stub routing on spoke routers and using summarization at interface boundaries.
