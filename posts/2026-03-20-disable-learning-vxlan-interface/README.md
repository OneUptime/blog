# How to Disable Learning on a VXLAN Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, Nolearning, FDB, Linux, EVPN, Overlay Networking, Static FDB

Description: Learn how to disable MAC learning on a Linux VXLAN interface and why you would do so, including the use cases for static FDB entries and EVPN-based MAC distribution.

---

Disabling learning on a Linux VXLAN device with `nolearning` stops the VXLAN driver from learning remote MAC-to-VTEP mappings from incoming VXLAN traffic. In bridged EVPN deployments, this is typically paired with `learning off` on the VXLAN bridge port.

## Why Disable Learning

- **Security**: Prevents remote traffic from populating false MAC-to-VTEP entries in the VXLAN FDB.
- **Scale**: Dynamic data-plane learning and unknown-traffic flooding do not scale well in large overlays.
- **EVPN integration**: EVPN distributes MAC-to-VTEP mappings via BGP; data-plane learning is redundant.
- **Deterministic forwarding**: Useful for testing and environments with known MAC assignments.

## Creating VXLAN with nolearning

```bash
# Disable VXLAN learning at creation time

ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  nolearning

ip link set vxlan10 up

# Verify nolearning is set
ip -d link show vxlan10
# Output includes: ... nolearning ...
```

## Checking If Learning Is Enabled

```bash
# Check via ip -d link show
ip -d link show vxlan10 | grep -E "learning|nolearning"

# There is no direct sysfs knob for VXLAN learning; use ip link.
```

## Disabling Learning on an Existing Interface

You can toggle `nolearning` on an existing VXLAN device:

```bash
ip link set dev vxlan10 type vxlan nolearning

# Verify nolearning is set
ip -d link show vxlan10

# If vxlan10 is enslaved to a bridge, disable bridge-port MAC learning separately
ip link set dev vxlan10 type bridge_slave learning off
```

## Required: Adding FDB Entries Manually

With `nolearning`, remote MAC-to-VTEP mappings must be explicitly configured unless an EVPN control plane installs them:

```bash
# Flood list for traffic that misses the VXLAN FDB
bridge fdb add 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self static
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.3 self static

# Unicast MAC entries
bridge fdb add aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2 self static
bridge fdb add aa:bb:cc:dd:ee:02 dev vxlan10 dst 10.0.0.3 self static
```

## Integration with EVPN (FRR)

```bash
# Example FRR EVPN address-family fragment
vtysh << 'EOF'
conf t
router bgp 65001
  neighbor 10.0.0.2 remote-as 65002
  address-family l2vpn evpn
    advertise-all-vni
    neighbor 10.0.0.2 activate
  exit-address-family
EOF

# On Linux, pair nolearning with bridge-port learning off when vxlan10 is bridged
ip link set dev vxlan10 type vxlan nolearning
ip link set dev vxlan10 type bridge_slave learning off

# With a complete FRR EVPN configuration, Zebra installs remote MAC/VTEP entries
# No need to manage static entries manually
```

## Verifying No Dynamic Entries Appear

```bash
# After enabling nolearning, send traffic and verify no new dynamic VXLAN FDB entries appear
ping 192.168.100.2

bridge fdb show dev vxlan10 dynamic
# Should be empty

# If vxlan10 is a bridge port and bridge learning is also disabled
bridge fdb show brport vxlan10 dynamic
# Should also be empty
```

## Key Takeaways

- `nolearning` prevents the VXLAN device from learning remote MAC-to-VTEP mappings from incoming VXLAN packets.
- If the VXLAN device is attached to a Linux bridge, disable bridge-port MAC learning separately with `ip link set dev vxlan10 type bridge_slave learning off`.
- Without static entries, an EVPN control plane, or a default flood entry, traffic that misses the VXLAN FDB is dropped.
- Disabling data-plane learning also prevents remote traffic from creating false VTEP associations.
