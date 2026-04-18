# How to Configure VXLAN with Multiple VTEPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, VTEP, Linux, Overlay Networking, IPv4, Multi-Host, FDB, Networking

Description: Learn how to configure VXLAN with multiple VTEPs (VXLAN Tunnel Endpoints) on Linux to create an overlay network spanning multiple physical hosts.

---

VXLAN (Virtual Extensible LAN) creates Layer 2 overlay networks over Layer 3 IP. Each host running a VTEP can connect to every other VTEP, allowing VMs on different hosts to share the same broadcast domain.

## Architecture

```text
Host1 (10.0.0.1)     Host2 (10.0.0.2)     Host3 (10.0.0.3)
  VTEP1                VTEP2                VTEP3
  vxlan10              vxlan10              vxlan10
  VNI=10               VNI=10               VNI=10

All three VTEPs form one VXLAN segment (VNI 10)
VMs on any host can communicate as if on the same L2 network
```

## Creating VXLAN Interface on Each Host

```bash
# On Host1 (10.0.0.1):

ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  nolearning       # Disable MAC learning (use static FDB)

ip link set vxlan10 up
ip addr add 192.168.100.1/24 dev vxlan10

# On Host2 (10.0.0.2):
ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.2 nolearning
ip link set vxlan10 up
ip addr add 192.168.100.2/24 dev vxlan10

# On Host3 (10.0.0.3):
ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.3 nolearning
ip link set vxlan10 up
ip addr add 192.168.100.3/24 dev vxlan10
```

## Adding Static FDB Entries (Head-End Replication)

For broadcast/unknown unicast, each VTEP needs FDB entries pointing to other VTEPs:

```bash
# On Host1: add all-zeros entry for each remote VTEP (broadcast/unknown)
# Use `append` so multiple entries can share the same (all-zeros) MAC.
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self permanent
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.3 self permanent

# On Host2: add all-zeros entries for Host1 and Host3
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.1 self permanent
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.3 self permanent
```

## Using Multicast for VTEP Discovery (Alternative)

```bash
# Use multicast for BUM (Broadcast, Unknown unicast, Multicast) traffic.
# Multicast group for VNI 10: 239.1.1.10
ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  group 239.1.1.10 \
  dev eth0

# All VTEPs join the same multicast group automatically
# Requires multicast routing in the underlay network
```

## Verifying VXLAN Multi-VTEP Connectivity

```bash
# View FDB entries
bridge fdb show dev vxlan10

# Ping across VTEPs
ping 192.168.100.2   # Should route through VXLAN to Host2
ping 192.168.100.3   # Should route through VXLAN to Host3

# Capture VXLAN traffic (UDP 4789)
tcpdump -i eth0 -nn udp port 4789
```

## Key Takeaways

- Each host runs a VTEP; all VTEPs sharing the same VNI form one L2 broadcast domain.
- With `nolearning`, use static FDB entries or an EVPN control plane for MAC-to-VTEP mapping.
- The all-zeros FDB entry (`00:00:00:00:00:00`) sends BUM traffic to the specified VTEP - add one per remote VTEP.
- Multicast-based VTEP discovery is simpler for large deployments but requires multicast support in the underlay.
