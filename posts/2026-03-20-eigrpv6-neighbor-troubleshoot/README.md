# How to Troubleshoot EIGRPv6 Neighbor Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, IPv6, Troubleshooting, Cisco, Routing

Description: Learn how to diagnose and resolve EIGRPv6 neighbor adjacency failures on Cisco routers, including the common shutdown issue, timer mismatches, and AS number conflicts.

## Overview

EIGRPv6 neighbor issues have some unique causes compared to EIGRP for IPv4. The most common are: the process was not brought out of shutdown, the Router ID is missing, or AS number/K-value mismatches.

## Step 1: Check the Process is Not Shutdown

**This is the #1 EIGRPv6 issue** - EIGRPv6 has a shutdown feature, so the routing process must be brought up with `no shutdown`:

```text
! Check if EIGRPv6 is shutdown
Router# show ipv6 eigrp

IPv6-EIGRP AS 1
...
Eigrp State: DOWN     ← THIS IS THE PROBLEM

! Fix: bring the process up
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# no shutdown
```

In Named mode, this still applies; use `no shutdown` under the IPv6 address-family.

## Step 2: Verify Router ID is Configured

EIGRPv6 requires an explicit Router ID on IPv6-only routers:

```text
! Check current Router ID
Router# show ipv6 eigrp
! Look for: Router-ID: 0.0.0.0  ← PROBLEM - no Router ID set

! Fix:
Router(config)# ipv6 router eigrp 1
Router(config-rtr)# eigrp router-id 1.1.1.1
Router(config-rtr)# no shutdown
```

## Step 3: Verify EIGRPv6 is Enabled on the Interface

```text
! Check which interfaces have EIGRPv6 enabled
Router# show ipv6 eigrp interfaces

IPv6-EIGRP interfaces for process 1
  Interface     Peers     Xmit Queue   Mean   Pacing Time   Multicast   Pending
                        Un/Reliable    SRTT   Un/Reliable   Flow Timer  Routes
  Gi0/0           1        0/0         8      0/1          50          0

! If an interface is missing:
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ipv6 eigrp 1    ! Add EIGRPv6 to missing interface
```

## Step 4: Check AS Number Match

Both routers must use the same AS number:

```text
! Verify AS number
Router# show ipv6 eigrp
! Look for: AS(1) - AS number must match on both sides

! If AS numbers differ, they will not form adjacency
! Check both routers:
! Router A: ipv6 router eigrp 1
! Router B: ipv6 router eigrp 2  ← MISMATCH
```

## Step 5: Check Hello/Hold Timer Settings

```text
! Show timer values per interface
Router# show ipv6 eigrp interfaces detail

! On typical Ethernet links, common defaults are Hello-interval 5, Hold-time 15
! EIGRP neighbors can still form if these values differ,
! but overly aggressive timers can cause flapping.
! If you change hello-interval, change hold-time as well:
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ipv6 hello-interval eigrp 1 5
Router(config-if)# ipv6 hold-time eigrp 1 15
```

## Step 6: Verify Link-Local Address Exists

```text
! EIGRPv6 needs a link-local address on each interface
Router# show ipv6 interface GigabitEthernet0/0 | include link-local
  IPv6 is enabled, link-local address is FE80::1

! If missing:
Router(config-if)# ipv6 enable
```

## Step 7: Check Authentication

```text
! If authentication is configured, keys must match
Router# show ipv6 eigrp interfaces detail | include Auth
  Authentication mode is md5, key-chain is "EIGRP_KEY"

! Verify the key chain exists and has valid keys
Router# show key chain EIGRP_KEY
```

## Step 8: Debug EIGRPv6

```text
! Enable EIGRPv6 debugging (caution: verbose)
Router# debug ipv6 eigrp
Router# debug eigrp packet

! Look for:
! Neighbor up/down notifications
! "invalid authentication" messages
! "K value mismatch" messages - K values must match

! Disable after diagnosis
Router# no debug all
```

## EIGRPv6 Neighbor Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Process shows as DOWN | Shutdown state | `no shutdown` under `ipv6 router eigrp` |
| No Router ID | IPv6-only router without router-id | `eigrp router-id x.x.x.x` |
| No neighbors at all | AS number or K-value mismatch | Match AS and K values |
| Neighbors flapping | Hello/hold timers set too aggressively | Increase hold-time or restore sane timers |
| Authentication failure | Key chain mismatch | Verify key strings match |

## Summary

EIGRPv6 neighbor problems most often trace to: the process is in shutdown state (fix with `no shutdown`), missing Router ID on IPv6-only routers, AS number or K-value mismatch, or missing link-local addresses on interfaces. Use `show ipv6 eigrp` and `debug ipv6 eigrp` to isolate the issue quickly.
