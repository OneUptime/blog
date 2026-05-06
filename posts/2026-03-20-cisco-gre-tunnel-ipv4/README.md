# How to Configure GRE Tunnel on a Cisco Router with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cisco, GRE, Tunnel, IPv4, IOS, VPN, Routing

Description: Configure a GRE tunnel between two Cisco IOS routers over IPv4, assign tunnel IP addresses, set routing over the tunnel, and troubleshoot common GRE issues.

## Introduction

Generic Routing Encapsulation (GRE) creates a virtual point-to-point link between routers over an existing IP network. GRE tunnels carry any routable protocol, support multicast (needed for routing protocols like OSPF and EIGRP), and can be encrypted with IPsec.

## GRE Tunnel Configuration

```text
Topology:
  Router A (203.0.113.1) <--WAN (public IPs)--> Router B (203.0.113.2)
  Tunnel: 172.16.0.1/30 <-GRE-> 172.16.0.2/30
  Behind A: 192.168.1.0/24   Behind B: 192.168.2.0/24
```

```cisco
! === Router A ===
interface Tunnel0
 description GRE-to-RouterB
 ip address 172.16.0.1 255.255.255.252
 tunnel source GigabitEthernet0/0    ! WAN interface or IP
 tunnel destination 203.0.113.2      ! Router B public IP
 tunnel mode gre ip
 keepalive 10 3                      ! Send keepalive every 10s, 3 retries

! Route traffic to remote LAN through the tunnel
ip route 192.168.2.0 255.255.255.0 172.16.0.2

! === Router B ===
interface Tunnel0
 ip address 172.16.0.2 255.255.255.252
 tunnel source GigabitEthernet0/0
 tunnel destination 203.0.113.1      ! Router A public IP
 tunnel mode gre ip
 keepalive 10 3

ip route 192.168.1.0 255.255.255.0 172.16.0.1
```

## OSPF over GRE Tunnel

```cisco
! Run OSPF across the tunnel (GRE supports multicast)
! === Router A ===
router ospf 1
 network 172.16.0.0 0.0.0.3 area 0     ! Tunnel network
 network 192.168.1.0 0.0.0.255 area 0  ! Local LAN

! === Router B ===
router ospf 1
 network 172.16.0.0 0.0.0.3 area 0     ! Tunnel network
 network 192.168.2.0 0.0.0.255 area 0  ! Local LAN

! Set tunnel MTU on both routers to avoid fragmentation
interface Tunnel0
 ip mtu 1400
 ip tcp adjust-mss 1360
```

## Verify GRE Tunnel

```cisco
! Check tunnel interface state
show interfaces Tunnel0

! Check tunnel line-protocol (up/down)
show ip interface tunnel 0 brief

! Ping across the tunnel
ping ip 172.16.0.2 source tunnel 0

! Trace route through tunnel
traceroute 192.168.2.1 source 192.168.1.1

! Check keepalive
show interfaces Tunnel0 | include keepalive
```

## Common Issues

```cisco
! Issue: Tunnel up but traffic not flowing
! Check: Is there a route for tunnel destination IP?
show ip route 203.0.113.2

! Issue: Recursive routing (tunnel destination routed through tunnel)
! Fix: Ensure tunnel destination is reached via physical interface
ip route 203.0.113.2 255.255.255.255 GigabitEthernet0/0 ! Specific host route

! Issue: MTU causing fragmentation
! Fix: Adjust MTU
interface Tunnel0
 ip mtu 1400
 ip tcp adjust-mss 1360
```

## GRE + IPsec Encryption

```cisco
! === Router A ===
! Protect GRE with IPsec
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14

crypto isakmp key MyGREKey address 203.0.113.2

crypto ipsec transform-set GRE-TS esp-aes 256 esp-sha256-hmac
 mode transport

crypto map GRE-MAP 10 ipsec-isakmp
 set peer 203.0.113.2
 set transform-set GRE-TS
 match address GRE-TRAFFIC

ip access-list extended GRE-TRAFFIC
 permit gre host 203.0.113.1 host 203.0.113.2

interface GigabitEthernet0/0
 crypto map GRE-MAP

! === Router B ===
crypto isakmp policy 10
 encryption aes 256
 hash sha256
 authentication pre-share
 group 14

crypto isakmp key MyGREKey address 203.0.113.1

crypto ipsec transform-set GRE-TS esp-aes 256 esp-sha256-hmac
 mode transport

crypto map GRE-MAP 10 ipsec-isakmp
 set peer 203.0.113.1
 set transform-set GRE-TS
 match address GRE-TRAFFIC

ip access-list extended GRE-TRAFFIC
 permit gre host 203.0.113.2 host 203.0.113.1

interface GigabitEthernet0/0
 crypto map GRE-MAP
```

## Conclusion

GRE tunnels create logical point-to-point links over IPv4, enabling routing protocols and multicast across WAN links. Configure matching tunnel source/destination on both ends, assign tunnel IP addresses for routing, and adjust MTU/MSS as needed to avoid fragmentation. Add IPsec for encryption when tunneling over untrusted networks.
