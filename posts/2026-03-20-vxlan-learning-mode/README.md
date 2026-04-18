# How to Configure VXLAN Learning Mode (Source Address Learning)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, MAC Learning, Source Address Learning, FDB, Linux, Overlay Networking

Description: Learn how VXLAN source address learning works on Linux, how to enable or tune it, and when to use dynamic learning vs. static FDB entries or EVPN.

---

VXLAN source address learning (MAC learning) allows the VTEP to dynamically discover which MAC addresses are behind which remote VTEPs by examining the source of incoming VXLAN packets.

## How VXLAN Learning Works

```text
1. Host2 sends a packet from MAC aa:bb:cc:dd:ee:02 via VXLAN to Host1
2. Host1's kernel sees the packet was encapsulated with source IP 10.0.0.2
3. Kernel adds FDB entry: aa:bb:cc:dd:ee:02 → VTEP 10.0.0.2
4. Next packet to aa:bb:cc:dd:ee:02 is sent directly to 10.0.0.2 (unicast)
5. No more flooding for that MAC
```

## Enabling MAC Learning (Default)

```bash
# Learning is enabled by default - no special flag needed

# group 239.1.1.10 is the multicast address for initial BUM traffic
ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  group 239.1.1.10 \
  dev eth0

ip link set vxlan10 up

# Verify learning is on
ip -d link show vxlan10 | grep -E "ageing|learn"
# srcport 0 0 dstport 4789 ageing 300 ...  (no 'nolearning' = learning enabled)
```

## Tuning the FDB Ageing Time for Learned Entries

```bash
# Default: 300 seconds; set to 60 for faster MAC mobility
ip link set vxlan10 type vxlan ageing 60

# Or at creation:
ip link add vxlan10 type vxlan id 10 dstport 4789 local 10.0.0.1 ageing 60 ...
```

## Disabling Learning (nolearning)

```bash
# Disable MAC learning - all entries must be static or via EVPN
ip link add vxlan10 type vxlan \
  id 10 \
  dstport 4789 \
  local 10.0.0.1 \
  nolearning

# With nolearning, you must add BUM and unicast FDB entries manually
bridge fdb add 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self permanent
```

## Monitoring Learned FDB Entries

```bash
# Show FDB entries (learned entries have no "permanent" flag)
bridge fdb show dev vxlan10

# Output:
# 00:00:00:00:00:00 dev vxlan10 dst 10.0.0.2 self permanent   ← static
# aa:bb:cc:dd:ee:02 dev vxlan10 dst 10.0.0.2 self             ← learned

# Count learned entries
bridge fdb show dev vxlan10 | grep -v permanent | wc -l

# Watch for new learned entries
watch -n 1 "bridge fdb show dev vxlan10 | grep -v permanent"
```

## When to Use Learning vs. Static/EVPN

| Mode | Best For |
|------|----------|
| Learning + multicast | Small/test deployments (< 100 hosts) |
| Learning + unicast flood | Medium deployments (known VTEPs) |
| nolearning + static FDB | Small fixed deployments |
| nolearning + EVPN | Production large-scale deployments |

## Key Takeaways

- VXLAN learning is enabled by default; the kernel learns MAC-to-VTEP mappings from incoming frames.
- Use `ageing` to control how long learned entries persist (default 300 seconds).
- Disable learning with `nolearning` when using EVPN or static FDB for controlled, predictable forwarding.
- In large deployments, dynamic learning creates network flooding; EVPN provides scalable MAC distribution.
