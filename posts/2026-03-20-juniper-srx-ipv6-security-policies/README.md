# How to Configure IPv6 Security Policies on Juniper SRX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, SRX, IPv6, Security Policies, Firewall

Description: Configure stateful IPv6 security policies on Juniper SRX firewalls for zone-based traffic control.

## Overview

Configure stateful IPv6 security policies on Juniper SRX firewalls for zone-based traffic control.

## Prerequisites

- Juniper SRX device running a Junos OS release that supports IPv6 security policies
- On SRX300 Series devices, enable IPv6 flow-based forwarding before using IPv6 security policies
- Appropriate access privileges (configure exclusive or shared)

## Junos IPv6 Configuration Syntax

Junos uses a hierarchical configuration syntax. IPv6 configuration lives primarily under:
- `[edit interfaces]` for interface addressing
- `[edit routing-options rib inet6.0]` for IPv6 routing
- `[edit security forwarding-options family inet6]` for IPv6 flow-based forwarding
- `[edit security zones]` for zone assignment
- `[edit security address-book]` and `[edit security policies]` for stateful SRX security policies

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
set routing-options rib inet6.0 static route 2001:db8:100::/48 next-hop 2001:db8:0:1::254

# Discard route (black hole)
set routing-options rib inet6.0 static route 2001:db8:dead::/48 reject
```

### IPv6 Security Zones and Flow-Based Forwarding

```text
security {
    forwarding-options {
        family {
            inet6 {
                mode flow-based;
            }
        }
    }
    zones {
        security-zone trust {
            interfaces {
                ge-0/0/1.0;
            }
        }
        security-zone untrust {
            interfaces {
                ge-0/0/0.0;
            }
        }
    }
}
```

### IPv6 Security Policy

```text
security {
    address-book {
        global {
            address trust-v6-net 2001:db8:1::/64;
            address remote-v6-net 2001:db8:100::/48;
        }
    }
    policies {
        from-zone trust to-zone untrust {
            policy allow-ipv6-outbound {
                match {
                    source-address trust-v6-net;
                    destination-address remote-v6-net;
                    application any;
                }
                then {
                    permit;
                }
            }
        }
    }
}
```

## Verification Commands

```text
# Confirm IPv6 forwarding mode
show security flow status

# Show IPv6 routing table
show route table inet6.0

# Show security zones
show security zones

# Show configured policies
show security policies from-zone trust to-zone untrust

# Test an IPv6 policy lookup
show security match-policies from-zone trust to-zone untrust source-ip 2001:db8:1::10 destination-ip 2001:db8:100::10 source-port 12345 destination-port 443 protocol tcp

# Show active IPv6 sessions
show security flow session family inet6
```

## Traceoptions Debugging

```text
# Enable IPv6 security flow debug
set security flow traceoptions file flow-debug.log size 1m files 3
set security flow traceoptions flag basic-datapath
set security flow traceoptions flag session

# View trace output
show log flow-debug.log | last 50
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Juniper device's IPv6 connectivity. Configure ICMP monitors targeting the device's IPv6 address and set up SNMP monitors for interface status.

## Conclusion

How to Configure IPv6 Security Policies on Juniper SRX follows Juniper's hierarchical configuration syntax. Interface IPv6 addressing still uses `family inet6`, but stateful SRX traffic control is configured under `security zones` and `security policies`. Always commit changes carefully with `commit check` before `commit`, and use `rollback` if issues arise.
