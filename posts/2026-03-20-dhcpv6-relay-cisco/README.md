# How to Configure DHCPv6 Relay on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, DHCPv6, Relay, IOS, IOS-XE, Networking

Description: Configure DHCPv6 relay on Cisco IOS and IOS-XE routers to forward DHCPv6 messages from clients to remote DHCPv6 servers.

## Basic DHCPv6 Relay on Cisco IOS/IOS-XE

```text
! Enable IPv6 unicast routing (required)
ipv6 unicast-routing

! Configure the client-facing interface with relay destination
interface GigabitEthernet0/1
 description Client LAN
 ipv6 address 2001:db8:1::1/64
 ipv6 nd managed-config-flag    ! Use stateful DHCPv6 for address assignment
 ! For stateless DHCPv6 options only, use: ipv6 nd other-config-flag
 ipv6 dhcp relay destination 2001:db8:100::10
 no shutdown
```

## Relay to Multiple Servers

```text
! Forward DHCPv6 to two servers for redundancy
interface GigabitEthernet0/1
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp relay destination 2001:db8:100::10
 ipv6 dhcp relay destination 2001:db8:100::11
 no shutdown
```

## Relay with Source Interface Specification

```text
! Use a stable global unicast source address for relay messages
interface Loopback0
 ipv6 address 2001:db8:ffff::1/128

interface GigabitEthernet0/1
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp relay source-interface loopback 0
 ipv6 dhcp relay destination 2001:db8:100::10
 no shutdown
```

## DHCPv6 Relay with Option 37 (Remote ID) and Option 18 (Interface ID)

```text
! On IOS/IOS-XE, Remote-ID (option 37) on Ethernet interfaces
! and Interface-ID (option 18) are handled automatically.
! No explicit configuration is required for those options.

! Enable VRF-aware relay
ipv6 dhcp-relay option vpn

! VRF-aware relay (for multi-tenant environments)
interface GigabitEthernet0/1
 vrf forwarding Tenant1
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp relay option vpn
 ipv6 dhcp relay destination 2001:db8:200::10 vrf Management
 no shutdown
```

## Cisco IOS-XR DHCPv6 Relay

```text
! IOS-XR uses a relay profile with helper-address
dhcp ipv6
 profile RELAY relay
  helper-address vrf default 2001:db8:100::10
  !
 interface GigabitEthernet0/0/0/1 relay profile RELAY
  !
!

interface GigabitEthernet0/0/0/1
 ipv6 address 2001:db8:1::1/64
!
commit
```

## Cisco NX-OS DHCPv6 Relay (Nexus)

```text
! Enable DHCPv6 relay feature
feature dhcp

! Configure relay on VLAN SVI
interface Vlan100
 ipv6 address 2001:db8:1::1/64
 ipv6 dhcp relay address 2001:db8:100::10

! Show relay status
show ipv6 dhcp relay
show ipv6 dhcp relay statistics
```

## Verification Commands

```text
! IOS/IOS-XE verification
show ipv6 dhcp interface GigabitEthernet0/1
show ipv6 dhcp relay binding

! Check relay is configured
show running-config | include dhcp relay

! Debug relay messages (use with caution on production)
debug ipv6 dhcp relay

! Clear relay bindings (if needed)
clear ipv6 dhcp relay binding *
```

## Troubleshooting

```text
! Common issues:

! 1. No relay activity
show ipv6 dhcp interface GigabitEthernet0/1
! If relay mode or destinations are missing, check:
! - The correct RA flag is set for the client mode you want
!   (M-bit for stateful DHCPv6, O-bit for stateless DHCPv6)
! - Clients are sending SOLICIT or INFORMATION-REQUEST messages

! 2. Relay forwards but server doesn't respond
! Check server-facing routing
show ipv6 route 2001:db8:100::10

! 3. Stable relay source address
! Use a loopback with a global unicast address as the relay source
interface Loopback0
 ipv6 address 2001:db8:ffff::1/128
interface GigabitEthernet0/1
 ipv6 dhcp relay source-interface loopback 0

! 4. Clients getting wrong configuration
show ipv6 dhcp interface GigabitEthernet0/1
show ipv6 dhcp relay binding
```

## Conclusion

Cisco's DHCPv6 relay is configured with `ipv6 dhcp relay destination` on the client-facing interface. Use `ipv6 nd managed-config-flag` (M-bit) for stateful DHCPv6 address assignment, or `ipv6 nd other-config-flag` (O-bit) for stateless DHCPv6 options only. Multiple destinations provide server redundancy. On IOS/IOS-XE, use the `ipv6 dhcp relay source-interface` command if you want relay messages to use a stable global unicast source address. Remote-ID (option 37) on Ethernet interfaces and Interface-ID handling are automatic on IOS/IOS-XE. On NX-OS, enable the `feature dhcp` first before configuring relay.
