# How to Add Static FDB Entries for VXLAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, FDB, Forwarding Database, Linux, Bridge fdb, Overlay Networking, Static MAC

Description: Learn how to add static forwarding database (FDB) entries for VXLAN interfaces to control MAC-to-VTEP mappings without relying on MAC learning or EVPN.

---

Static FDB entries in VXLAN tell the kernel which VTEP (remote IP) to send traffic to for a specific MAC address. This is used in environments with `nolearning` where MAC learning is disabled and all mappings are provisioned statically or via a controller.

## Types of FDB Entries in VXLAN

```text
1. Unicast: aa:bb:cc:dd:ee:ff → VTEP 10.0.0.2
   Direct delivery to specific host

2. Broadcast/BUM (all-zeros): 00:00:00:00:00:00 → VTEP 10.0.0.2
   Broadcast, Unknown unicast, Multicast - sent to all VTEPs
```

## Adding Static FDB Entries

```bash
# Add unicast entry: MAC aa:bb:cc:dd:ee:01 is on VTEP 10.0.0.2

bridge fdb add aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2 self permanent

# Add BUM entry: send broadcast/unknown traffic to VTEP 10.0.0.2
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self permanent

# Add BUM entry for VTEP 10.0.0.3
bridge fdb append 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.3 self permanent
```

## Viewing FDB Entries

```bash
# Show all FDB entries for the VXLAN interface
bridge fdb show dev vxlan10

# Output:
# 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self permanent
# 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.3 self permanent
# aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2 self permanent

# Filter permanent entries only
bridge fdb show dev vxlan10 | grep permanent
```

## Removing FDB Entries

```bash
# Remove a specific unicast entry
bridge fdb del aa:bb:cc:dd:ee:01 dev vxlan10 dst 10.0.0.2

# Remove a BUM entry
bridge fdb del 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2

# Flush all dynamic (learned) entries, keep static
bridge fdb flush dev vxlan10 dynamic

# Flush all entries
bridge fdb flush dev vxlan10
```

## Automating FDB Population

```bash
#!/bin/bash
# Script to populate static FDB entries from a list
# /etc/vxlan-fdb.conf format: mac vtep_ip

VXLAN_DEV="vxlan10"

# First: add BUM entries for all known VTEPs
for vtep in 10.0.0.2 10.0.0.3 10.0.0.4; do
  bridge fdb append 00:00:00:00:00:00 dev $VXLAN_DEV dst $vtep self permanent
done

# Then: add unicast MAC-to-VTEP mappings
while read mac vtep; do
  bridge fdb add "$mac" dev $VXLAN_DEV dst "$vtep" self permanent
done < /etc/vxlan-fdb.conf
```

## Dynamic Learning vs. Static FDB

```bash
# With learning enabled (default): kernel learns MACs from incoming packets
ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.1

# With learning disabled (static FDB required):
ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.1 nolearning
# Must add all FDB entries manually or via controller (EVPN)
```

## Key Takeaways

- Use `bridge fdb add <mac> dev <vxlan> dst <vtep-ip> self permanent` to statically map MACs to VTEPs.
- Use `bridge fdb append 00:00:00:00:00:00 dev <vxlan> dst <vtep-ip> self permanent` for each remote VTEP to handle broadcast/unknown traffic (head-end replication).
- `permanent` entries persist until explicitly deleted; dynamic (learned) entries expire based on ageing time.
- In production with EVPN, FDB entries are distributed automatically by BGP; static entries are for testing or simple deployments.
