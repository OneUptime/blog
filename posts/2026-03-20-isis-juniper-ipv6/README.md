# How to Configure IS-IS on Juniper for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IS-IS, Juniper, IPv6, Junos, Routing

Description: Step-by-step guide to configuring IS-IS for IPv6 routing on Juniper routers using JunOS, including multi-topology and per-interface metric configuration.

## Overview

Juniper Junos OS natively supports IS-IS for both IPv4 and IPv6. In this configuration, a separate IPv6 topology is enabled by activating the `ipv6-unicast` topology. The configuration is clean and follows Junos OS's hierarchical structure.

## Basic IS-IS IPv6 Configuration

```text
# Set the NET (ISO network address)

set routing-options router-id 1.1.1.1
set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8:1::1/64
set interfaces ge-0/0/0 unit 0 family iso
set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:4::1/64
set interfaces ge-0/0/1 unit 0 family iso
set interfaces lo0 unit 0 family inet address 1.1.1.1/32
set interfaces lo0 unit 0 family inet6 address 2001:db8::1/128
set interfaces lo0 unit 0 family iso address 49.0001.0001.0001.0001.00
set protocols isis interface lo0.0 passive

# Enable IPv6 topology in IS-IS
set protocols isis topologies ipv6-unicast

# Enable IS-IS on interfaces
set protocols isis interface ge-0/0/0.0 level 2 metric 10
set protocols isis interface ge-0/0/1.0 level 2 metric 10
set protocols isis interface lo0.0 passive

# Set IS-IS level
set protocols isis level 1 disable
```

## Full IS-IS IPv6 Configuration

```text
protocols {
    isis {
        level 1 disable;
        interface ge-0/0/0.0 {
            level 2 {
                metric 10;
            }
        }
        interface ge-0/0/1.0 {
            level 2 {
                metric 10;
            }
        }
        interface lo0.0 {
            passive;
        }
        topologies {
            ipv6-unicast;
        }
    }
}

interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 10.0.0.1/30;
            }
            family inet6 {
                address 2001:db8:1::1/64;
            }
            family iso;
        }
    }
    ge-0/0/1 {
        unit 0 {
            family inet {
                address 10.0.0.5/30;
            }
            family inet6 {
                address 2001:db8:4::1/64;
            }
            family iso;
        }
    }
    lo0 {
        unit 0 {
            family inet { address 1.1.1.1/32; }
            family inet6 { address 2001:db8::1/128; }
            family iso { address 49.0001.0001.0001.0001.00; }
        }
    }
}
```

## Setting IPv6-Specific Interface Metrics

```text
# Set different metrics for IPv6 topology (per-interface)
set protocols isis interface ge-0/0/0.0 level 2 ipv6-unicast-metric 20
set protocols isis interface ge-0/0/1.0 level 2 ipv6-unicast-metric 15
```

## IS-IS Authentication

```text
# Hello authentication per-interface
set protocols isis interface ge-0/0/0.0 level 2 hello-authentication-key "secretkey"
set protocols isis interface ge-0/0/0.0 level 2 hello-authentication-type md5

# Or area-wide authentication
set protocols isis level 2 authentication-key "areakey"
set protocols isis level 2 authentication-type md5
```

## Verification Commands

```text
# Show IS-IS adjacencies
show isis adjacency

# Show IS-IS adjacency detail
show isis adjacency detail

# Show IS-IS link-state database
show isis database

# Show IS-IS IPv6 routes
show route table inet6.0 protocol isis

# Show IS-IS statistics
show isis statistics

# Show IS-IS interface status
show isis interface
```

## Sample Output

```text
user@router> show isis adjacency

Interface       System         L State     Hold (secs) SNPA
ge-0/0/0.0      R2             2  Up             23  0:0:5e:0:1:2

user@router> show route table inet6.0 protocol isis

inet6.0: 8 destinations, 8 routes (8 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both

2001:db8:2::/64        *[IS-IS/18] 00:45:12, metric 20
                        > to 2001:db8:1::2 via ge-0/0/0.0
2001:db8:3::/48        *[IS-IS/18] 00:30:05, metric 30
                        > to 2001:db8:1::2 via ge-0/0/0.0
```

In Junos route output, `18` is the default preference for IS-IS Level 2 internal routes; Level 1 internal routes default to `15`.

## Summary

For a separate IPv6 IS-IS topology on Junos, use `family iso` on IS-IS interfaces, `topologies { ipv6-unicast; }` in the IS-IS protocol block, and IPv6 addresses on participating interfaces. Set per-interface IPv6 metrics with `ipv6-unicast-metric`. Verify with `show isis adjacency` and `show route table inet6.0 protocol isis`.
