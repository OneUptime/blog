# How to Configure IPsec IPv6 on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Cisco, IOS, VPN

Description: Step-by-step guide to configuring IPsec for IPv6 on Cisco IOS routers, including IKEv2 policies, crypto maps, and site-to-site tunnel configuration.

## Overview

Cisco IOS supports IPv6 IPsec with IKEv2 using a similar configuration model to IPv4 IPsec. The configuration uses `crypto ikev2` for IKE policies and `crypto ipsec` for transform sets, but applied to IPv6 interfaces and IPv6 traffic selectors.

## Configuration: IKEv2 Site-to-Site IPv6 VPN

### Step 1: IKEv2 Proposal and Policy

```text
! Enable IPv6 routing globally on both routers
ipv6 unicast-routing

! IKEv2 Proposal (cipher suites)
crypto ikev2 proposal IPV6-VPN-PROPOSAL
 encryption aes-cbc-256
 integrity sha256
 group 14        ! DH group 14 (2048-bit MODP)

! IKEv2 Policy - which proposal to use
crypto ikev2 policy IPV6-VPN-POLICY
 proposal IPV6-VPN-PROPOSAL

! IKEv2 Keyring - PSK
crypto ikev2 keyring IPV6-KEYRING
 peer GW2
  address 2001:db8:2::2/128
  pre-shared-key local  ChangeThisToAStrongKey
  pre-shared-key remote ChangeThisToAStrongKey

! IKEv2 Profile - ties together auth and keyring
crypto ikev2 profile IPV6-PROFILE
 match address local 2001:db8:1::1
 match identity remote address 2001:db8:2::2/128
 authentication remote pre-share
 authentication local  pre-share
 keyring local IPV6-KEYRING
```

### Step 2: IPsec Transform Set and Profile

```text
! ESP Transform Set (encryption + authentication)
crypto ipsec transform-set IPV6-TRANSFORM esp-aes 256 esp-sha256-hmac
 mode tunnel

! IPsec Profile
crypto ipsec profile IPV6-IPSEC-PROFILE
 set transform-set IPV6-TRANSFORM
 set ikev2-profile IPV6-PROFILE
```

### Step 3: Tunnel Interface

Modern Cisco IOS uses Virtual Tunnel Interface (VTI) for IPsec:

```text
! Create IPv6 Virtual Tunnel Interface
interface Tunnel0
 ipv6 enable
 ipv6 address 2001:db8:3::1/64
 tunnel source 2001:db8:1::1
 tunnel destination 2001:db8:2::2
 tunnel mode ipsec ipv6
 tunnel protection ipsec profile IPV6-IPSEC-PROFILE
 no shutdown

! Route Site2 traffic through the tunnel
ipv6 route 2001:db8:20::/48 Tunnel0
```

### Step 4: Configure on GW2 (Mirror)

```text
! GW2 is the mirror of GW1 - swap local/remote addresses

crypto ikev2 keyring IPV6-KEYRING
 peer GW1
  address 2001:db8:1::1/128
  pre-shared-key local  ChangeThisToAStrongKey
  pre-shared-key remote ChangeThisToAStrongKey

crypto ikev2 profile IPV6-PROFILE
 match address local 2001:db8:2::2
 match identity remote address 2001:db8:1::1/128
 authentication remote pre-share
 authentication local  pre-share
 keyring local IPV6-KEYRING

interface Tunnel0
 ipv6 address 2001:db8:3::2/64
 tunnel source 2001:db8:2::2
 tunnel destination 2001:db8:1::1
 tunnel mode ipsec ipv6
 tunnel protection ipsec profile IPV6-IPSEC-PROFILE

ipv6 route 2001:db8:10::/48 Tunnel0
```

## Verification Commands

```text
! Show IKEv2 sessions
Router# show crypto ikev2 session

! Sample output:
! IPv6 IKEv2 SA
!  Tunnel-id Local                  Remote                 fvrf/ivrf  Status
!  1         2001:db8:1::1/500      2001:db8:2::2/500      none/none  READY

! Show IPsec SAs
Router# show crypto ipsec sa

! Sample output:
! interface: Tunnel0
!  Crypto map tag: Tunnel0-head-0, local addr 2001:db8:1::1
!  protected vrf: (none)
!  local ident (addr/mask/prot/port): (::/0/0/0)
!  remote ident (addr/mask/prot/port): (::/0/0/0)
!  current_peer 2001:db8:2::2 port 500
!    outbound esp sas:
!     spi: 0x1234ABCD (305445837)
!      transform: esp-256-aes esp-sha256-hmac ,
!      in use settings ={Tunnel, }
!      current outbound spi: 0x1234ABCD(305445837)

! Show IKEv2 statistics
Router# show crypto ikev2 stats

! Show tunnel interface
Router# show interface Tunnel0

! Verify IPv6 route through tunnel
Router# show ipv6 route 2001:db8:20::/48
```

## Troubleshoot IKEv2 on Cisco

```text
! Enable IKEv2 debugging
Router# debug crypto ikev2

! Enable IPsec debugging
Router# debug crypto ipsec

! Trace IKEv2 packets
Router# debug crypto ikev2 packet

! Clear and re-initiate
Router# clear crypto ikev2 sa
! Connection will auto-reinitiate if tunnel is configured with auto-initiation
```

## ACL-Based Crypto Map (Legacy Method)

For older IOS versions that don't support VTI:

```text
! Create IPv6 ACL for interesting traffic
ipv6 access-list SITE2-TRAFFIC
 permit ipv6 2001:db8:10::/48 2001:db8:20::/48

! Crypto Map
crypto map ipv6 IPV6-CMAP 10 ipsec-isakmp
 set peer 2001:db8:2::2
 set transform-set IPV6-TRANSFORM
 set ikev2-profile IPV6-PROFILE
 match address SITE2-TRAFFIC

! Apply to interface
interface GigabitEthernet0/0
 ipv6 address 2001:db8:1::1/64
 crypto map IPV6-CMAP
```

## Summary

Cisco IOS IPv6 IPsec uses `crypto ikev2` for IKE policy and keyring, `crypto ipsec transform-set` for ESP configuration, and Virtual Tunnel Interface (VTI) as the modern way to bind IPsec profiles to tunnel interfaces. VTI simplifies routing because it behaves like a regular interface. Use `show crypto ikev2 session` and `show crypto ipsec sa` to verify. For troubleshooting use `debug crypto ikev2`, and check that firewall ACLs permit ESP (protocol 50) and UDP 500 between gateway addresses; UDP 4500 is only needed if NAT-T or UDP encapsulation is in use.
