# How to Use VXLAN with EVPN Control Plane on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, EVPN, BGP, FRR, Linux, Overlay Networking, L2VPN, Control Plane

Description: Learn how to configure VXLAN with an EVPN (Ethernet VPN) control plane using FRR on Linux to automate MAC/IP distribution across VTEPs without flooding.

---

EVPN (RFC 7432) uses BGP to distribute MAC and IP address information between VTEPs, eliminating the need for static FDB entries and multicast-based flooding.

## Architecture

```text
VTEP1 (10.0.0.1)    VTEP2 (10.0.0.2)    VTEP3 (10.0.0.3)
      |                    |                    |
      └──────── BGP EVPN (RT2 MAC/IP routes) ───┘
                      (via Route Reflector or iBGP full mesh)

No multicast needed - all MAC/IP bindings distributed via BGP EVPN Type-2 routes
```

## Step 1: Create VXLAN Interface with nolearning

```bash
ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  nolearning

ip link add br-vxlan10 type bridge
ip link set vxlan10 master br-vxlan10
ip link set vxlan10 up
ip link set br-vxlan10 up
```

## Step 2: Configure FRR for EVPN

```bash
# /etc/frr/daemons

bgpd=yes
zebra=yes

# /etc/frr/frr.conf
!
router bgp 65001
  bgp router-id 10.0.0.1
  no bgp default ipv4-unicast

  neighbor 10.0.0.2 remote-as 65001
  neighbor 10.0.0.2 update-source lo
  neighbor 10.0.0.3 remote-as 65001
  neighbor 10.0.0.3 update-source lo

  address-family l2vpn evpn
    neighbor 10.0.0.2 activate
    neighbor 10.0.0.3 activate
    advertise-all-vni       ! Advertise all local VNIs
  exit-address-family
!
```

## Step 3: Configure Per-VNI Route Distinguisher and Route Targets

```bash
# /etc/frr/frr.conf
!
router bgp 65001
  address-family l2vpn evpn
    vni 10
      rd 10.0.0.1:10
      route-target import 65001:10
      route-target export 65001:10
    exit-vni
  exit-address-family
!
```

## Step 4: Verify EVPN

```bash
# Show EVPN VNI information
vtysh -c "show bgp l2vpn evpn vni"

# Show learned MAC routes (Type-2)
vtysh -c "show bgp l2vpn evpn route type macip"

# Show per-VNI FDB
bridge fdb show dev vxlan10

# EVPN-populated entries appear as:
# aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2 self extern_learn
# (the "extern_learn" flag indicates the entry was installed by an
# external control plane like EVPN/BGP rather than data-plane learning)
```

## Step 5: Test Connectivity

```bash
# Ping across VTEPs
ping 192.168.100.2   # VM on VTEP2

# MAC should be learned via BGP before or during ARP
arp -n 192.168.100.2
```

## Key Takeaways

- EVPN distributes MAC/IP bindings via BGP Type-2 routes, eliminating flooding and static FDB management.
- Create VXLAN with `nolearning` when using EVPN - the control plane populates all FDB entries.
- FRR's `advertise-all-vni` advertises all locally configured VNIs to BGP peers.
- EVPN requires iBGP full mesh or a route reflector between all VTEPs; use `lo` as the BGP source for stability.
