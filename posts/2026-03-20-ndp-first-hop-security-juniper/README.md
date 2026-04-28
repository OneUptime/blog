# How to Configure IPv6 First Hop Security on Juniper EX

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: First Hop Security, Juniper, IPv6 Security, EX Series, Junos, RA Guard

Description: Deploy IPv6 First Hop Security on Juniper EX Series switches using Junos, including RA Guard, DHCPv6 snooping, ND security, and IPv6 source guard configuration.

## Introduction

Juniper EX Series switches provide IPv6 First Hop Security through the `dhcp-security` framework (which covers DHCPv6 snooping, IPv6 Neighbor Discovery Inspection, and IPv6 Source Guard) and the separate `router-advertisement-guard` feature under `forwarding-options access-security`. This guide covers complete FHS deployment on Juniper EX switches running ELS-style Junos (the IPv6 source guard / ND inspection features were introduced on EX2200 and EX3300 in Junos OS Release 14.1X53-D10; RA Guard requires a release that supports the `access-security router-advertisement-guard` hierarchy).

## Juniper FHS Architecture

```text
Juniper EX FHS Feature Mapping (ELS):

Cisco Feature          → Juniper Equivalent
RA Guard               → router-advertisement-guard policy applied to VLAN/interface
DHCPv6 Guard           → dhcp-security with trusted DHCPv6 server interface (group ... overrides trusted)
ND Inspection          → dhcp-security neighbor-discovery-inspection
IPv6 Source Guard      → dhcp-security ipv6-source-guard
IPv6 Snooping          → DHCPv6 snooping (auto-enabled by ND inspection or ipv6-source-guard)

Configuration Location:
  ND Inspection / IPv6 Source Guard / DHCPv6 snooping:
    [edit vlans <name> forwarding-options dhcp-security]
      neighbor-discovery-inspection
      ipv6-source-guard
      group <group-name> { interface <if-name>; overrides { trusted; } }

  RA Guard:
    [edit forwarding-options access-security router-advertisement-guard]
      policy <policy-name> { ... }
      vlan <vlan-name> { policy <policy-name>; }
      interface <if-name> { policy <policy-name>; }
```

## Complete FHS Configuration

```text
# Full Juniper EX FHS configuration for VLAN 10 and VLAN 20 (ELS)

# Step 1: Configure VLANs
set vlans v10 vlan-id 10
set vlans v20 vlan-id 20

# Step 2: Enable ND Inspection and IPv6 Source Guard on the VLANs.
# (Configuring either of these auto-enables DHCPv6 snooping for the VLAN.)
set vlans v10 forwarding-options dhcp-security neighbor-discovery-inspection
set vlans v10 forwarding-options dhcp-security ipv6-source-guard
set vlans v20 forwarding-options dhcp-security neighbor-discovery-inspection
set vlans v20 forwarding-options dhcp-security ipv6-source-guard

# Step 3: Configure access interfaces (host ports). Access ports are
# untrusted for DHCP snooping by default, so DHCPv6 server messages
# from these ports will be dropped automatically.
set interfaces ge-0/0/0 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/0 unit 0 family ethernet-switching vlan members v10

set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members v10

# Step 4: Configure the uplink as a trunk. Trunk ports are trusted
# for DHCP snooping by default, so no extra config is needed for
# DHCPv6 server messages to flow through the uplink.
set interfaces ge-0/0/23 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/23 unit 0 family ethernet-switching vlan members all

# Step 5: If the DHCPv6 server is reached through a specific access
# port (rather than the trunk), explicitly mark that port as trusted
# by placing it in a group with overrides trusted:
# set vlans v10 forwarding-options dhcp-security group dhcp-servers interface ge-0/0/22
# set vlans v10 forwarding-options dhcp-security group dhcp-servers overrides trusted

# Step 6: Configure RA Guard. RA Guard lives under
# forwarding-options access-security and is applied to VLAN(s)
# and/or interface(s). Build a policy that only accepts RAs from
# trusted upstream routers, then attach it to the VLAN.
set forwarding-options access-security router-advertisement-guard \
    policy ALLOW_TRUSTED_RA accept match-option router-preference high
set forwarding-options access-security router-advertisement-guard \
    vlan v10 policy ALLOW_TRUSTED_RA
set forwarding-options access-security router-advertisement-guard \
    vlan v20 policy ALLOW_TRUSTED_RA

# Optional: also pin the policy to the upstream interface. If you
# attach a policy to an interface, you must also enable RA guard
# on the VLAN associated with that interface (done above).
set forwarding-options access-security router-advertisement-guard \
    interface ge-0/0/23.0 policy ALLOW_TRUSTED_RA
```

## Junos Hierarchy Format Configuration

```text
# Complete configuration in Junos bracket format

vlans {
    v10 {
        vlan-id 10;
        forwarding-options {
            dhcp-security {
                neighbor-discovery-inspection;
                ipv6-source-guard;
                # DHCPv6 snooping is auto-enabled because
                # neighbor-discovery-inspection / ipv6-source-guard
                # are enabled on the VLAN.
            }
        }
    }
    v20 {
        vlan-id 20;
        forwarding-options {
            dhcp-security {
                neighbor-discovery-inspection;
                ipv6-source-guard;
            }
        }
    }
}

interfaces {
    # Access ports (ge-0/0/0 through ge-0/0/22) - access ports are
    # untrusted by default, so DHCPv6 server messages are dropped
    # and ND/IPv6 source-guard checks are enforced.
    ge-0/0/0 {
        unit 0 {
            family ethernet-switching {
                interface-mode access;
                vlan { members v10; }
            }
        }
    }

    # Uplink port - trunk ports are trusted for DHCP snooping by
    # default, so DHCPv6 server messages are forwarded.
    ge-0/0/23 {
        unit 0 {
            family ethernet-switching {
                interface-mode trunk;
                vlan { members all; }
            }
        }
    }
}

forwarding-options {
    access-security {
        router-advertisement-guard {
            policy ALLOW_TRUSTED_RA {
                accept {
                    match-option {
                        router-preference high;
                    }
                }
            }
            vlan v10 { policy ALLOW_TRUSTED_RA; }
            vlan v20 { policy ALLOW_TRUSTED_RA; }
            interface ge-0/0/23.0 { policy ALLOW_TRUSTED_RA; }
        }
    }
}
```

## Verifying FHS on Juniper

```bash
# Show the DHCPv6 snooping binding table (the source of truth for
# both ND inspection and IPv6 source guard).
show dhcpv6 snooping binding
# On releases that use the unified dhcp-security command set:
show dhcp-security ipv6 binding

# Show neighbor-discovery-inspection statistics per interface.
show neighbor-discovery-inspection statistics
# On releases with the dhcp-security command set:
show dhcp-security neighbor-discovery-inspection statistics
# Sample output columns: Interface | Packets received |
#                        ND inspection passed | ND inspection failed

# Inspect the live IPv6 neighbor table on the switch
show ipv6 neighbors
```

## Adding Static Bindings

For hosts that do not use DHCPv6 (e.g., static-address hosts), add a static
IPv6 binding to the dhcp-security database. Static bindings live inside a
group, attached to a specific interface.

```text
# Add a static IPv6 binding for a host with a fixed address
set vlans v10 forwarding-options dhcp-security \
    group static-hosts interface ge-0/0/0 \
    static-ipv6 2001:db8::1 mac 00:11:22:33:44:55

# In Junos bracket format:
vlans {
    v10 {
        forwarding-options {
            dhcp-security {
                neighbor-discovery-inspection;
                ipv6-source-guard;
                group static-hosts {
                    interface ge-0/0/0.0 {
                        static-ipv6 2001:db8::1 mac 00:11:22:33:44:55;
                    }
                }
            }
        }
    }
}

# Verify the static binding made it into the snooping database
show dhcpv6 snooping binding | match 2001:db8::1
```

## Troubleshooting

```bash
# Issue 1: RA Guard blocking legitimate RAs from the upstream router
# Symptom: Hosts not getting router advertisements
# Check the active RA Guard policy and which VLANs/interfaces it is bound to
show configuration forwarding-options access-security router-advertisement-guard
# Fix: relax the policy match conditions, or attach an accept policy
# to the upstream interface so trusted RAs are forwarded:
set forwarding-options access-security router-advertisement-guard \
    interface ge-0/0/23.0 policy ALLOW_TRUSTED_RA

# Issue 2: DHCPv6 clients not getting addresses
# Symptom: DHCPv6 ADVERTISE/REPLY never reaches clients
# Check the snooping state and binding table:
show dhcpv6 snooping binding
# Fix: ensure the port that reaches the DHCPv6 server is trusted.
# If it is an access port, place it in a group with overrides trusted:
set vlans v10 forwarding-options dhcp-security \
    group dhcp-servers interface ge-0/0/22
set vlans v10 forwarding-options dhcp-security \
    group dhcp-servers overrides trusted

# Issue 3: Binding table not populated
# Check:
show dhcpv6 snooping binding
# If empty: confirm neighbor-discovery-inspection and/or
# ipv6-source-guard are enabled on the VLAN, then have hosts
# DHCPv6-renew or send NDP so bindings can be learned.

# Issue 4: dhcp-security / RA Guard statements not recognised
# Check Junos version:
show version
# IPv6 source guard / ND inspection were introduced on EX2200 and
# EX3300 in Junos OS Release 14.1X53-D10. Other EX platforms have
# their own minimum releases - check the Feature Explorer for
# your model. On older releases, use firewall filters for RA
# filtering and DHCPv6 message filtering.
```

## Logging NDP Security Events

```text
# Send the dhcp-security and access-security daemons' messages to a file.
set system syslog file fhs-log any info

# Inspect dropped/violating packets in real time
monitor start fhs-log

# To see the running counters that back these events, use the
# statistics show commands on the switch:
show dhcp-security neighbor-discovery-inspection statistics
show neighbor-discovery-inspection statistics
```

## Conclusion

Juniper EX Series IPv6 FHS is configured through two hierarchies: `[edit vlans <name> forwarding-options dhcp-security]` for ND Inspection, IPv6 Source Guard, and DHCPv6 snooping (snooping is auto-enabled when ND inspection or IPv6 source guard is configured), and `[edit forwarding-options access-security router-advertisement-guard]` for RA Guard. Access ports are untrusted for DHCP snooping by default and trunk ports are trusted; override per port by placing the interface in a `group` with `overrides trusted`. Use `show dhcpv6 snooping binding` (or `show dhcp-security ipv6 binding`) to verify the binding table and `show neighbor-discovery-inspection statistics` to confirm ND inspection is active and dropping anomalous traffic.
