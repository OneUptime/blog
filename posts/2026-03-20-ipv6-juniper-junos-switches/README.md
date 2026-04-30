# How to Configure IPv6 on Juniper Junos Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Juniper, Junos, Switch, EX Series, Networking

Description: Configure IPv6 on Juniper EX series switches including IRB interfaces for VLAN routing, IPv6 RA, and IPv6 first-hop security features.

## Introduction

Juniper EX series switches running Junos support IPv6 for both layer-2 (VLAN) and layer-3 (routed) deployments. IPv6 is configured on IRB (Integrated Routing and Bridging) interfaces for VLAN routing and can be combined with first-hop security features like RA Guard and DHCPv6 snooping.

## Step 1: Configure VLAN and IRB for IPv6

```text
# Create a VLAN

set vlans EMPLOYEES vlan-id 10
set vlans EMPLOYEES l3-interface irb.10

# Configure IRB interface with IPv6
set interfaces irb unit 10 family inet6 address 2001:db8:1:10::1/64
set interfaces irb unit 10 description "Employee VLAN L3 Gateway"
```

## Step 2: Configure Access and Trunk Ports

```text
# Access port for employee VLAN
set interfaces ge-0/0/1 unit 0 family ethernet-switching
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members EMPLOYEES

# Trunk port (uplink to router)
set interfaces ge-0/0/47 unit 0 family ethernet-switching interface-mode trunk
set interfaces ge-0/0/47 unit 0 family ethernet-switching vlan members all
```

## Step 3: Enable IPv6 Routing on the Switch

```text
# Enable IPv6 routing
set routing-options rib inet6.0 static route ::/0 next-hop 2001:db8:0:1::1

# Or configure OSPFv3 for dynamic routing
set protocols ospf3 area 0.0.0.0 interface irb.10
```

## Step 4: Configure Router Advertisements on IRB

```text
# Enable RA on the IRB interface for VLAN 10
set protocols router-advertisement interface irb.10 max-advertisement-interval 100
set protocols router-advertisement interface irb.10 min-advertisement-interval 30
set protocols router-advertisement interface irb.10 default-lifetime 1800

set protocols router-advertisement interface irb.10 prefix 2001:db8:1:10::/64 valid-lifetime 86400
set protocols router-advertisement interface irb.10 prefix 2001:db8:1:10::/64 preferred-lifetime 14400
set protocols router-advertisement interface irb.10 prefix 2001:db8:1:10::/64 on-link

# Add DNS server advertisement
set protocols router-advertisement interface irb.10 dns-server-address 2001:db8:1:10::53
```

## Step 5: Configure IPv6 First-Hop Security

### RA Guard

RA Guard prevents rogue Router Advertisements from untrusted switch ports:

```text
# Mark uplink port as trusted for RA Guard
set forwarding-options access-security router-advertisement-guard interface ge-0/0/47.0 mark-interface trusted

# Block RA messages from client-facing access ports
set forwarding-options access-security router-advertisement-guard interface ge-0/0/1.0 mark-interface block
set forwarding-options access-security router-advertisement-guard interface ge-0/0/2.0 mark-interface block
```

### DHCPv6 Snooping

```text
# Enable DHCP/DHCPv6 snooping for VLAN 10
set vlans EMPLOYEES forwarding-options dhcp-security
```

## Step 6: Configure IPv6 ACL on IRB

```text
# Firewall filter for IRB interface
set firewall family inet6 filter IRB-PROTECT term ALLOW-ICMPV6 from protocol icmp6
set firewall family inet6 filter IRB-PROTECT term ALLOW-ICMPV6 then accept
set firewall family inet6 filter IRB-PROTECT term ALLOW-ESTABLISHED from protocol tcp
set firewall family inet6 filter IRB-PROTECT term ALLOW-ESTABLISHED from tcp-established
set firewall family inet6 filter IRB-PROTECT term ALLOW-ESTABLISHED then accept
set firewall family inet6 filter IRB-PROTECT term DENY-REST then discard

# Apply to IRB
set interfaces irb unit 10 family inet6 filter input IRB-PROTECT
```

## Verification Commands

```text
# Show IPv6 addresses on IRB interfaces
show interfaces irb detail | match inet6

# Show IPv6 routing table
show route table inet6.0

# Show RA configuration
show ipv6 router-advertisement

# Show IPv6 neighbor discovery cache (ARP equivalent)
show ipv6 neighbors

# Show RA Guard status
show access-security router-advertisement state

# Show OSPFv3 neighbors
show ospf3 neighbor
```

## Conclusion

Juniper EX switches support comprehensive IPv6 through IRB interfaces for VLAN routing, combined with first-hop security features like RA Guard and DHCPv6 snooping. The Router Advertisement configuration on IRB interfaces enables SLAAC for hosts in each VLAN, while RA Guard protects against rogue advertisement attacks from untrusted ports. This combination provides both connectivity and security for IPv6 in a switched environment.
