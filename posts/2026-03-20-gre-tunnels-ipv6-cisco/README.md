# How to Configure GRE Tunnels for IPv6 on Cisco

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GRE, Cisco, Tunneling, IOS

Description: Learn how to configure GRE tunnels to carry IPv6 traffic over IPv4 infrastructure on Cisco IOS routers, including tunnel interface configuration, IPv6 addressing, and routing.

## Overview

Cisco IOS GRE tunnels carrying IPv6 use `tunnel mode gre ip` (the default) with `ipv6 address` assigned to the tunnel interface. GRE (protocol 47) is widely supported in enterprise and service provider networks and can run dynamic routing protocols over the tunnel.

## Basic GRE Tunnel for IPv6

```text
! Router-A: 203.0.113.10 (Site A)
! Router-B: 198.51.100.1 (Site B)

Router-A(config)# ipv6 unicast-routing

Router-A(config)# interface Tunnel0
Router-A(config-if)# description GRE to Site-B
Router-A(config-if)# ipv6 address 2001:db8:link::1/64
Router-A(config-if)# tunnel source GigabitEthernet0/0
Router-A(config-if)# tunnel destination 198.51.100.1
Router-A(config-if)# tunnel mode gre ip              ! Default mode - IPv4 encap
Router-A(config-if)# ipv6 mtu 1476                  ! 1500 - 24 bytes GRE/IPv4 overhead
Router-A(config-if)# ipv6 tcp adjust-mss 1416       ! TCP MSS clamping for 1476-byte IPv6 MTU

! IPv6 routes over GRE
Router-A(config)# ipv6 route 2001:db8:siteB::/48 Tunnel0 2001:db8:link::2
```

```text
! Router-B (mirror configuration)
Router-B(config)# ipv6 unicast-routing

Router-B(config)# interface Tunnel0
Router-B(config-if)# description GRE to Site-A
Router-B(config-if)# ipv6 address 2001:db8:link::2/64
Router-B(config-if)# tunnel source GigabitEthernet0/0
Router-B(config-if)# tunnel destination 203.0.113.10
Router-B(config-if)# tunnel mode gre ip
Router-B(config-if)# ipv6 mtu 1476
Router-B(config-if)# ipv6 tcp adjust-mss 1416

Router-B(config)# ipv6 route 2001:db8:siteA::/48 Tunnel0 2001:db8:link::1
```

## GRE Tunnel with Keepalives

```text
! Enable keepalives for tunnel status monitoring
Router-A(config)# interface Tunnel0
Router-A(config-if)# keepalive 10 3   ! 10s interval, 3 retries before down
```

Without keepalives, a GRE tunnel stays "up" even if the remote end is unreachable.

## IPv6 over GRE with OSPFv3

Running OSPFv3 over GRE distributes IPv6 routes dynamically:

```text
! Enable OSPFv3 on tunnel and LAN interfaces
Router-A(config)# ipv6 router ospf 1
Router-A(config-rtr)# router-id 1.1.1.1

Router-A(config)# interface Tunnel0
Router-A(config-if)# ipv6 ospf 1 area 0
Router-A(config-if)# ipv6 ospf cost 100

Router-A(config)# interface GigabitEthernet0/1
Router-A(config-if)# ipv6 ospf 1 area 0

! Same on Router-B with router-id 2.2.2.2

! Verify
Router-A# show ipv6 ospf neighbor
Router-A# show ipv6 route ospf
```

## GRE Tunnel MTU Verification

```text
! Check tunnel transport MTU
Router-A# show interface Tunnel0 | include transport MTU
  Tunnel transport MTU 1476 bytes

! Check IPv6 MTU
Router-A# show ipv6 interface Tunnel0 | include MTU
  MTU is 1476 bytes

! Test with ping
Router-A# ping ipv6 2001:db8:link::2 size 1400
! Success confirms packets below the configured IPv6 MTU pass
```

## Protect GRE with ACL

```text
! Allow GRE (proto 47) only from authorized remote
Router-A(config)# ip access-list extended PROTECT-GRE
Router-A(config-ext-nacl)# permit gre host 198.51.100.1 host 203.0.113.10
Router-A(config-ext-nacl)# deny gre any any log
Router-A(config-ext-nacl)# permit ip any any

Router-A(config)# interface GigabitEthernet0/0
Router-A(config-if)# ip access-group PROTECT-GRE in
```

## GRE with IPsec Protection

For encrypted GRE:

```text
! IKEv2 configuration (abbreviated)
crypto ikev2 proposal IKEV2-PROP
  encryption aes-cbc-256
  integrity sha256
  group 14

crypto ikev2 policy IKEV2-POLICY
  proposal IKEV2-PROP

crypto ikev2 keyring GRE-KR
  peer SITE-B
    address 198.51.100.1
    pre-shared-key cisco123

crypto ikev2 profile GRE-IKEV2
  match identity remote address 198.51.100.1
  authentication remote pre-share
  authentication local pre-share
  keyring local GRE-KR

crypto ipsec transform-set GRE-XFORM esp-aes 256 esp-sha256-hmac
  mode tunnel

crypto ipsec profile GRE-IPSEC
  set transform-set GRE-XFORM
  set ikev2-profile GRE-IKEV2

! Apply to the tunnel interface
interface Tunnel0
  tunnel protection ipsec profile GRE-IPSEC
```

## Verification

```text
! Tunnel status
Router-A# show interface Tunnel0
! Tunnel0 is up, line protocol is up
!   Tunnel source 203.0.113.10 (GigabitEthernet0/0), destination 198.51.100.1
!   Tunnel protocol/transport GRE/IP
!   Tunnel TTL 255, Fast tunneling disabled
!   Tunnel transport MTU 1476 bytes

! IPv6 routing
Router-A# show ipv6 route
! C   2001:db8:link::/64 [0/0] via Tunnel0, directly connected
! S   2001:db8:siteB::/48 [1/0] via 2001:db8:link::2

! Ping test
Router-A# ping ipv6 2001:db8:siteB::1 source GigabitEthernet0/1
! Success rate is 100 percent (5/5)

! Debug GRE (lab only)
Router-A# debug ip packet detail
```

## Summary

Cisco IOS GRE tunnels for IPv6 use `tunnel mode gre ip` (IPv4 encapsulation) with `ipv6 address` on the tunnel interface. Set `ipv6 mtu 1476` to account for 24-byte GRE/IPv4 overhead and `ipv6 tcp adjust-mss 1416` for TCP flows. Enable keepalives to detect tunnel failures. Run OSPFv3 over GRE for dynamic IPv6 routing. Protect GRE with an ACL restricting protocol 47 (gre) to authorized endpoints, and optionally add IPsec tunnel protection for encryption.
