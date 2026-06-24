# How to Configure IPv6 Static Routes on Juniper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, IPv6, Static Routes, Junos, Routing

Description: Add IPv6 static routes and aggregate routes in Juniper Junos routing instances for network reachability.

## Overview

Add IPv6 static routes in Juniper Junos for network reachability.

## Prerequisites

- Juniper device running Junos OS 12.1 or later
- Appropriate access privileges (for example, `configure` or `configure exclusive`)

## Junos IPv6 Configuration Syntax

Junos uses a hierarchical configuration syntax. IPv6 configuration lives primarily under:
- `[edit interfaces]` for interface addressing
- `[edit routing-options rib inet6.0]` for IPv6 routing
- `[edit firewall family inet6]` for IPv6 ACLs

## Configuration Examples

### Interface IPv6 Configuration

```text
# Junos configuration hierarchy

set interfaces ge-0/0/0 unit 0 family inet6 address 2001:db8::1/64

# Or in curly-brace syntax:
interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet6 {
                address 2001:db8::1/64;
            }
        }
    }
}
```

### IPv6 Static Route

```text
set routing-options rib inet6.0 static route 2001:db8:2::/48 next-hop 2001:db8:1:1::2

# Discard route (black hole)
set routing-options rib inet6.0 static route 2001:db8:ffff::/48 discard
```

### IPv6 Firewall Filter

```text
firewall {
    family inet6 {
        filter IPV6-INGRESS {
            term allow-established {
                from {
                    next-header tcp;
                    tcp-established;
                }
                then accept;
            }
            term allow-icmpv6 {
                from {
                    next-header icmp6;
                }
                then accept;
            }
            term deny-rest {
                then {
                    discard;
                    count rejected-packets;
                }
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
                address 2001:db8::1/64;
            }
        }
    }
}
```

### DHCPv6 Server

```nginx
system {
    services {
        dhcp-local-server {
            dhcpv6 {
                group dhcpv6-clients {
                    interface ge-0/0/1.0;
                }
            }
        }
    }
}

access {
    address-assignment {
        pool dhcpv6-pool {
            family inet6 {
                prefix 2001:db8:lan::/64;
                range clients {
                    low 2001:db8:lan::100/128;
                    high 2001:db8:lan::200/128;
                }
                dhcp-attributes {
                    dns-server {
                        2001:4860:4860::8888;
                    }
                    domain-name example.com;
                }
            }
        }
    }
}
```

## Verification Commands

```text
# Show IPv6 addresses
show interfaces ge-0/0/0 detail | match "IPv6|inet6"

# Show IPv6 routing table
show route table inet6.0

# Show NDP neighbors
show ipv6 neighbors

# Show IPv6 neighbors on an interface
show ipv6 neighbors interface ge-0/0/0.0

# Ping over IPv6
ping inet6 2001:db8::1 count 5
```

## Traceoptions Debugging

```text
# Enable IPv6 router advertisement debug
set protocols router-advertisement traceoptions file ra-debug.log
set protocols router-advertisement traceoptions flag all

# View trace output
show log ra-debug.log | last 50
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Juniper device's IPv6 connectivity. Configure ICMP monitors targeting the device's IPv6 address and set up SNMP monitors for interface status.

## Conclusion

How to Configure IPv6 Static Routes on Juniper follows Juniper's hierarchical configuration syntax. IPv6 configuration under `family inet6` is analogous to IPv4's `family inet`. Always commit changes carefully with `commit check` before `commit`, and use `rollback` if issues arise.
