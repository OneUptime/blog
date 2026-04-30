# How to Design IPv6 for Hyperscale Data Centers - Centers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Hyperscale, Data Center, BGP, ECMP, Clos

Description: Design IPv6 for hyperscale data center Clos network fabrics with BGP-only routing, ECMP load balancing, and large-scale address planning.

## Hyperscale IPv6 Architecture

Hyperscale data centers commonly use Clos fabric topologies with BGP as the fabric control plane. Key IPv6 design principles:

- **BGP unnumbered**: uses link-local addresses (no unique global IPv6 subnet per fabric link)
- **/127 for numbered inter-router P2P links**: useful when you are not using unnumbered peering
- **/48 per pod**: hierarchical allocation for summarization
- **ECMP with many equal-cost paths**: size to platform support (often 64-way or more)
- **No IGP**: use only BGP between spine and leaf tiers

## Address Plan for Hyperscale

```text
Hyperscale DC address plan:
Total DC allocation: 2001:db8::/32

Pod 1: 2001:db8:1::/48
  Leaf pair 1: 2001:db8:1::/52
  Leaf pair 2: 2001:db8:1:1000::/52
  ...
  Server /64s: 2001:db8:1:1::/64 per rack

Spine tier: 2001:db8:ff00::/48
  Management: 2001:db8:ff10::/48

Router loopbacks (/128s):
  Leaf-1:  2001:db8:ffff::1/128
  Leaf-2:  2001:db8:ffff::2/128
  Spine-1: 2001:db8:ffff::101/128
```

## BGP Unnumbered for Fabric Links

```bash
# FRRouting (FRR) - BGP unnumbered

# Uses link-local addresses for BGP peering (no unique global subnet per link needed)

# /etc/frr/frr.conf on leaf switch

interface eth1
  ipv6 nd ra-interval 10
  no ipv6 nd suppress-ra
  # Link-local only - no unique global IPv6 address on the fabric link

router bgp 65001
  bgp router-id 1.1.1.1
  bgp bestpath as-path multipath-relax

  # BGP unnumbered peer
  neighbor eth1 interface remote-as external
  neighbor eth2 interface remote-as external
  neighbor eth3 interface remote-as external
  neighbor eth4 interface remote-as external

  address-family ipv6 unicast
    neighbor eth1 activate
    neighbor eth2 activate
    neighbor eth3 activate
    neighbor eth4 activate
    # Advertise server-facing connected /64s
    redistribute connected
```

## ECMP Configuration

```bash
# Enable maximum ECMP paths in FRR

router bgp 65001
  address-family ipv6 unicast
    maximum-paths 64          # Up to 64-way ECMP if FRR build/platform support it
    maximum-paths ibgp 64

# Linux kernel ECMP
sysctl -w net.ipv6.fib_multipath_hash_policy=1  # Layer 4 hash (standard 5-tuple)
sysctl -w net.ipv6.fib_multipath_use_neigh=1

# Verify ECMP routes
ip -6 route show 2001:db8:2::/48 | head -10
# Should show multiple nexthops
```

## Server-Leaf Connectivity

```bash
# Server gets an address from a /64 via SLAAC from the leaf router
# Leaf advertises /64 into BGP fabric

# On leaf router (radvd)
cat > /etc/radvd.conf << 'EOF'
interface eth-server-1 {
    AdvSendAdvert on;
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 10;
    AdvDefaultLifetime 30;

    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 300;
        AdvPreferredLifetime 120;
    };
};
EOF

# BGP: advertise server subnets from leaf
# (auto-advertised via "redistribute connected")
vtysh -c "show bgp ipv6 unicast 2001:db8:1:1::/64"
```

## Anycast Gateway for Hyperscale

```bash
# All leaf switches serving the same server subnet share the same gateway IPv6 address
# and virtual MAC for that subnet

ANYCAST_GW="2001:db8:1:1::1"
ANYCAST_MAC="02:00:00:00:00:01"  # Shared virtual MAC

# On each leaf:
ip link set dev br-servers address ${ANYCAST_MAC}
ip -6 addr add ${ANYCAST_GW}/64 dev br-servers

# Server-side validation:
ip -6 route show default
# The default route is learned from RA on the local leaf
```

## Scale Validation

```bash
#!/bin/bash
# validate-hyperscale.sh - Check routing table scale

echo "=== IPv6 Routing Table ==="
ip -6 route show | wc -l
echo "routes"

echo ""
echo "=== BGP Summary ==="
vtysh -c "show bgp ipv6 unicast summary" | tail -20

echo ""
echo "=== ECMP Paths ==="
# Count installed routes with multiple nexthops
ip -6 route show | grep -c "nexthop"

echo ""
echo "=== NDP Cache ==="
ip -6 neigh show | wc -l
echo "NDP entries"
# Alert if approaching gc_thresh3
THRESH3=$(sysctl -n net.ipv6.neigh.default.gc_thresh3)
CURRENT=$(ip -6 neigh show | wc -l)
echo "NDP utilization: ${CURRENT}/${THRESH3} ($(( CURRENT * 100 / THRESH3 ))%)"
```

## Conclusion

Hyperscale IPv6 data center design centers on Clos fabrics that use BGP unnumbered peering (link-local addresses, no unique global subnet per fabric link). Allocate /48 per pod with /64 server subnets. Enable up to 64-way ECMP in FRR with `maximum-paths 64` and kernel multipath hash, subject to platform limits. Use anycast gateway so leafs serving the same subnet share a gateway IPv6 address and MAC. Monitor neighbor-table scale on directly connected server networks and size `gc_thresh3` with headroom above the expected number of non-permanent neighbor entries.
