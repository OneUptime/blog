# How to Configure OSPFv3 on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, Juniper, IPv6, Junos, Routing

Description: Step-by-step guide to configuring OSPFv3 for IPv6 routing on Juniper routers using JunOS, with verification and troubleshooting commands.

## Overview

Juniper JunOS uses a clean hierarchical configuration model for OSPFv3. The protocol is configured under `[edit protocols ospf3]` and supports both single-area and multi-area deployments.

## Basic OSPFv3 Configuration

```text
# Juniper JunOS - OSPFv3 configuration

set protocols ospf3 area 0.0.0.0 interface ge-0/0/0.0
set protocols ospf3 area 0.0.0.0 interface ge-0/0/1.0
set protocols ospf3 area 0.0.0.0 interface lo0.0 passive

# Set the Router ID (required if no IPv4 loopback exists)
set routing-options router-id 1.1.1.1
```

## Full Configuration Example

```text
# Complete JunOS OSPFv3 configuration
protocols {
    ospf3 {
        area 0.0.0.0 {
            interface ge-0/0/0.0 {
                hello-interval 10;
                dead-interval 40;
                metric 10;
            }
            interface ge-0/0/1.0 {
                hello-interval 10;
                dead-interval 40;
            }
            interface lo0.0 {
                passive;  # Don't send Hello on loopback
            }
        }
    }
}

routing-options {
    router-id 1.1.1.1;
}
```

## Configuring Multi-Area OSPFv3

```text
# Area 0 (backbone) and Area 1
set protocols ospf3 area 0.0.0.0 interface ge-0/0/0.0
set protocols ospf3 area 0.0.0.1 interface ge-0/0/1.0

# ABR (Area Border Router) configuration
protocols {
    ospf3 {
        area 0.0.0.0 {
            interface ge-0/0/0.0;
        }
        area 0.0.0.1 {
            interface ge-0/0/1.0;
        }
    }
}
```

## Configuring a Stub Area

```text
# Configure area 1 as a stub (no external routes)
set protocols ospf3 area 0.0.0.1 stub
set protocols ospf3 area 0.0.0.1 stub default-metric 10
set protocols ospf3 area 0.0.0.1 interface ge-0/0/1.0
```

## Route Redistribution into OSPFv3

```bash
# Redistribute static IPv6 routes into OSPFv3
set protocols ospf3 export REDISTRIBUTE_STATIC

set policy-options policy-statement REDISTRIBUTE_STATIC {
    term static_routes {
        from protocol static;
        then accept;
    }
}
```

## Verification Commands

```text
# Show OSPFv3 neighbor state
show ospf3 neighbor

# Show OSPFv3 neighbor detail
show ospf3 neighbor detail

# Show OSPFv3 interfaces
show ospf3 interface

# Show OSPFv3 Link State Database
show ospf3 database

# Show OSPFv3 routes
show ospf3 route

# Show IPv6 routing table (OSPFv3 routes)
show route protocol ospf3 table inet6.0
```

## Sample Verification Output

```text
user@router> show ospf3 neighbor
ID               Interface            State      Pri   Dead
2.2.2.2          ge-0/0/0.0           Full       128   38
3.3.3.3          ge-0/0/1.0           Full       128   35

user@router> show ospf3 route
Topology default Route Table:

Prefix                                       Path  Route      NH   Metric
                                             Type  Type       Type
2001:db8:2::/64                              Intra Network    IP   10
  NH-interface ge-0/0/0.0, NH-addr fe80::2a0:a5ff:fe12:3456
2001:db8:3::/64                              Intra Network    IP   20
  NH-interface ge-0/0/1.0, NH-addr fe80::2a0:a5ff:fe78:9abc
```

## Enabling OSPFv3 Authentication (IPsec)

```text
# JunOS OSPFv3 IPsec authentication
set security ipsec security-association SA1 mode transport
set security ipsec security-association SA1 manual direction bidirectional protocol ah
set security ipsec security-association SA1 manual direction bidirectional spi 256
set security ipsec security-association SA1 manual direction bidirectional authentication algorithm hmac-sha1-96 key ascii-text "secretkey"

set protocols ospf3 area 0.0.0.0 interface ge-0/0/0.0 ipsec-sa SA1
```

## Summary

Juniper JunOS OSPFv3 is configured under `[edit protocols ospf3]`. Add interfaces to areas with `set protocols ospf3 area <id> interface <interface>`. Always set a Router ID with `set routing-options router-id`. Verify with `show ospf3 neighbor` and `show route protocol ospf3`.
