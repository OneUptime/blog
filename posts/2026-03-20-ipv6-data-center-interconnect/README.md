# How to Configure IPv6 for Data Center Interconnect (DCI)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DCI, Data Center, DWDM, Dark Fiber, Networking

Description: Configure IPv6 routing and tunneling for data center interconnect links including BGP, OSPF, and EVPN for multi-site IPv6 deployments.

## DCI IPv6 Design Options

| Method | Use Case | Protocol |
|---|---|---|
| Native IPv6 routed | Simple site-to-site | OSPFv3, BGP |
| EVPN-VXLAN | L2 extension across sites | BGP EVPN |
| L3VPN with IPv6 | Multi-tenant DCI | MP-BGP VPNv6 |
| IPv6 over MPLS | Service provider DCI | LDP/RSVP |

## Native IPv6 DCI with BGP

```text
! Cisco NX-OS - DCI link between DC1 and DC2

feature ospfv3
feature bgp

route-map EXPORT_TO_OSPF permit 10

! DC1 (2001:db8:dc1::/48) interconnect interface
interface Ethernet1/1
  description DCI_to_DC2
  ipv6 address 2001:db8:100:1::1/64
  ipv6 router ospfv3 1 area 0

router ospfv3 1
  router-id 1.1.1.1
  address-family ipv6 unicast
    redistribute bgp 65001 route-map EXPORT_TO_OSPF

router bgp 65001
  router-id 1.1.1.1
  neighbor 2001:db8:100:1::2 remote-as 65002
  address-family ipv6 unicast
    neighbor 2001:db8:100:1::2 activate
    network 2001:db8:dc1::/48
```

## EVPN-VXLAN DCI for L2 Extension

```bash
# Linux VTEP with EVPN for DCI L2 extension

# Create VXLAN interface at DC1
ip addr add 2001:db8:0:1::1/128 dev lo

ip link add vxlan100 type vxlan \
    id 100 \
    local 2001:db8:0:1::1 \
    dstport 4789 \
    nolearning

ip link add br100 type bridge
ip link set vxlan100 master br100
ip link set vxlan100 type bridge_slave neigh_suppress on learning off
ip link set vxlan100 up
ip link set br100 up

# FRR BGP EVPN for DCI
# /etc/frr/frr.conf
router bgp 65001
 bgp router-id 1.1.1.1
 neighbor 2001:db8:100:1::2 remote-as 65002
 address-family l2vpn evpn
  neighbor 2001:db8:100:1::2 activate
  advertise-all-vni
```

## Path MTU for DCI

```bash
# DCI links often have different MTU than intra-DC
# VXLAN over IPv6 = 56 bytes IP/UDP/VXLAN overhead

# DC1 fabric MTU: 9216
# DCI link MTU: 9000 (common for 100G DCI)
# VXLAN overhead: 56 bytes
# Effective inner Ethernet frame size: 8944 bytes

# Set MTU on DCI interface
ip link set dev eth-dci mtu 9000

# Optional: shorten cached PMTU lifetime after DCI MTU changes
sysctl -w net.ipv6.route.mtu_expires=600

# Test DCI underlay path MTU
ping6 -M do -s 8952 2001:db8:100:1::2
```

## BGP Communities for DCI Traffic Engineering

```bash
# Tag routes with DCI-specific communities

route-map DCI_EXPORT permit 10
  set community 65001:1000  # DCI route tag

ip community-list standard DCI_ROUTES permit 65001:1000

# DC1 BGP: tag routes on export toward the DCI peer
router bgp 65001
  neighbor 2001:db8:100:1::2 route-map DCI_EXPORT out

# DC2 BGP: lower local preference for DCI-tagged routes
router bgp 65002
  neighbor 2001:db8:100:1::1 route-map DCI_IMPORT in

route-map DCI_IMPORT permit 10
  match community DCI_ROUTES
  set local-preference 80  # Lower than intra-DC routes inside AS 65002

route-map DCI_IMPORT permit 20
```

## Monitoring DCI Links

```bash
#!/bin/bash
# monitor-dci.sh - DCI IPv6 health check

DCI_PEER="2001:db8:100:1::2"
DC2_PREFIX="2001:db8:dc2::/48"

echo "=== DCI Link Health ==="

# Ping test
if ping6 -c 3 -W 2 "${DCI_PEER}" &>/dev/null; then
    echo "PASS: DCI link to DC2 is up"
else
    echo "FAIL: DCI link to DC2 is down"
fi

# BGP session check
if vtysh -c "show bgp ipv6 unicast summary established" | grep -Fq "${DCI_PEER}"; then
    echo "PASS: BGP session to DC2 is established"
else
    echo "FAIL: BGP session to DC2 is down"
fi

# Route check
ROUTES=$(ip -6 route show "${DC2_PREFIX}" | wc -l)
echo "IPv6 routes to DC2: ${ROUTES}"
```

## Conclusion

IPv6 DCI configuration depends on the L2/L3 requirements. For pure L3 routing, use OSPFv3 or eBGP between sites with site-specific /48 prefixes advertised across the DCI link. For L2 extension (VM migration, stretched clusters), use EVPN-VXLAN with BGP EVPN Type 2 MAC/IP routes propagated between sites. Always account for DCI MTU - VXLAN over IPv6 adds 56 bytes of IP/UDP/VXLAN overhead, so a 9000-byte DCI underlay MTU leaves 8944 bytes for the inner Ethernet frame. Use BGP communities to tag DCI-learned routes for traffic engineering and lower local preference on import so intra-DC paths stay preferred for local traffic.
