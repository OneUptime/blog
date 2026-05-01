# How to Configure EVPN VXLAN with IPv6 on Arista EOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Arista, EVPN, VXLAN, IPv6, EOS, Data Center, BGP

Description: Configure BGP EVPN with VXLAN over an IPv6 underlay on Arista EOS switches for data center fabric automation.

## IPv6 Underlay on Arista EOS

Beginning with EOS 4.24.1F, Arista EOS supports an IPv6 underlay for EVPN VXLAN using IS-IS or OSPFv3. VXLAN routing over an IPv6 underlay is supported beginning with EOS 4.27.2F:

```text
! Arista EOS - Leaf switch configuration
! Enable VXLAN and EVPN
service routing protocols model multi-agent

! Loopback for VTEP
interface Loopback0
   ipv6 address 2001:db8:1::1/128

! Fabric link
interface Ethernet1
   no switchport
   ipv6 address 2001:db8:f:1::1/127

! IS-IS for IPv6 underlay
router isis UNDERLAY
   net 49.0001.0010.0000.0001.00
   is-type level-2
   !
   address-family ipv6 unicast
      !
   !
!
interface Loopback0
   isis enable UNDERLAY
   isis passive
!
interface Ethernet1
   isis enable UNDERLAY
   isis network point-to-point
```

## BGP EVPN over IPv6

```text
! BGP sessions use IPv6 loopbacks
router bgp 65001
   router-id 1.1.1.1
   !
   neighbor SPINE-OVERLAY peer group
   neighbor SPINE-OVERLAY remote-as 65001
   neighbor SPINE-OVERLAY update-source Loopback0
   neighbor SPINE-OVERLAY send-community extended
   neighbor SPINE-OVERLAY maximum-routes 0
   !
   neighbor 2001:db8:0:1::1 peer group SPINE-OVERLAY
   neighbor 2001:db8:0:2::1 peer group SPINE-OVERLAY
   !
   address-family evpn
      neighbor SPINE-OVERLAY activate
   !
   address-family ipv6
      neighbor SPINE-OVERLAY activate
      network 2001:db8:1::1/128
```

## VXLAN Interface Configuration

```text
! VXLAN interface sourced from IPv6 loopback
interface Vxlan1
   vxlan source-interface Loopback0
   vxlan encapsulation ipv6
   vxlan udp-port 4789
   !
   ! Map VLANs to VNIs
   vxlan vlan 100 vni 10100
   vxlan vlan 200 vni 10200
   !
   ! L3 VNI for tenant VRF
   vxlan vrf tenant1 vni 50001
```

## EVPN MAC/VRF Configuration

```text
! EVPN MAC-VRF for VLAN 100
router bgp 65001
   !
   vlan 100
      rd auto
      route-target both 65001:10100
      redistribute learned
   !
   vlan 200
      rd auto
      route-target both 65001:10200
      redistribute learned

! Tenant VRF for L3 EVPN
vrf instance tenant1
!
ip routing vrf tenant1
ipv6 unicast-routing vrf tenant1
!
router bgp 65001
   !
   vrf tenant1
      rd 1.1.1.1:1
      route-target import evpn 65001:50001
      route-target export evpn 65001:50001
      redistribute connected
```

## Anycast Gateway

```text
! Virtual gateway - same IP and MAC on all leafs
interface Vlan100
   vrf tenant1
   ip address virtual 10.100.0.1/24
   ipv6 address virtual 2001:db8:100::1/64

interface Vlan200
   vrf tenant1
   ip address virtual 10.200.0.1/24

! Anycast gateway MAC (configured globally)
ip virtual-router mac-address 00:1c:73:00:00:01
```

## Verification Commands

```text
! VXLAN status
show interfaces vxlan 1
show vxlan vtep
show vxlan address-table

! BGP EVPN
show bgp evpn summary
show bgp evpn route-type mac-ip
show bgp evpn route-type ip-prefix

! MAC table
show mac address-table vlan 100

! ARP / NDP in VRF
show arp vrf tenant1
show ipv6 neighbors vrf tenant1

! Connectivity test
ping vrf tenant1 10.100.0.2
ping vrf tenant1 2001:db8:100::2
```

## CloudVision (CVP) Automation

```python
# Arista CloudVision EVPN provisioning script

from cvprac.cvp_client import CvpClient

CVP_NODES = ["cvp.example.com"]
USERNAME = "cvp_user"
PASSWORD = "cvp_password"

def create_vxlan_vlan(vlan_id, vni):
    """Create a configlet that adds a VLAN-to-VNI mapping on Vxlan1."""
    client = CvpClient()
    client.connect(CVP_NODES, USERNAME, PASSWORD)

    configlet_name = f"VXLAN-VLAN-{vlan_id}"
    configlet_body = (
        "interface Vxlan1\n"
        f"   vxlan vlan {vlan_id} vni {vni}\n"
    )
    return client.api.add_configlet(configlet_name, configlet_body)
```

## Conclusion

Arista EOS supports IPv6 underlay for EVPN VXLAN using IS-IS or OSPFv3. The `multi-agent` routing model is required to enable BGP EVPN and VXLAN simultaneously, and `vxlan encapsulation ipv6` is required on the VTEP when the underlay is IPv6. BGP sessions peer over IPv6 loopbacks, and `address-family evpn` activates the EVPN control plane. Virtual anycast gateways with `ip address virtual` and `ipv6 address virtual` provide distributed routing with a consistent gateway MAC across all leaf nodes.
