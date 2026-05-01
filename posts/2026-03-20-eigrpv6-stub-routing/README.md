# How to Configure EIGRPv6 Stub Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, Cisco, IPv6, Stub Routing, Routing

Description: Learn how to configure EIGRPv6 stub routing on Cisco routers to reduce query traffic in hub-and-spoke networks and limit branch router involvement in DUAL computations.

## Overview

EIGRPv6 stub routing designates a router as a stub - it will not be queried during DUAL active route computations. This significantly reduces convergence time in hub-and-spoke networks by preventing query propagation to stub (branch) routers.

## Why Use Stub Routing?

In a hub-and-spoke network without stub routing:
- When a hub loses a route, it sends DUAL Queries to ALL neighbors (including all spoke routers)
- All spoke routers must respond, even if they have no useful information
- Large hub-and-spoke networks suffer long convergence times due to this

With stub routing:
- Stub (spoke) routers are marked as stubs
- Hub routers do NOT send DUAL Queries to stub routers
- Convergence is faster and query scope is limited

## EIGRPv6 Stub Configuration Options

| Option | Routes Advertised | Description |
|--------|-----------------|-------------|
| `stub connected` | Connected only | Only directly connected routes |
| `stub static` | Static only | Only static routes |
| `stub summary` | Summary routes | Only summary routes |
| `stub redistributed` | Redistributed only | Only redistributed routes |
| `stub receive-only` | None | Accepts routes but advertises none |
| `stub` (default) | Connected + Summary | Default stub behavior |

## Classic EIGRPv6 Stub Configuration (Spoke Router)

```text
! On the spoke/branch router
Router-Spoke(config)# ipv6 router eigrp 1
Router-Spoke(config-rtr)# eigrp stub connected    ! Advertise only connected routes
Router-Spoke(config-rtr)# no shutdown
```

## Named EIGRPv6 Stub Configuration

```text
! Named EIGRP stub on spoke router
Router-Spoke(config)# router eigrp MY_WAN
Router-Spoke(config-router)# address-family ipv6 unicast autonomous-system 1
Router-Spoke(config-router-af)# eigrp stub connected
Router-Spoke(config-router-af)# no shutdown
Router-Spoke(config-router-af)# exit-address-family
```

## Hub Router Configuration (No Changes Needed)

The hub router does not need special configuration to recognize stub routers. EIGRPv6 automatically learns stub status from Hello packets.

## Verifying Stub Status

```text
! On the hub router - verify spoke is recognized as stub
Router-Hub# show ipv6 eigrp neighbors detail

IPv6-EIGRP neighbors for process 1
  Address: FE80::2
    Interface: GigabitEthernet0/1, Hold 14, SRTT 8 ms
    Stub Peer Advertising (CONNECTED) Routes
    Suppressing queries

! On the spoke router - confirm the stub command is configured
Router-Spoke# show running-config | section ipv6 router eigrp
ipv6 router eigrp 1
 eigrp stub connected
```

## Receive-Only Stub (No Routes Advertised)

A receive-only stub accepts all EIGRP routes but advertises nothing:

```text
! Perfect for WAN-facing spokes that should not inject any routes
Router-Spoke(config)# ipv6 router eigrp 1
Router-Spoke(config-rtr)# eigrp stub receive-only
Router-Spoke(config-rtr)# no shutdown
```

## Convergence Improvement Measurement

```text
! Before stub: hub queries all spokes on failure
! After stub: hub does not query stub spokes

! Measure EIGRP query scope
Router-Hub# debug eigrp packet query
! Count how many "Query" messages are sent to each neighbor
! With stub neighbors, spoke interfaces show "Suppressing queries"
```

## Summary

EIGRPv6 stub routing reduces DUAL query scope in hub-and-spoke deployments. Configure `eigrp stub connected` on spoke routers. The hub automatically suppresses queries to stub neighbors, resulting in faster convergence. Use `show ipv6 eigrp neighbors detail` on classic EIGRPv6 hubs, or `show eigrp address-family ipv6 1 neighbors detail` in named mode, to confirm stubs are recognized with "Suppressing queries" in the output.
