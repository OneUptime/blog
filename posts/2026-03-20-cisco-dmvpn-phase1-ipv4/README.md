# How to Configure DMVPN Phase 1 with IPv4 on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, DMVPN, IPv4, IOS, VPN, MGRE, NHRP, Hub-and-Spoke

Description: Configure DMVPN Phase 1 (hub-and-spoke) on Cisco IOS routers using mGRE, NHRP, and IPsec to create a scalable hub-and-spoke VPN topology for IPv4.

## Introduction

DMVPN Phase 1 creates a hub-and-spoke topology where all spoke-to-spoke traffic transits through the hub. The mGRE tunnel on the hub handles dynamic spoke registrations via NHRP (Next Hop Resolution Protocol), while each spoke uses a point-to-point GRE tunnel to the hub.

## Hub Configuration

```cisco
! === Hub Router ===

! ISAKMP Phase 1
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14

crypto isakmp key DMVPNkey address 0.0.0.0 0.0.0.0  ! Wildcard key for spokes

! IPsec Phase 2
crypto ipsec transform-set DMVPN-TS esp-aes 256 esp-sha256-hmac
 mode transport

! IPsec Profile (applied to tunnel)
crypto ipsec profile DMVPN-PROFILE
 set transform-set DMVPN-TS
 set pfs group14

! mGRE Tunnel Interface
interface Tunnel0
 description DMVPN-Hub
 ip address 10.100.0.1 255.255.255.0
 no ip split-horizon eigrp 100      ! Optional if running EIGRP over the tunnel
 tunnel source GigabitEthernet0/0   ! Hub WAN interface
 tunnel mode gre multipoint         ! mGRE - accept any source
 tunnel key 100
 tunnel protection ipsec profile DMVPN-PROFILE

 ! NHRP - act as NHS for spokes
 ip nhrp network-id 100
 ip nhrp map multicast dynamic     ! Allow dynamic multicast mapping
 ip nhrp authentication NHRP-KEY
```

## Spoke Configuration

```cisco
! === Spoke Router (e.g., Site 1) ===

crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14

crypto isakmp key DMVPNkey address 203.0.113.1  ! Hub public IP

crypto ipsec transform-set DMVPN-TS esp-aes 256 esp-sha256-hmac
 mode transport

crypto ipsec profile DMVPN-PROFILE
 set transform-set DMVPN-TS
 set pfs group14

interface Tunnel0
 description DMVPN-Spoke1
 ip address 10.100.0.2 255.255.255.0
 tunnel source GigabitEthernet0/0   ! Spoke WAN interface
 tunnel destination 203.0.113.1     ! Hub public IP
 tunnel key 100
 tunnel protection ipsec profile DMVPN-PROFILE

 ip nhrp network-id 100
 ip nhrp authentication NHRP-KEY
 ip nhrp nhs 10.100.0.1             ! Hub tunnel IP = Next Hop Server
 ip nhrp map 10.100.0.1 203.0.113.1 ! Hub tunnel IP → Hub public IP

! Route LAN traffic through tunnel
ip route 0.0.0.0 0.0.0.0 10.100.0.1   ! Default via hub
```

## Verify DMVPN

```cisco
! Show NHRP registrations on hub
show ip nhrp

! Show NHRP detail
show ip nhrp detail

! Show DMVPN status
show dmvpn detail

! Check tunnel state
show interfaces Tunnel0

! Verify IPsec
show crypto isakmp sa
show crypto ipsec sa
```

## Phase 1 Characteristics

```text
In DMVPN Phase 1:
  - All spoke-to-spoke traffic routes through the hub
  - Hub sees ALL traffic (bottleneck in large deployments)
  - Simple configuration - no spoke-to-spoke shortcuts
  - Ideal for: small deployments, centralized internet breakout
  - Traffic path: Spoke1 → Hub → Spoke2
```

## Conclusion

DMVPN Phase 1 is the simplest DMVPN deployment mode - a hub-and-spoke topology where all traffic flows through the hub. It combines a hub-side mGRE tunnel, NHRP for dynamic spoke registration, and IPsec for encryption. Phase 2 builds on this by allowing direct spoke-to-spoke tunnels after an initial hub transit.
