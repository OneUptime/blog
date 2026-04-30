# How to Understand IPv6 DAD Transmits Setting on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, DAD, Duplicate Address Detection, Sysctl

Description: Learn how to configure the dad_transmits sysctl parameter on Linux to control Duplicate Address Detection (DAD) behavior, including when to disable DAD and how to tune it for reliability.

## What is Duplicate Address Detection?

Duplicate Address Detection (DAD) is an IPv6 mechanism that verifies a new address is unique on the link before it becomes active. The kernel sends Neighbor Solicitation (NS) messages to the solicited-node multicast address and watches for a conflicting Neighbor Advertisement (NA) or Neighbor Solicitation (NS).

```text
Host assigns 2001:db8::10/64
  │
  ├── Sends NS to ff02::1:ff00:10 (solicited-node multicast)
  │   "Is anyone using 2001:db8::10?"
  │
  ├── Waits (address is "tentative")
  │
  └── No conflicting NS/NA received → Address is unique, becomes "preferred"
      Conflicting NS/NA received    → Address is duplicate, not used
```

## dad_transmits Values

```bash
# Check current value

cat /proc/sys/net/ipv6/conf/eth0/dad_transmits

# 0 = Disable DAD (skip duplicate check)
# 1 = Send 1 NS message (default, normal DAD)
# 3 = Send 3 NS messages (more robust, slower)
# N = Send N NS messages before considering address unique
```

## Configuring dad_transmits

```bash
# Disable DAD (useful in trusted environments or for performance)
sysctl -w net.ipv6.conf.eth0.dad_transmits=0

# Normal DAD (default)
sysctl -w net.ipv6.conf.eth0.dad_transmits=1

# More robust DAD (send 3 NS messages)
sysctl -w net.ipv6.conf.eth0.dad_transmits=3

# Apply globally
sysctl -w net.ipv6.conf.all.dad_transmits=1
sysctl -w net.ipv6.conf.default.dad_transmits=1
```

## Persistent Configuration

```bash
cat > /etc/sysctl.d/60-ipv6-dad.conf << 'EOF'
# Standard DAD (1 NS message)
net.ipv6.conf.all.dad_transmits = 1
net.ipv6.conf.default.dad_transmits = 1
EOF

sysctl --system
```

## When to Disable DAD

```bash
# Disable DAD in these scenarios:
# 1. Virtual machines or containers where address uniqueness is guaranteed by orchestration or configuration
# 2. Performance-critical environments where address assignment latency matters
# 3. Loopback or internal interfaces with no risk of duplicates

# Disable DAD on loopback or another isolated internal interface
sysctl -w net.ipv6.conf.lo.dad_transmits=0

# Disable globally for current and future interfaces (not recommended for production)
sysctl -w net.ipv6.conf.all.dad_transmits=0
sysctl -w net.ipv6.conf.default.dad_transmits=0
```

## Monitoring DAD Process

```bash
# Watch for tentative addresses during DAD
ip -6 addr show dev eth0 tentative

# Monitor DAD events in kernel log
dmesg | grep -iE 'duplicate|tentative|dad'
# Example: "IPv6: eth0: IPv6 duplicate address 2001:db8::10 detected!"

# Monitor address state changes
ip -6 monitor addr

# Capture DAD NS/NA messages
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)'
# Type 135 = Neighbor Solicitation (DAD probe)
# Type 136 = Neighbor Advertisement (DAD response)
```

## DAD Timing

```bash
# DAD retransmit timer is set per-interface (milliseconds)
cat /proc/sys/net/ipv6/neigh/eth0/retrans_time_ms
# Default: 1000ms (1 second between NS messages)

# With dad_transmits=1: ~1 second wait before address is active
# With dad_transmits=3: ~3 seconds wait before address is active

# Reduce retransmit time for faster DAD in controlled environments
sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=100
```

## Summary

The `dad_transmits` parameter controls how many Neighbor Solicitation messages are sent during Duplicate Address Detection: `0` disables DAD (fastest but no safety), `1` (default) sends one NS probe, higher values add robustness. DAD runs when a unicast IPv6 address is assigned and DAD is enabled - addresses stay "tentative" until DAD completes. Disable DAD only in trusted environments where address uniqueness is guaranteed by other means.
