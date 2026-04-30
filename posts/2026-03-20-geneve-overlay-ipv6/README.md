# How to Configure Geneve Overlay with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GENEVE, IPv6, Overlay, Linux, OVN, Networking

Description: Configure Geneve overlay tunnels over IPv6 on Linux including manual setup, OVN integration, and performance comparison with VXLAN.

## Geneve vs VXLAN

Geneve (Generic Network Virtualization Encapsulation, RFC 8926) is a newer overlay encapsulation protocol that builds on the data-plane model used by VXLAN and NVGRE and adds extensible TLV options:

| Feature | VXLAN | Geneve |
|---|---|---|
| VNI bits | 24 | 24 |
| Header extensions | No | Yes (TLV options) |
| Metadata support | Limited | Rich (OVN metadata) |
| UDP port | 4789 | 6081 |
| IPv6 underlay | Yes | Yes |

## Creating Geneve Tunnel on Linux

```bash
# Load the Geneve kernel module

modprobe geneve

# Create Geneve tunnel over IPv6
# VNI 100, remote VTEP at 2001:db8:2::1
ip link add geneve100 type geneve \
    id 100 \
    remote 2001:db8:2::1 \
    dstport 6081

ip link set geneve100 up
ip addr add 10.0.0.1/30 dev geneve100

echo "Geneve tunnel created"

# Show tunnel details
ip -d link show geneve100
```

## Point-to-Point Geneve with IPv6

For a simple point-to-point overlay between two hosts:

```bash
#!/bin/bash
# Host A: 2001:db8:1::1
# Host B: 2001:db8:2::1

# On Host A
create_geneve_p2p() {
    local LOCAL=$1
    local REMOTE=$2
    local VNI=$3
    local OVERLAY_ADDR=$4

    ip link add geneve${VNI} type geneve \
        id ${VNI} \
        remote ${REMOTE} \
        dstport 6081

    ip link set geneve${VNI} up
    ip addr add ${OVERLAY_ADDR} dev geneve${VNI}
    ip link set geneve${VNI} mtu 1430  # 1500 - 70 bytes for Ethernet-in-Geneve over IPv6

    echo "Geneve VNI ${VNI}: ${LOCAL} → ${REMOTE}"
}

# Create tunnels on Host A
create_geneve_p2p "2001:db8:1::1" "2001:db8:2::1" 100 "10.0.0.1/30"
create_geneve_p2p "2001:db8:1::1" "2001:db8:3::1" 200 "10.0.1.1/30"
```

## OVN with IPv6 Underlay (Geneve)

Open Virtual Network (OVN) supports Geneve and VXLAN, with Geneve as the preferred encapsulation between hypervisors. It also supports IPv6 tunnel endpoints:

```bash
# Configure OVS/OVN to use IPv6 for tunnel endpoints
# Set the local tunnel IP on this host
ovs-vsctl set Open_vSwitch . \
    external_ids:ovn-encap-type=geneve \
    external_ids:ovn-encap-ip=2001:db8:1::1

# Point to OVN Southbound database
ovs-vsctl set Open_vSwitch . \
    external_ids:ovn-remote=tcp:[2001:db8::db]:6642

# Show current encap config
ovs-vsctl get Open_vSwitch . external_ids

# List interface entries and look for type: geneve
ovs-vsctl -- --columns=name,type,options list Interface
```

## Geneve Overhead Calculation

```text
Geneve over IPv6 effective MTU reduction for a standard Ethernet Geneve device:

  Inner Ethernet:  14 bytes
  Outer IPv6:      40 bytes
  Outer UDP:        8 bytes
  Geneve header:    8 bytes (base, no options)
  ─────────────────────────
  Total overhead:  70 bytes (no options)

With OVN metadata TLV:
  + 8 bytes (one Geneve option)
  Typical OVN total: 78 bytes

VXLAN over IPv6: 70 bytes (same base overhead as Geneve)
```

```bash
# Calculate effective MTU for Geneve over IPv6
PHYS_MTU=1500
GENEVE_OVERHEAD=70

EFFECTIVE_MTU=$((PHYS_MTU - GENEVE_OVERHEAD))
echo "Effective MTU for Geneve/IPv6: ${EFFECTIVE_MTU}"  # 1430 without Geneve options

# Set MTU on Geneve interface
ip link set geneve100 mtu ${EFFECTIVE_MTU}
```

## Monitoring Geneve Tunnels

```bash
# Capture Geneve traffic (UDP port 6081)
tcpdump -i eth0 -n -v 'ip6 and udp port 6081'

# Check tunnel statistics
ip -s link show geneve100

# Test tunnel connectivity
ping -I geneve100 10.0.0.2

# Verify the underlay path between tunnel endpoints
traceroute -6 -s 2001:db8:1::1 2001:db8:2::1

# Check OVN tunnel status
ovs-vsctl -- --columns=name,type,options list Interface
```

## Conclusion

Geneve over IPv6 provides a flexible overlay with extensible metadata support via TLV options - critical for OVN's per-flow context. The Linux kernel supports Geneve natively with `ip link add ... type geneve`. UDP port 6081 is the standard Geneve port. For a standard Ethernet Geneve device over an IPv6 underlay, the effective MTU reduction is 70 bytes before any Geneve options are added; VXLAN has the same base overhead, while OVN's Geneve metadata typically adds another 8 bytes. OVN can use an IPv6 underlay when `external_ids:ovn-encap-ip` is set to an IPv6 address.
