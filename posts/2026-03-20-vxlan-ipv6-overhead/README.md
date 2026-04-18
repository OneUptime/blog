# How to Calculate and Optimize VXLAN IPv6 Overhead

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, IPv6, MTU, Overhead, Performance, Networking

Description: Calculate VXLAN encapsulation overhead for IPv6 underlay, configure optimal MTU settings, and implement path MTU discovery for VXLAN fabrics.

## VXLAN IPv6 Overhead Breakdown

```text
VXLAN over IPv6 encapsulation stack:

┌─────────────────────────────────────┐
│ Outer Ethernet header      14 bytes │
├─────────────────────────────────────┤
│ Outer IPv6 header          40 bytes │
├─────────────────────────────────────┤
│ Outer UDP header            8 bytes │
├─────────────────────────────────────┤
│ VXLAN header                8 bytes │
├─────────────────────────────────────┤
│ Inner Ethernet frame              ↓ │
│  (inner Ethernet header    14 bytes)│
│  (inner IPv4/IPv6 header + payload) │
└─────────────────────────────────────┘

MTU overhead (inner IP perspective): 40 + 8 + 8 + 14 = 70 bytes
  (outer IPv6 + outer UDP + VXLAN + inner Ethernet; outer Ethernet is not counted in MTU)
Tunnel-only encapsulation (outer IP + UDP + VXLAN): 56 bytes
```

Compare with VXLAN over IPv4 (50 bytes overhead):
- IPv4 header: 20 bytes
- IPv6 header: 40 bytes
- **Difference: 20 bytes more for IPv6 underlay**

## MTU Calculation

```bash
#!/bin/bash
# Calculate optimal MTU for VXLAN over IPv6

calculate_vxlan_mtu() {
    local PHYS_MTU=$1
    local OUTER_IPV6=40
    local OUTER_UDP=8
    local VXLAN_HDR=8
    local INNER_ETH=14

    local OVERHEAD=$((OUTER_IPV6 + OUTER_UDP + VXLAN_HDR + INNER_ETH))
    local VM_MTU=$((PHYS_MTU - OVERHEAD))

    echo "Physical MTU:   ${PHYS_MTU}"
    echo "Overhead:       ${OVERHEAD} bytes"
    echo "VM/Overlay MTU: ${VM_MTU}"
}

# Standard 1500 byte physical MTU

calculate_vxlan_mtu 1500
# VM MTU: 1430

# Jumbo frame infrastructure (9000 byte MTU)
calculate_vxlan_mtu 9000
# VM MTU: 8930

echo ""
echo "Recommendation: Use jumbo frames (9000 MTU) on physical fabric"
echo "to give VMs a standard 1500-byte MTU with room to spare."
```

## Configuring MTU on All Layers

```bash
#!/bin/bash
# Comprehensive MTU configuration for VXLAN over IPv6

# 1. Physical interface (should be 9000 for jumbo, or at least 1570)
PHYS_IFACE="eth0"
PHYS_MTU=9000
ip link set ${PHYS_IFACE} mtu ${PHYS_MTU}

# 2. VXLAN interface
VXLAN_IFACE="vxlan100"
VXLAN_MTU=$((PHYS_MTU - 70))  # 8930
ip link set ${VXLAN_IFACE} mtu ${VXLAN_MTU}

# 3. Bridge interface
BRIDGE_IFACE="br100"
ip link set ${BRIDGE_IFACE} mtu ${VXLAN_MTU}

echo "MTU configured:"
echo "  ${PHYS_IFACE}: ${PHYS_MTU}"
echo "  ${VXLAN_IFACE}: ${VXLAN_MTU}"
echo "  ${BRIDGE_IFACE}: ${VXLAN_MTU}"

# 4. Verify effective MTU
ip link show ${PHYS_IFACE} | grep mtu
ip link show ${VXLAN_IFACE} | grep mtu
```

## Path MTU Discovery for VXLAN

PMTUD issues occur when intermediate devices don't support IPv6 fragmentation:

```bash
# IPv6 PMTU Discovery is mandatory per RFC 8201 and always on;
# the kernel learns PMTUs from ICMPv6 "Packet Too Big" messages automatically.
# Tunables live under net.ipv6.route.* — e.g. lower the cache lifetime to
# re-probe paths more aggressively after topology changes.
sysctl -w net.ipv6.route.mtu_expires=600

# Check PMTU cache (route exceptions)
ip -6 route show cache

# Force PMTU update
ip -6 route flush cache

# Test PMTU with ping
ping6 -M do -s 1400 2001:db8:2::1
# -M do: prohibit fragmentation (DF bit equivalent for IPv6)
# -s 1400: payload size to test

# Verify no fragmentation in VXLAN traffic
ethtool -S eth0 | grep fragment 2>/dev/null || \
    nstat -z | grep Ip6FragCreates
```

## VXLAN Offload for IPv6

Hardware offload reduces CPU overhead from VXLAN encapsulation:

```bash
# Check current offload settings (VXLAN reuses the generic UDP-tunnel offload)
ethtool -k eth0 | grep -E 'udp_tnl|udp-segmentation|gro'

# Enable VXLAN UDP-tunnel segmentation offload if supported
ethtool -K eth0 tx-udp_tnl-segmentation on 2>/dev/null || \
    echo "tx-udp_tnl-segmentation not supported"

# Enable checksum offload for UDP-tunneled traffic
ethtool -K eth0 tx-udp_tnl-csum-segmentation on 2>/dev/null || \
    echo "tx-udp_tnl-csum-segmentation not supported"

# GRO for forwarded UDP (kernel >= 5.12): helps VTEP forwarding throughput
ethtool -K eth0 rx-udp-gro-forwarding on 2>/dev/null || \
    echo "rx-udp-gro-forwarding not supported (requires Linux 5.12+)"

# Check if UDP-tunnel offloads are active
ethtool -k eth0 | grep -E 'udp_tnl|udp-gro'
```

## Measuring VXLAN Throughput Impact

```bash
# Baseline: direct IPv6 throughput
iperf3 -s -B 2001:db8:1::1 &
iperf3 -c 2001:db8:2::1 -t 10 -J | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print('Direct: %.0f Mbps' % (d['end']['sum_received']['bits_per_second']/1e6))"

# VXLAN overlay throughput
iperf3 -s -B 10.0.0.1 &
iperf3 -c 10.0.0.2 -t 10 -J | \
    python3 -c "import json,sys; d=json.load(sys.stdin); print('VXLAN: %.0f Mbps' % (d['end']['sum_received']['bits_per_second']/1e6))"
```

## Conclusion

VXLAN over IPv6 adds 70 bytes of overhead per frame compared to 50 bytes for IPv4 underlay. This 20-byte difference matters at line rate on high-speed links. The solution is jumbo frames: a 9000-byte physical MTU gives VMs an effective 8930-byte MTU, far exceeding the typical 1500-byte requirement. If jumbo frames are unavailable, configure physical MTU to at least 1570 bytes (1500 + 70) to give VMs a standard 1500-byte experience. Enable hardware VXLAN offload where available to minimize CPU overhead from encapsulation.
