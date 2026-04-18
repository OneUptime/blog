# How to Configure VXLAN VTEPs with IPv6 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, VTEP, IPv6, Linux, Data Center, Overlay

Description: Configure VXLAN Tunnel Endpoints (VTEPs) with IPv6 addresses, manage FDB tables, and implement multi-VNI setups with IPv6 underlay.

## VTEP with IPv6 Loopback

Best practice: use a loopback IPv6 address as the VTEP source IP for stability:

```bash
# Add VTEP loopback address

ip addr add 2001:db8:1::1/128 dev lo

# Create VXLAN interface sourced from loopback
ip link add vxlan100 type vxlan \
    id 100 \
    local 2001:db8:1::1 \
    dstport 4789 \
    nolearning

ip link set vxlan100 up
echo "VTEP source: 2001:db8:1::1"
```

## Multi-VNI VTEP Setup

Each VNI maps to a different tenant network:

```bash
#!/bin/bash
# Create multiple VNI tunnels from the same VTEP

VTEP_IP="2001:db8:1::1"

# Add loopback
ip addr add ${VTEP_IP}/128 dev lo

# Create three VNIs for three tenant networks
for VNI in 100 200 300; do
    ip link add vxlan${VNI} type vxlan \
        id ${VNI} \
        local ${VTEP_IP} \
        dstport 4789 \
        nolearning

    ip link set vxlan${VNI} up

    # Create bridge per VNI
    ip link add br${VNI} type bridge
    ip link set vxlan${VNI} master br${VNI}
    ip link set br${VNI} up

    echo "Created VNI ${VNI} → bridge br${VNI}"
done
```

## FDB Management for IPv6 VTEPs

```bash
# Script: add remote VTEP entries for VNI 100
REMOTE_VTEPS=("2001:db8:2::1" "2001:db8:3::1" "2001:db8:4::1")

for VTEP in "${REMOTE_VTEPS[@]}"; do
    # BUM flooding: send unknown unicast/broadcast/multicast to all VTEPs
    bridge fdb append 00:00:00:00:00:00 \
        dev vxlan100 \
        dst ${VTEP}

    echo "Added BUM entry for ${VTEP}"
done

# Show all FDB entries with IPv6 destinations
bridge fdb show dev vxlan100 | grep -v 'permanent'
```

## VTEP ARP Suppression

ARP suppression reduces broadcast traffic in large VXLAN fabrics:

```bash
# Enable ARP suppression on VXLAN interface
ip link add vxlan100 type vxlan \
    id 100 \
    local 2001:db8:1::1 \
    dstport 4789 \
    nolearning

# Enable ARP/ND suppression on the VXLAN bridge port
# (neigh_suppress is a per-port bridge_slave attribute, not a bridge-wide one)
ip link set vxlan100 master br100
ip link set vxlan100 type bridge_slave neigh_suppress on

# Add static ARP entries for known hosts
ip neigh add 10.0.0.1 lladdr 52:54:00:11:22:33 dev br100 nud permanent
ip neigh add 10.0.0.2 lladdr 52:54:00:44:55:66 dev br100 nud permanent

# For IPv6 hosts, add NDP entries
ip -6 neigh add 2001:db8:100::1 lladdr 52:54:00:11:22:33 dev br100 nud permanent
```

## VTEP Statistics and Monitoring

```bash
# Check VTEP tunnel counters
ip -s link show vxlan100

# Monitor FDB learning
watch -n 1 'bridge fdb show dev vxlan100 | wc -l'

# Capture and decode VXLAN packets
tcpdump -i eth0 -n -v 'udp port 4789' 2>/dev/null | head -50

# Check VTEP reachability
for VTEP in "2001:db8:2::1" "2001:db8:3::1"; do
    if ping6 -c 1 -W 2 ${VTEP} &>/dev/null; then
        echo "${VTEP}: reachable"
    else
        echo "${VTEP}: UNREACHABLE"
    fi
done

# Verify VTEP source IP is routable
ip -6 route get 2001:db8:2::1
```

## VTEP with VRF (L3 VXLAN)

For L3 VXLAN (symmetric IRB), each tenant VRF has a VXLAN L3 VNI:

```bash
# Create tenant VRF
ip link add vrf-tenant1 type vrf table 100
ip link set vrf-tenant1 up

# L3 VXLAN for tenant1 (VNI 10000)
ip link add vxlan10000 type vxlan \
    id 10000 \
    local 2001:db8:1::1 \
    dstport 4789 \
    nolearning

ip link set vxlan10000 master vrf-tenant1
ip link set vxlan10000 up

# Show VRF routing
ip route show vrf vrf-tenant1
```

## Conclusion

IPv6 VTEP addresses provide stable tunnel endpoints when assigned to loopback interfaces. Multi-VNI setups share a single VTEP IP across many VNIs, with each VNI getting its own VXLAN interface and bridge. FDB management with `bridge fdb append` controls BUM flooding scope. ARP/ND suppression on bridge devices reduces broadcast load significantly in large fabrics. For production environments, BGP EVPN automates VTEP discovery and FDB population rather than manual configuration.
