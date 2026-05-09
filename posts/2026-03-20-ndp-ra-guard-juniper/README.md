# How to Configure RA Guard on Juniper Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RA Guard, Juniper, IPv6 Security, NDP Security, EX Series, Junos

Description: Configure IPv6 RA Guard on Juniper EX Series switches using Junos to protect host-facing ports from rogue Router Advertisement attacks.

## Introduction

Juniper EX Series switches implement RA Guard through the `router-advertisement-guard` feature in Junos OS, configured under the `[edit forwarding-options access-security]` hierarchy. RA Guard requires a policy with accept/discard criteria, applied either to individual interfaces or to a VLAN. Interfaces can also be statically marked as `trusted` or `block` to bypass policy checks. This guide covers Junos configuration for EX Series switches running Junos OS 15.1X53-D55 or later.

## RA Guard in Junos Architecture

Juniper implements RA Guard as one component of the broader IPv6 first-hop security framework.

```text
Juniper IPv6 First-Hop Security Components:

  - RA Guard (router-advertisement-guard): filters RA on untrusted ports
  - DHCPv6 snooping (dhcp-security): tracks DHCPv6 bindings
  - Neighbor Discovery Inspection: validates ND against snooping table
  - IPv6 Source Guard: validates source addresses against bindings

Configuration Hierarchy:
  [edit forwarding-options access-security router-advertisement-guard]
    policy <policy-name> {
      accept { ... }       ← match conditions for allowed RAs
      discard { ... }      ← match conditions for blocked RAs
    }
    interface <interface> {
      mark-interface trusted | block;   ← bypass policy (always allow/block)
      policy <policy-name> {
        stateless;          ← validate each RA against policy
        stateful;           ← learn router on interface, then enforce
      }
    }
    vlans <vlan-name> {
      policy <policy-name> {
        stateless | stateful;
      }
    }
```

## Basic RA Guard Configuration

Configure a policy, apply it to a VLAN, then mark the uplink as trusted.

```text
# Step 1: Create an accept policy that allows RAs from a known router MAC
set forwarding-options access-security router-advertisement-guard \
    policy ra-allow accept match-list source-mac-address-list trusted-routers
set policy-options source-mac-address-list trusted-routers \
    00:11:22:33:44:55/48

# Step 2: Apply the policy to the VLAN in stateless mode
set forwarding-options access-security router-advertisement-guard \
    vlans v10 policy ra-allow stateless

# Step 3: Mark the uplink (router-facing) interface as trusted
# Trusted interfaces forward all RAs without policy checks
set forwarding-options access-security router-advertisement-guard \
    interface ge-0/0/23.0 mark-interface trusted

# Step 4: Commit the configuration
commit

# Verify
# show access-security router-advertisement state
# show access-security router-advertisement statistics
```

## Full Configuration in Junos Hierarchy Format

```text
# Complete RA Guard configuration for VLAN 10

forwarding-options {
    access-security {
        router-advertisement-guard {
            policy ra-allow {
                accept {
                    match-list {
                        source-mac-address-list trusted-routers;
                    }
                    match-option {
                        hop-limit {
                            minimum 64;
                        }
                        managed-config-flag on;
                    }
                }
            }
            interface ge-0/0/23.0 {
                mark-interface trusted;   # uplink: always forward RAs
            }
            vlans v10 {
                policy ra-allow {
                    stateless;            # enforce policy on VLAN v10
                }
            }
        }
    }
}

policy-options {
    source-mac-address-list trusted-routers {
        00:11:22:33:44:55/48;
    }
}

vlans {
    v10 {
        vlan-id 10;
    }
}

interfaces {
    # Access ports (host-facing) - RAs are filtered by VLAN policy
    ge-0/0/0 {
        unit 0 {
            family ethernet-switching {
                interface-mode access;
                vlan {
                    members v10;
                }
            }
        }
    }

    # Uplink/router port - marked trusted above
    ge-0/0/23 {
        unit 0 {
            family ethernet-switching {
                interface-mode trunk;
                vlan {
                    members all;
                }
            }
        }
    }
}
```

> Note: After you apply a policy to an interface, you must also enable RA
> guard on the corresponding VLAN - otherwise the interface policy has no
> effect on received RA packets.

## Configuring RA Guard with DHCPv6 Snooping Together

In production, deploy RA Guard alongside DHCPv6 snooping for complete first-hop protection. DHCPv6 snooping uses a separate hierarchy under `[edit vlans]`.

```text
# RA Guard on the VLAN (forwarding-options access-security)
set forwarding-options access-security router-advertisement-guard \
    vlans v10 policy ra-allow stateless
set forwarding-options access-security router-advertisement-guard \
    interface ge-0/0/23.0 mark-interface trusted

# DHCPv6 snooping on the VLAN (vlans forwarding-options dhcp-security)
set vlans v10 forwarding-options dhcp-security group trusted-dhcp \
    overrides trusted
set vlans v10 forwarding-options dhcp-security group trusted-dhcp \
    interface ge-0/0/23.0

# The untrusted access ports are now protected from:
# - Rogue Router Advertisements (RA Guard)
# - Rogue DHCPv6 servers (DHCPv6 snooping)
```

## Verification and Monitoring

Use Junos operational commands to verify RA Guard state and activity.

```bash
# Show RA Guard state for all interfaces
show access-security router-advertisement state

# Show RA Guard state for a specific interface
show access-security router-advertisement state interface ge-0/0/0.0

# Show RA Guard statistics (including drop counts)
show access-security router-advertisement statistics

# Show committed RA Guard configuration
show configuration forwarding-options access-security router-advertisement-guard

# Example state output:
# Interface          State
# ge-0/0/0.0         FORWARDING
# ge-0/0/23.0        TRUSTED
#
# Interface states:
#   OFF        - RA guard inactive on this interface
#   LEARNING   - stateful mode, identifying the router (stateful only)
#   FORWARDING - RAs validated against policy, matching ones forwarded
#   BLOCKING   - all ingress RAs dropped on this interface
#   TRUSTED    - all ingress RAs forwarded without policy checks
```

## Troubleshooting

```bash
# Check RA Guard state on a host port
show access-security router-advertisement state interface ge-0/0/0.0
# Expected output for a host port:
# Interface: ge-0/0/0.0
# State: FORWARDING       (policy is enforced; matching RAs forwarded)

# Verify trusted port bypasses policy
show access-security router-advertisement state interface ge-0/0/23.0
# Expected output for a router port:
# Interface: ge-0/0/23.0
# State: TRUSTED          (all RAs forwarded, no policy checks)

# Check drop counters
show access-security router-advertisement statistics

# Common Issues:
#
# Issue 1: Legitimate RAs being dropped on the router-facing port
#   Fix: Mark the uplink as trusted
#   set forwarding-options access-security router-advertisement-guard \
#       interface ge-0/0/23.0 mark-interface trusted
#
# Issue 2: Policy applied to interface has no effect
#   Cause: RA Guard not enabled on the VLAN containing the interface
#   Fix: Enable RA Guard on the VLAN
#   set forwarding-options access-security router-advertisement-guard \
#       vlans v10 policy ra-allow stateless
#
# Issue 3: router-advertisement-guard hierarchy not recognized
#   Cause: Junos version too old; this feature requires 15.1X53-D55+
#   Check: show version
```

## Monitoring RA Guard with Syslog

```text
# Configure logging for access-security events
set system syslog file ra-guard-log any info
set system syslog file ra-guard-log structured-data

# Filter for RA Guard drops on a switch with structured-data syslog,
# look for messages from the access-security daemon (autbad/eswd) such as:
# RA_GUARD_PKT_DROPPED: RA dropped on interface ge-0/0/1.0,
#   src fe80::bad:cafe, vlan v10

# Monitor in real time
monitor start ra-guard-log
```

## Conclusion

Juniper EX Series switches implement RA Guard through the `router-advertisement-guard` hierarchy under `[edit forwarding-options access-security]`. The configuration model requires a policy (with `accept` or `discard` match criteria), applied to either an interface or a VLAN. Router-facing ports should be statically marked with `mark-interface trusted` so the uplink RAs bypass policy checks. Combine RA Guard with `dhcp-security` on the same VLAN for full first-hop security coverage. Verify with `show access-security router-advertisement state` and `show access-security router-advertisement statistics` to confirm rogue RAs are being dropped.
