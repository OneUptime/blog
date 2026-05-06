# How to Configure Site-to-Site IPsec VPN on Cisco Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, IPsec, VPN, IPv4, IOS, Site-to-Site, Security

Description: Configure a site-to-site IPsec VPN between two Cisco IOS routers using IKEv1 with pre-shared keys to securely connect two IPv4 networks over the internet.

## Introduction

Site-to-site IPsec VPN creates an encrypted tunnel between two routers, connecting private IPv4 networks across the public internet. This configuration uses IKEv1 with pre-shared keys, AES-256 encryption, and SHA-256 hashing.

## Configuration on Both Routers

```text
Topology:
  Router A public IP: 203.0.113.1   LAN: 192.168.1.0/24
  Router B public IP: 203.0.113.2   LAN: 192.168.2.0/24
```

## Router A Configuration

```cisco
! Phase 1 - IKE Policy
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14
 lifetime 86400

! Pre-shared key for Router B
crypto isakmp key VPNSecret123 address 203.0.113.2

! Phase 2 - IPsec Transform Set
crypto ipsec transform-set VPN-TS esp-aes 256 esp-sha256-hmac
 mode tunnel

! IPsec Lifetime
crypto ipsec security-association lifetime seconds 3600
crypto ipsec security-association lifetime kilobytes 4608000

! Interesting traffic (what to encrypt)
ip access-list extended VPN-TRAFFIC-A
 permit ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255

! Crypto map
crypto map VPN-MAP 10 ipsec-isakmp
 set peer 203.0.113.2
 set transform-set VPN-TS
 set pfs group14
 match address VPN-TRAFFIC-A

! Apply to WAN interface
interface GigabitEthernet0/0
 description WAN
 ip address 203.0.113.1 255.255.255.252
 ip nat outside
 crypto map VPN-MAP

interface GigabitEthernet0/1
 description LAN
 ip address 192.168.1.1 255.255.255.0
 ip nat inside

! NAT exemption (don't NAT VPN traffic)
ip access-list extended NAT-EXEMPTION
 deny   ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255
 permit ip 192.168.1.0 0.0.0.255 any

ip nat inside source list NAT-EXEMPTION interface GigabitEthernet0/0 overload
```

## Router B Configuration

```cisco
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14
 lifetime 86400

crypto isakmp key VPNSecret123 address 203.0.113.1

crypto ipsec transform-set VPN-TS esp-aes 256 esp-sha256-hmac
 mode tunnel

ip access-list extended VPN-TRAFFIC-B
 permit ip 192.168.2.0 0.0.0.255 192.168.1.0 0.0.0.255

crypto map VPN-MAP 10 ipsec-isakmp
 set peer 203.0.113.1
 set transform-set VPN-TS
 set pfs group14
 match address VPN-TRAFFIC-B

interface GigabitEthernet0/0
 description WAN
 ip address 203.0.113.2 255.255.255.252
 crypto map VPN-MAP

interface GigabitEthernet0/1
 description LAN
 ip address 192.168.2.1 255.255.255.0
```

## Verify IPsec VPN

```cisco
! Check IKE Phase 1 status
show crypto isakmp sa

! Check IPsec Phase 2 status
show crypto ipsec sa

! Check SA details
show crypto engine connections active

! Test with ping
ping 192.168.2.1 source 192.168.1.1 repeat 5
```

## Troubleshooting

```cisco
! Enable IKE debugging
debug crypto isakmp
debug crypto ipsec

! Common issues:
! - Phase 1 stuck in MM_NO_STATE: verify reachability, UDP/500, and matching ISAKMP policies
! - Mismatched PSK: check debug crypto isakmp for sanity check failed messages
! - ACL mismatch: check interesting traffic ACL on both sides
! - NAT interference: ensure NAT exemption ACL is correct
! - MTU/MSS issues: if large packets fail, lower TCP MSS on the LAN interface
```

## Conclusion

Site-to-site IPsec VPN on Cisco IOS requires matching IKE phase 1 policies, identical pre-shared keys, and symmetric interesting-traffic ACLs on both peers. If NAT is configured on the router, add a NAT exemption to prevent the VPN traffic from being NATed before encryption. Verify with `show crypto isakmp sa` and `show crypto ipsec sa`.
