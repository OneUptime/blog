# How to Configure IPv6 Firewall Policies on Fortinet FortiGate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FortiGate, Firewall, Fortinet, Security Policy

Description: Learn how to configure IPv6 firewall policies on Fortinet FortiGate, including address objects, IPv6 policy rules, inspection profiles, and logging.

## Overview

Fortinet FortiGate supports IPv6 in its next-generation firewall policies. IPv6 is configured using the same policy framework as IPv4 - you create IPv6 address objects and use them in firewall policies with IPv6 source and destination fields. FortiGate performs stateful inspection and deep packet inspection for IPv6 traffic.

## Enable IPv6 on Interfaces

```bash
# FortiOS CLI: Enable IPv6 on interfaces

config system interface
    edit "wan1"
        config ipv6
            set ip6-address 2001:db8:0:1::2/64
            set ip6-allowaccess ping
        end
    next
    edit "lan"
        config ipv6
            set ip6-address 2001:db8:1::1/64
            set ip6-send-adv enable
        end
    next
end
```

## IPv6 Address Objects

```bash
# Create IPv6 address objects
config firewall address6
    edit "INTERNAL-NET-V6"
        set type ipprefix
        set ip6 2001:db8:1::/64
        next
    edit "MGMT-NET-V6"
        set type ipprefix
        set ip6 2001:db8:100::/64
        next
    edit "WEB-SERVER-V6"
        set type ipprefix
        set ip6 2001:db8:1::10/128
        next
    edit "ANY-V6"
        set type ipprefix
        set ip6 ::/0
        next
end

# Create address group
config firewall addrgrp6
    edit "TRUSTED-V6"
        set member "INTERNAL-NET-V6" "MGMT-NET-V6"
        next
end
```

## IPv6 Firewall Policies (GUI Path)

Navigate to **Policy & Objects → Firewall Policy → Create New** and use IPv6 address objects in the policy:

```text
Name:             Allow-Outbound-V6
Incoming Interface: LAN
Outgoing Interface: WAN
Source:             INTERNAL-NET-V6
Destination:        ANY-V6
Service:          ALL
Action:           Accept
Inspection Mode:  Flow-based
Log Traffic:      All Sessions
NAT:              Disable (IPv6 rarely uses NAT)
```

## IPv6 Policies via CLI

```bash
# Outbound IPv6 policy
config firewall policy
    edit 100
        set name "Allow-Outbound-IPv6"
        set srcintf "lan"
        set dstintf "wan1"
        set srcaddr6 "INTERNAL-NET-V6"
        set dstaddr6 "ANY-V6"
        set action accept
        set schedule "always"
        set service "ALL"
        set logtraffic all
        set nat disable
        set comments "Allow outbound IPv6 from LAN"
        next
    edit 101
        set name "Allow-HTTPS-Inbound"
        set srcintf "wan1"
        set dstintf "lan"
        set srcaddr6 "ANY-V6"
        set dstaddr6 "WEB-SERVER-V6"
        set action accept
        set schedule "always"
        set service "HTTPS"
        set logtraffic all
        set nat disable
        next
    edit 102
        set name "Allow-SSH-From-MGMT"
        set srcintf "wan1"
        set dstintf "lan"
        set srcaddr6 "MGMT-NET-V6"
        set dstaddr6 "WEB-SERVER-V6"
        set action accept
        set schedule "always"
        set service "SSH"
        set logtraffic all
        set nat disable
        next
end
```

## ICMPv6 Policy

```bash
# Create ICMPv6 service objects
config firewall service custom
    edit "ICMPV6-PTB"
        set protocol ICMP6
        set icmptype 2
        set comment "Packet Too Big - required for PMTUD"
        next
    edit "ICMPV6-ECHO"
        set protocol ICMP6
        set icmptype 128
        set comment "Echo Request"
        next
end

# Allow ICMPv6 Packet Too Big through firewall
config firewall policy
    edit 50
        set name "Allow-ICMPv6-PTB"
        set srcintf "any"
        set dstintf "any"
        set srcaddr6 "ANY-V6"
        set dstaddr6 "ANY-V6"
        set action accept
        set schedule "always"
        set service "ICMPV6-PTB"
        set comments "Packet Too Big - required for PMTUD"
        next
end
```

## IPv6 Bogon Filtering

```bash
# Create address objects for bogon prefixes
config firewall address6
    edit "BOGON-DOC"
        set type ipprefix
        set ip6 2001:db8::/32
        next
    edit "BOGON-ULA"
        set type ipprefix
        set ip6 fc00::/7
        next
end
config firewall addrgrp6
    edit "BOGON-V6"
        set member "BOGON-DOC" "BOGON-ULA"
        next
end

# Block bogons at WAN ingress
config firewall policy
    edit 1
        set name "Block-Bogon-IPv6"
        set srcintf "wan1"
        set dstintf "any"
        set srcaddr6 "BOGON-V6"
        set dstaddr6 "ANY-V6"
        set action deny
        set schedule "always"
        set service "ALL"
        set logtraffic all
        next
end
```

## Verification

```bash
# Show IPv6 policies
show firewall policy

# Show active IPv6 sessions
diagnose sys session6 list

# Show IPv6 routing table
get router info6 routing-table

# Debug IPv6 packet flow
diagnose debug flow filter6 addr 2001:db8:1::10
diagnose debug flow show function-name enable
diagnose debug enable
diagnose debug flow trace start 10

# Stop debug when finished
diagnose debug flow trace stop
diagnose debug disable
diagnose debug reset

# Check IPv6 policy hit counters for policy ID 100
diagnose firewall iprope6 show 100004 100

# Test with ping
execute ping6 2001:db8:1::10
```

## Summary

FortiGate IPv6 policies use the same policy framework as IPv4. Create IPv6 address objects (`firewall address6`) and use them in `firewall policy` rules with `srcaddr6`/`dstaddr6`. Ensure required ICMPv6 traffic, especially Packet Too Big (type 2), is permitted so Path MTU Discovery continues to work. Enable logging (`logtraffic all`) for security monitoring. Use `diagnose sys session6 list` to see active IPv6 sessions and `diagnose debug flow filter6` with `trace start` to trace specific IPv6 packet flows through the policy engine.
