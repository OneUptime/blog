# How to Configure IPv6 Router Advertisements on Juniper - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, IPv6, Router Advertisement, SLAAC, NDP

Description: Configure Router Advertisements (RAs) on Juniper interfaces to enable SLAAC for IPv6 address autoconfiguration.

## Overview

Configure Router Advertisements (RAs) on Juniper interfaces to enable SLAAC for IPv6 address autoconfiguration. On Junos, enabling `family inet6` adds IPv6 addressing to an interface, but router advertisements are configured separately under `protocols router-advertisement`.

## Prerequisites

- Juniper device running Junos OS 12.1 or later
- Appropriate access privileges to enter configuration mode (`configure` or `configure exclusive`)

## Junos IPv6 Configuration Syntax

Junos uses a hierarchical configuration syntax. IPv6 configuration lives primarily under:
- `[edit interfaces]` for interface IPv6 addressing
- `[edit protocols router-advertisement]` for IPv6 router advertisements and SLAAC behavior
- `[edit firewall family inet6]` for IPv6 filters when you need to permit or inspect ICMPv6/NDP traffic

## Configuration Examples

### Interface IPv6 Configuration

```text
# Junos configuration hierarchy

set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8:1::1/64

# Or in curly-brace syntax:
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet6 {
                address 2001:db8:1::1/64;
            }
        }
    }
}
```

### Router Advertisement Configuration

```text
set protocols router-advertisement interface ge-0/0/0.0 max-advertisement-interval 30
set protocols router-advertisement interface ge-0/0/0.0 min-advertisement-interval 10
set protocols router-advertisement interface ge-0/0/0.0 prefix 2001:db8:1::/64

# Optional: include additional RA parameters
set protocols router-advertisement interface ge-0/0/0.0 current-hop-limit 64
set protocols router-advertisement interface ge-0/0/0.0 link-mtu 1500
```

### Router Advertisement Prefix Options

```text
protocols {
    router-advertisement {
        interface ge-0/0/0.0 {
            prefix 2001:db8:1::/64 {
                autonomous;
                on-link;
                valid-lifetime 3600;
                preferred-lifetime 1800;
            }
        }
    }
}
```

### DHCPv6 Integration

```text
# SLAAC with stateless DHCPv6 for DNS and other non-address options
set protocols router-advertisement interface ge-0/0/1.0 other-stateful-configuration
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:2::/64

# Use stateful DHCPv6 address assignment instead of SLAAC-only addressing
set protocols router-advertisement interface ge-0/0/1.0 managed-configuration
set protocols router-advertisement interface ge-0/0/1.0 prefix 2001:db8:2::/64
```

### IPv6 Firewall Filter

```text
firewall {
    family inet6 {
        filter IPV6-INGRESS {
            term allow-icmpv6 {
                from {
                    next-header icmpv6;
                }
                then accept;
            }
            term allow-rest {
                then accept;
            }
        }
    }
}

# Apply to interface
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet6 {
                filter {
                    input IPV6-INGRESS;
                }
                address 2001:db8:1::1/64;
            }
        }
    }
}
```

## Verification Commands

```text
# Show IPv6 interface addressing
show interfaces terse | match inet6

# Show configured router advertisement settings
show configuration protocols router-advertisement

# Show router advertisement status
show ipv6 router-advertisement interface ge-0/0/0.0

# Show NDP neighbors
show ipv6 neighbors

# Ping over IPv6
ping inet6 2001:db8:1::10 count 5
```

## Traceoptions Debugging

```text
# Enable router advertisement traceoptions
set protocols router-advertisement traceoptions file ra-debug.log
set protocols router-advertisement traceoptions flag all

# View trace output
show log ra-debug.log | last 50
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Juniper device's IPv6 connectivity. Configure ICMP monitors targeting the device's IPv6 address and set up SNMP monitors for interface status.

## Conclusion

How to Configure IPv6 Router Advertisements on Juniper follows Juniper's hierarchical configuration syntax. IPv6 configuration under `family inet6` enables IPv6 on the interface, while router advertisements for SLAAC are configured under `protocols router-advertisement`. Always commit changes carefully with `commit check` before `commit`, and use `rollback` if issues arise.
