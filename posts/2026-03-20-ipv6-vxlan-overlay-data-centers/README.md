# How to Configure IPv6 VXLAN Overlay in Data Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VXLAN, Overlay, Data Center, EVPN, BGP, Network Virtualization

Description: Configure IPv6 VXLAN overlays in data centers including VXLAN transport over IPv6 underlay, BGP EVPN with IPv6 address families, and IPv6 host mobility across VTEP boundaries.

---

VXLAN (Virtual Extensible LAN) creates overlay Layer 2 networks over Layer 3 underlay. IPv6 VXLAN can run over IPv4 or IPv6 underlay, and carry IPv6 host traffic in the overlay. BGP EVPN (Ethernet VPN) distributes VTEP and MAC/IP bindings for optimal forwarding.

## VXLAN IPv6 Architecture

```text
VXLAN IPv6 Overlay Components:

Underlay (IPv4 or IPv6 fabric):
  Spine/Leaf routing (BGP/IS-IS)
  VTEP loopback reachability

Overlay (VXLAN encapsulation):
  VNI 10100 → VLAN 100 (Tenant A workloads)
  VNI 10200 → VLAN 200 (Tenant B workloads)

Host addressing (inside VXLAN overlay):
  VLAN 100: 2001:db8:100::/64
  VLAN 200: 2001:db8:200::/64

VXLAN Packet Structure:
[Outer IP Header (IPv4 or IPv6)][UDP 4789][VXLAN Header][Inner Ethernet][IPv6 Payload]
 ← Underlay: Leaf loopbacks → ←  Overlay: Host IPv6 addresses →
```

## VXLAN VTEP Configuration (Linux/FRR)

```bash
# Cumulus Linux - VXLAN with IPv6 hosts

# Configure VTEP

# /etc/network/interfaces

auto lo
iface lo inet loopback
  address 10.0.1.101/32
  # Also configure IPv6 loopback for underlay
  address 2001:db8:dc1:200::101/128

auto swp5
iface swp5
  bridge-access 100

auto swp6
iface swp6
  bridge-access 100

# VXLAN interface (carries IPv6 host traffic)
auto vxlan100
iface vxlan100
  bridge-access 100
  bridge-learning off
  vxlan-id 10100
  vxlan-local-tunnelip 10.0.1.101  # Use IPv4 loopback for VTEP
  # Or for IPv6 underlay:
  # vxlan-local-tunnelip 2001:db8:dc1:200::101

auto bridge
iface bridge
  bridge-ports swp5 swp6 vxlan100  # Server ports + VXLAN
  bridge-vlan-aware yes
  bridge-vids 100

# SVI with anycast gateway for IPv6 hosts
auto vlan100
iface vlan100
  address 2001:db8:100::2/64
  address-virtual 00:00:5e:00:01:01 2001:db8:100::1/64
  vlan-raw-device bridge
  vlan-id 100
```

## BGP EVPN for IPv6 VXLAN

```bash
# /etc/frr/frr.conf - BGP EVPN with IPv6 host routes

frr defaults datacenter

router bgp 65101
  bgp router-id 10.0.1.101

  ! Underlay BGP (ipv4 or ipv6 peering)
  neighbor SPINES peer-group
  neighbor SPINES remote-as external

  ! EVPN address family for VXLAN
  address-family l2vpn evpn
    neighbor SPINES activate
    advertise-all-vni
    !
    ! Advertise the local SVI MAC/IP binding as an EVPN Type 2 route
    advertise-svi-ip
  exit-address-family

  ! IPv6 underlay reachability, if you peer over IPv6
  address-family ipv6 unicast
    neighbor SPINES activate
    redistribute connected
  exit-address-family
```

## Arista EOS VXLAN IPv6 Configuration

```text
! Arista EOS - VXLAN with IPv6 hosts

! Anycast gateway MAC for ipv6 virtual-router
ip virtual-router mac-address 00:00:5e:00:01:01

! VTEP source interface
interface Loopback0
   ip address 10.0.1.101/32
   ipv6 address 2001:db8:dc1:200::101/128

interface Vxlan1
   vxlan source-interface Loopback0
   vxlan udp-port 4789
   vxlan vlan 100 vni 10100
   vxlan vlan 200 vni 10200

! SVI with anycast gateway for IPv6 hosts
interface Vlan100
   ipv6 address 2001:db8:100::2/64
   ipv6 virtual-router address 2001:db8:100::1

! BGP EVPN
router bgp 65101
   neighbor SPINE peer group
   neighbor SPINE remote-as external
   neighbor SPINE update-source Loopback0
   !
   vlan 100
      rd 10.0.1.101:10100
      route-target both 65101:10100
      redistribute learned
   !
   vlan 200
      rd 10.0.1.101:10200
      route-target both 65101:10200
      redistribute learned
   !
   address-family evpn
      neighbor SPINE activate

! Verify EVPN routes
show bgp evpn route-type mac-ip
! Should show: IPv6 addresses bound to MAC addresses in Type 2 routes
```

## IPv6 Host Mobility in VXLAN

```bash
# When VM migrates from Leaf-1 to Leaf-2:

# Old VTEP (Leaf-1) withdraws MAC/IP:
# EVPN Type 2: withdraw 2001:db8:100::100, MAC aa:bb:cc:dd:ee:ff, VNI 10100

# New VTEP (Leaf-2) advertises:
# EVPN Type 2: announce 2001:db8:100::100, MAC aa:bb:cc:dd:ee:ff, VNI 10100

# All VTEPs update their MAC tables automatically via BGP EVPN
# IPv6 traffic redirects to new VTEP within BGP convergence time

# Monitor EVPN Type 2 routes
show bgp evpn route-type mac-ip 2001:db8:100::100
# Or on FRR/Cumulus:
show bgp l2vpn evpn route detail

# Check local MAC/IP binding
show mac address-table
show ipv6 neighbors
```

## NDP Suppression for IPv6 VXLAN

```text
# EVPN reduces IPv6 ND flooding by learning MAC/IP bindings from Type 2 routes.
# Behavior differs by platform.

# Arista EOS - flood filtering for EVPN VXLAN
router l2-vpn
   flooding default disabled

show vxlan counters software

# FRR/Cumulus - ARP/ND suppression is enabled on VNIs by default.
# Keep the SVI present so EVPN can answer for known remote IPv6 neighbors.
```

IPv6 VXLAN overlays provide L2 extension for IPv6 workloads across data center fabrics, with BGP EVPN Type-2 (MAC/IP) routes distributing IPv6 host bindings to all VTEPs, ND suppression reducing multicast flooding for known neighbors, and anycast gateway providing a consistent first-hop gateway across leaf switches.
