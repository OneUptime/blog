# How to Understand EIGRPv6 for IPv6 Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EIGRPv6, IPv6, Cisco, Routing, EIGRP

Description: Understand EIGRPv6 - Cisco's proprietary distance-vector IPv6 routing protocol - including its operation, metric components, and differences from EIGRP for IPv4.

## Overview

EIGRPv6 (Enhanced Interior Gateway Routing Protocol for IPv6) is a Cisco-developed advanced distance-vector protocol for IPv6. It uses the DUAL (Diffusing Update Algorithm) for loop-free routing and fast convergence.

## EIGRPv6 Key Characteristics

| Feature | Value |
|---------|-------|
| Protocol type | Advanced distance-vector (Cisco-developed) |
| Protocol number | 88 (same as EIGRP) |
| Transport | IPv6 |
| Multicast | ff02::a (All EIGRP routers) |
| Adjacency | Link-local addresses |
| Metric | Composite (bandwidth + delay, optionally load + reliability) |
| Administrative distance | 90 (internal), 170 (external) |
| Maximum hops | 255 (default 100) |

## EIGRPv6 vs EIGRP for IPv4

| Feature | EIGRP (IPv4) | EIGRPv6 |
|---------|-------------|---------|
| Network statement | Yes (per subnet) | No - enabled per interface |
| Shutdown by default | No | Yes - must use `no shutdown` |
| Router ID | Optional (auto-selected from highest local IPv4) | Required, but can be auto-derived from IPv4; set manually in IPv6-only cases |
| Authentication | MD5/HMAC-SHA-256 | MD5/HMAC-SHA-256 (same) |
| Adjacency | IPv4 addresses | IPv6 link-local addresses |

## DUAL Algorithm Overview

EIGRPv6 uses DUAL to compute loop-free paths:

```mermaid
graph TD
    A[Topology Change Detected] --> B{Is Feasible Successor available?}
    B -->|Yes| C[Install Feasible Successor - Fast Convergence]
    B -->|No| D[Send Query to all neighbors]
    D --> E[Wait for Replies]
    E --> F[Run DUAL - Compute new Successor]
    F --> G[Install new route]
```

- **Successor**: The best path to a destination
- **Feasible Successor**: Backup path that is guaranteed loop-free (kept in topology table)

## EIGRPv6 Metric Components

The classic composite metric uses:
```text
Metric = 256 × {[K1 × BW + (K2 × BW)/(256 - Load) + K3 × Delay] × [K5/(Reliability + K4)]}
If K5 = 0, the rightmost term is treated as 1
```

Default K values: K1=1, K2=0, K3=1, K4=0, K5=0 → simplifies to:
```text
Metric = 256 × [(10^7 / min_bandwidth_kbps) + sum_of_delays_in_tens_of_microseconds]
Equivalent scaled form:
  BW = (10^7 / min_bandwidth_kbps) × 256
  Delay = (sum_of_delays / 10) × 256
  Metric = BW + Delay
```

## Summary

EIGRPv6 brings the advanced features of EIGRP - DUAL fast convergence, feasible successors, and composite metric - to IPv6. Key differences from IPv4 EIGRP are that EIGRPv6 is interface-activated (not network-statement based), is shut down by default, requires a router ID, and uses IPv6 link-local addresses for adjacency. In IPv6-only deployments, the router ID is typically set manually. It is mainly found in Cisco-centric networks.
