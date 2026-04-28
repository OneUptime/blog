# How to Configure DHCPv6 Guard on Cisco Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6 Guard, Cisco, IPv6 Security, First Hop Security, IOS, Catalyst

Description: Configure DHCPv6 Guard on Cisco Catalyst switches to block rogue DHCPv6 servers on host-facing ports using IOS First Hop Security commands.

## Introduction

Cisco IOS DHCPv6 Guard blocks DHCPv6 server messages (ADVERTISE, REPLY, RECONFIGURE) on ports configured with a client role policy. It is part of the IPv6 First Hop Security (FHS) suite, which also includes RA Guard, IPv6 Snooping, and IPv6 Source Guard. DHCPv6 Guard works by inspecting DHCPv6 message types and dropping server-side responses on untrusted ports.

## Basic DHCPv6 Guard Configuration

Create client and server policies, then attach them to interfaces.

```text
! Step 1: Create DHCPv6 Guard policy for client/host ports
ipv6 dhcp guard policy CLIENT_GUARD
 device-role client

! Step 2: Create DHCPv6 Guard policy for server/uplink ports
ipv6 dhcp guard policy SERVER_GUARD
 device-role server

! Step 3: Apply client policy to host-facing access ports
interface range GigabitEthernet1/0/1 - 23
 description Host access ports
 ipv6 dhcp guard attach-policy CLIENT_GUARD

! Step 4: Apply server policy to uplink/server port
interface GigabitEthernet1/0/24
 description Uplink to DHCPv6 server or relay
 ipv6 dhcp guard attach-policy SERVER_GUARD
```

## Enhanced DHCPv6 Guard with Prefix Validation

Enhanced policy validates that the server is advertising prefixes within expected ranges.

```text
! Enhanced server policy with prefix validation
ipv6 dhcp guard policy SERVER_VALIDATED
 device-role server
 match server access-list DHCPV6_SERVERS
 match reply prefix-list ALLOWED_DHCPV6_PREFIXES

! Allow only specific DHCPv6 servers (by source IPv6)
ipv6 access-list DHCPV6_SERVERS
 permit ipv6 host 2001:db8::1 any     ← Primary DHCPv6 server
 permit ipv6 host 2001:db8::2 any     ← Secondary DHCPv6 server

! Allow only expected address prefixes in REPLY
ipv6 prefix-list ALLOWED_DHCPV6_PREFIXES permit 2001:db8::/64
ipv6 prefix-list ALLOWED_DHCPV6_PREFIXES permit 2001:db8:1::/64

! Apply validated policy to uplink
interface GigabitEthernet1/0/24
 ipv6 dhcp guard attach-policy SERVER_VALIDATED
```

## DHCPv6 Guard with IPv6 Snooping

IPv6 Snooping populates the binding table and works with DHCPv6 Guard.

```text
! Enable IPv6 snooping to build binding table from DHCPv6 exchanges
ipv6 snooping policy DHCP_SNOOP
 security-level guard
 tracking enable stale-lifetime 86400

! Apply snooping to VLAN
vlan configuration 10
 ipv6 snooping attach-policy DHCP_SNOOP

! Apply DHCPv6 Guard to VLAN (all ports in VLAN get client policy)
vlan configuration 10
 ipv6 dhcp guard attach-policy CLIENT_GUARD

! Override for uplink port (mark as server/relay)
interface GigabitEthernet1/0/24
 ipv6 dhcp guard attach-policy SERVER_GUARD

! The binding table is populated when DHCPv6 REPLY is seen on server port:
show ipv6 neighbors binding
```

## Handling DHCPv6 Relay Agents

When a relay agent is in the path, the relay port must be trusted.

```text
! Topology: Host → Access Switch → Relay Agent → DHCPv6 Server
!
! On access switch:
!   - Host ports: CLIENT_GUARD (block server messages)
!   - Port connecting to relay agent: SERVER_GUARD (allow server messages)
!     because the relay agent forwards REPLY from server to hosts

! For relay port (uplink to relay agent's subnet):
interface GigabitEthernet1/0/24
 ipv6 dhcp guard attach-policy SERVER_GUARD

! Note: if using a Cisco router as relay agent:
!   ipv6 dhcp relay destination 2001:db8::1
!   (on the router's interface, not the switch)
```

## Combining RA Guard and DHCPv6 Guard

Deploy both features on the same switch for complete protection.

```text
! Create all policies
ipv6 nd raguard policy HOST_RA
 device-role host

ipv6 nd raguard policy ROUTER_RA
 device-role router
 trusted-port

ipv6 dhcp guard policy HOST_DHCP
 device-role client

ipv6 dhcp guard policy SERVER_DHCP
 device-role server

! Apply both to access ports
interface range GigabitEthernet1/0/1 - 23
 ipv6 nd raguard attach-policy HOST_RA
 ipv6 dhcp guard attach-policy HOST_DHCP

! Apply both to uplink/router port
interface GigabitEthernet1/0/24
 ipv6 nd raguard attach-policy ROUTER_RA
 ipv6 dhcp guard attach-policy SERVER_DHCP

! Now protected against:
! - Rogue Router Advertisements (RA Guard)
! - Rogue DHCPv6 servers (DHCPv6 Guard)
```

## Verification Commands

```text
! Show DHCPv6 Guard policies defined and the targets they are attached to
show ipv6 dhcp guard policy

! Show details for a specific policy (lists attached interfaces/VLANs)
show ipv6 dhcp guard policy HOST_DHCP

! Show IPv6 snooping policies and where they are attached
show ipv6 snooping policies

! Show binding table (populated by snooping + DHCPv6)
show ipv6 neighbors binding

! Example output for show ipv6 dhcp guard policy HOST_DHCP:
! Dhcp guard policy: HOST_DHCP
!         Device Role: dhcp client
!         Target: Gi1/0/1 Gi1/0/2 Gi1/0/3 ...
```

## Conclusion

Cisco DHCPv6 Guard uses named policies with device roles (client or server) attached to interfaces. Host-facing ports use a client policy that blocks all DHCPv6 server response messages. Uplink and server-facing ports use a server policy that allows them. Enhanced policies can validate server source addresses and advertised prefixes. Always deploy DHCPv6 Guard alongside RA Guard and IPv6 Snooping for complete IPv6 First Hop Security coverage.
