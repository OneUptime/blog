# How to Configure DHCPv6 Relay on Juniper - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, DHCPv6, Relay, Junos, DHCP

Description: Set up DHCPv6 relay on Juniper devices to forward DHCPv6 requests from clients to a remote DHCPv6 server.

## Overview

Set up DHCPv6 relay on supported Junos devices to forward DHCPv6 requests from clients to a remote DHCPv6 server.

## Prerequisites

- Supported Junos device running Junos OS 11.4 or later
- Appropriate access privileges (configure exclusive or shared)

## Junos IPv6 Configuration Syntax

Junos uses a hierarchical configuration syntax. DHCPv6 relay and related IPv6 configuration lives primarily under:
- `[edit interfaces]` for interface addressing
- `[edit routing-options rib inet6.0]` for IPv6 routing
- `[edit forwarding-options dhcp-relay dhcpv6]` for DHCPv6 relay
- `[edit firewall family inet6]` for IPv6 ACLs

## Configuration Examples

### Interface IPv6 Configuration

```text
# Junos configuration hierarchy

set interfaces ge-0/0/1 unit 0 family inet6 address 2001:db8:1::1/64

# Or in curly-brace syntax:
interfaces {
    ge-0/0/1 {
        unit 0 {
            family inet6 {
                address 2001:db8:1::1/64;
            }
        }
    }
}
```

### IPv6 Static Route

```text
set routing-options rib inet6.0 static route 2001:db8:200::/64 next-hop 2001:db8:0:1::2

# Discard route (black hole)
set routing-options rib inet6.0 static route ::/0 reject
```

### IPv6 Firewall Filter

```text
firewall {
    family inet6 {
        filter IPV6-INGRESS {
            term allow-dhcpv6-client {
                from {
                    protocol udp;
                    source-port 546;
                    destination-port 547;
                }
                then accept;
            }
            term allow-icmpv6 {
                from {
                    protocol icmp6;
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
    ge-0/0/1 {
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

### DHCPv6 Relay

```text
set forwarding-options dhcp-relay dhcpv6 server-group dhcpv6-servers 2001:db8:200::10
set forwarding-options dhcp-relay dhcpv6 active-server-group dhcpv6-servers
set forwarding-options dhcp-relay dhcpv6 group access-links interface ge-0/0/1.0

# Or in curly-brace syntax:
forwarding-options {
    dhcp-relay {
        dhcpv6 {
            server-group dhcpv6-servers {
                2001:db8:200::10;
            }
            active-server-group dhcpv6-servers;
            group access-links {
                interface ge-0/0/1.0;
            }
        }
    }
}
```

## Verification Commands

```text
# Show DHCPv6 relay bindings
show dhcpv6 relay binding

# Show DHCPv6 relay statistics
show dhcpv6 relay statistics

# Show IPv6 routing table
show route table inet6.0

# Show NDP neighbors
show ipv6 neighbors

# Ping the remote DHCPv6 server over IPv6
ping inet6 2001:db8:200::10 count 5
```

## Traceoptions Debugging

```text
# Enable DHCP relay tracing
set system processes dhcp-service traceoptions file dhcpv6-relay.log size 1m files 3
set system processes dhcp-service traceoptions level verbose
set system processes dhcp-service traceoptions flag packet
set system processes dhcp-service traceoptions flag interface

# View trace output
show log dhcpv6-relay.log
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Juniper device's IPv6 connectivity. Configure ICMP monitors targeting the device's IPv6 address and set up SNMP monitors for interface status.

## Conclusion

How to Configure DHCPv6 Relay on Juniper follows Juniper's hierarchical configuration syntax. IPv6 configuration under `family inet6` is analogous to IPv4's `family inet`. Always commit changes carefully with `commit check` before `commit`, and use `rollback` if issues arise.
