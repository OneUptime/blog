# How to Understand SRv6 in Data Center Fabrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Data Center, BGP, EVPN, Fabric, Networking

Description: Understand how SRv6 is deployed in data center Clos fabrics to replace MPLS-based overlays, simplify EVPN control planes, and enable traffic engineering.

## Introduction

Data centers use Clos (spine-leaf) fabrics where traffic engineering and multi-tenancy are often implemented with MPLS+EVPN or VXLAN+EVPN overlays. In an SRv6-based design, EVPN can remain the control plane while SRv6 service SIDs replace MPLS labels in the data plane, reducing label-signaling dependencies in the underlay.

## SRv6 in a Clos Fabric

```text
                    +------------------+
                    |   Spine Layer    |
                    | 2001:db8:ff::/48 |
                    +------------------+
                   /                    \
      +-----------+                      +-----------+
      |  Leaf 1   |                      |  Leaf 2   |
      |2001:db8:1:0::/64|              |2001:db8:2:0::/64|
      +-----------+                      +-----------+
           |                                   |
      Server A (VRF Red)               Server B (VRF Red)
      fd00:101::a/64                   fd00:101::b/64
```

## BGP VPN with SRv6 Transport

```text
! Leaf 1 BGP configuration (FRR L3VPN/SRv6 example)
segment-routing
  srv6
    encapsulation
      source-address 2001:db8:1:0::1
    !
    locators
      locator MAIN
        prefix 2001:db8:1:0::/64
      !
    !
  !
!

router bgp 65001
  bgp router-id 1.1.1.1

  neighbor 2001:db8:ff:1::1 remote-as 65000
  neighbor 2001:db8:ff:1::1 update-source lo

  address-family ipv6 vpn
    neighbor 2001:db8:ff:1::1 activate
    neighbor 2001:db8:ff:1::1 encapsulation-srv6
  !

  address-family ipv6 unicast
    network 2001:db8:1:0::/64  ! Advertise own locator
  !

  segment-routing srv6
    locator MAIN
    encap-behavior H_Encaps_Red
  !
!

! VRF with SRv6 End.DT6 SID
router bgp 65001 vrf RED
  address-family ipv6 unicast
    rd vpn export 65001:10100
    rt vpn both 65001:10100
    import vpn
    export vpn
    sid vpn export explicit 2001:db8:1:0:e100::
  !
!
```

## SRv6 EVPN Control Plane Messages

```text
EVPN Type-2 (MAC/IP route) with SRv6:
  Route: MAC=aa:bb:cc:dd:ee:ff, IP=fd00:101::a
  SRv6 L3 Service SID: 2001:db8:1:0:e100::
  → Leaf 2 installs: route to fd00:101::a
    via encap seg6 mode encap segs 2001:db8:1:0:e100::

EVPN Type-5 (IP prefix route) with SRv6:
  Prefix: fd00:101::/64
  SRv6 L3 Service SID: 2001:db8:1:0:e100::
  → Remote leafs install forwarding entry with SRv6 encap
```

## Traffic Engineering in DC Fabric

```bash
# On Leaf 1: steer tenant traffic through specific spine

# Normal path: Leaf1 → Spine1 → Leaf2
# Engineered path: Leaf1 → Spine2 → Leaf2 (lower latency spine)

ip -6 route add 2001:db8:2:0::/64 \
  encap seg6 mode encap \
  segs 2001:db8:ff:2:e001::,2001:db8:2:0:e000:: \
  dev eth-spine2

# Traffic matching this route or SR policy uses Spine2
```

## ECMP and Load Balancing with SRv6

```bash
# SRv6 works with ECMP - multiple paths to same locator
# Leaf 1 has two spines: traffic is hashed across both

ip -6 route add 2001:db8:2:0::/64 \
  nexthop via fd00:1:1::1 dev eth0 weight 1 \
  nexthop via fd00:1:2::1 dev eth1 weight 1

# SRv6 ECMP hashing includes the outer IPv6 source, destination,
# and flow label, keeping packets for the same flow on one path.

# Verify ECMP distribution
for dev in eth0 eth1; do
  ethtool -S "$dev" | grep -E 'tx.*(packets|bytes)'
done
```

## Monitoring SRv6 Fabric Health

```bash
# Ping all leaf locators from a spine
for leaf in 2001:db8:1:0::1 2001:db8:2:0::1 2001:db8:3:0::1 2001:db8:4:0::1; do
  result=$(ping6 -c 2 -W 1 "$leaf" 2>&1 | grep -oP '\d+\.\d+ ms' | tail -1)
  echo "Leaf $leaf: $result"
done

# Monitor SRv6 encap counter (kernel stats)
ip -s -6 route show 2001:db8:2:0::/64 | grep -A3 "encap"
```

## Conclusion

SRv6 simplifies data center fabrics by combining the EVPN control plane with a pure IPv6 data plane. Each leaf's locator is a BGP prefix; EVPN routes carry SRv6 SIDs instead of MPLS labels. This eliminates label distribution protocols while retaining traffic engineering capabilities. Monitor per-leaf SID reachability and EVPN session health with OneUptime.
