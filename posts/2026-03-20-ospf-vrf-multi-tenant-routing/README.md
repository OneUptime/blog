# How to Configure OSPF with VRF for Multi-Tenant Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPF, VRF, Multi-Tenant, IPv4, Routing, FRR, Linux, Networking

Description: Learn how to configure OSPF within a VRF (Virtual Routing and Forwarding) instance on Linux with FRR for multi-tenant network isolation.

---

VRFs create isolated routing tables on a single router, enabling multiple tenants or network segments to use overlapping IP address spaces without interference. Each VRF can run its own OSPF process for dynamic routing within that tenant's network.

## Creating VRFs on Linux

```bash
# Create two VRFs for two tenants

ip link add VRF-A type vrf table 100
ip link add VRF-B type vrf table 200

# Bring the VRFs up
ip link set VRF-A up
ip link set VRF-B up

# Assign interfaces to VRFs
ip link set eth1 master VRF-A   # Tenant A's interface
ip link set eth2 master VRF-B   # Tenant B's interface

# Assign IP addresses (can overlap between VRFs)
ip addr add 10.0.0.1/24 dev eth1
ip addr add 10.0.0.1/24 dev eth2  # Same IP, different VRF - OK!

# Verify VRF assignments
ip link show type vrf
ip route show vrf VRF-A
ip route show vrf VRF-B
```

## FRR: Running OSPF Per VRF

FRR supports VRF-aware routing with a `vrf` keyword in the `router ospf` statement.

```bash
vtysh << 'EOF'
conf t

! OSPF for Tenant A (VRF-A)
router ospf vrf VRF-A
  ospf router-id 10.0.0.1

! Assign interface eth1 (which is in VRF-A) to OSPF
interface eth1 vrf VRF-A
  ip ospf area 0

! OSPF for Tenant B (VRF-B)
router ospf vrf VRF-B
  ospf router-id 10.0.0.1   ! Same router-id is OK in different VRFs

interface eth2 vrf VRF-B
  ip ospf area 0
EOF
```

## Verifying VRF-Specific OSPF

```bash
# Show OSPF summary for each VRF
vtysh -c "show ip ospf vrf VRF-A"
vtysh -c "show ip ospf vrf VRF-B"

# Show OSPF neighbors per VRF
vtysh -c "show ip ospf vrf VRF-A neighbor"
vtysh -c "show ip ospf vrf VRF-B neighbor"

# Show routes per VRF
ip route show vrf VRF-A
ip route show vrf VRF-B

# VRF-specific routing
ip route show vrf VRF-A proto ospf
```

## Enabling VRF-Aware Routing in the Kernel

```bash
# Disable strict reverse path filtering (needed for asymmetric paths in VRFs)
echo "net.ipv4.conf.default.rp_filter = 0" >> /etc/sysctl.conf
echo "net.ipv4.conf.all.rp_filter = 0" >> /etc/sysctl.conf
sysctl -p

# Enable IP forwarding
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
```

## FRR Configuration File

```text
# /etc/frr/frr.conf
frr version 8.x
frr defaults traditional

! Enable VRF support
vrf VRF-A
  vni 100
!
vrf VRF-B
  vni 200
!

interface eth1 vrf VRF-A
  ip ospf area 0.0.0.0
!

interface eth2 vrf VRF-B
  ip ospf area 0.0.0.0
!

router ospf vrf VRF-A
  ospf router-id 10.0.0.1
!

router ospf vrf VRF-B
  ospf router-id 10.0.0.1
!
```

## Key Takeaways

- Linux VRFs use separate routing tables per tenant; create them with `ip link add VRF-X type vrf table Y`.
- FRR's `router ospf vrf <name>` creates an isolated OSPF process for each VRF.
- Overlapping IP addresses between VRFs is allowed and doesn't cause routing conflicts.
- Disable `rp_filter` on VRF interfaces to prevent asymmetric routing issues.
