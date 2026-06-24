# How to Fix 'Network Cable Unplugged' Errors Caused by Duplex Mismatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Duplex Mismatch, Ethernet, ethtool, Network Troubleshooting, Linux, Cisco, Speed

Description: Learn how to diagnose and fix duplex mismatch issues that cause intermittent connectivity, high error rates, and 'network cable unplugged' errors on Ethernet interfaces.

---

A duplex mismatch occurs when the two sides of an Ethernet link operate at different duplex settings, commonly when one side is forced and the peer auto-negotiates to half-duplex on 10/100 links. Symptoms include late collisions, high FCS errors, and intermittent connectivity while the link still shows as up.

## Symptoms of Duplex Mismatch

```text
- Interface shows UP but ping drops packets intermittently
- Very slow throughput (< 10% of link speed)
- High error/collision counters on one side
- "Late collisions" in interface statistics
- Link stays up, but applications see intermittent timeouts
```

## Diagnosing with ethtool

```bash
# Check current speed and duplex

ethtool eth0

# Output:
# Settings for eth0:
#   Speed: 100Mb/s
#   Duplex: Half          # mismatch if the peer is forced to Full
#   Auto-negotiation: on
#   Link detected: yes

# Check error counters
ethtool -S eth0 | grep -E "error|collision|miss|drop"
```

## Diagnosing with ip link

```bash
ip -s link show eth0
# RX and TX error counters are visible
# Use these counters with ethtool/switch stats; ip -s link alone does not prove duplex mismatch
```

## Fixing on Linux: Force Speed and Duplex

```bash
# Force full-duplex at 100Mbps
ethtool -s eth0 speed 100 duplex full autoneg off

# Or re-enable auto-negotiation (preferred)
ethtool -s eth0 autoneg on

# Make persistent with udev rule
# /etc/udev/rules.d/10-ethtool.rules
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", \
  RUN+="/sbin/ethtool -s eth0 speed 100 duplex full autoneg off"
```

## Fixing on Cisco IOS

```text
! Force speed and duplex on switch port
interface FastEthernet0/1
  speed 100
  duplex full
  no shutdown

! Verify
show interfaces FastEthernet0/1 | include duplex|speed|error
```

## Best Practice: Match Both Sides

```text
Preferred: Both sides auto-negotiate
  Linux:  ethtool -s eth0 autoneg on
  Cisco:  speed auto, duplex auto

Forced (when both sides must be hard-set on 10/100 links):
  Linux:  ethtool -s eth0 speed 100 duplex full autoneg off
  Cisco:  speed 100, duplex full
  Note:   1000BASE-T normally requires auto-negotiation
```

## Checking Interface Errors Over Time

```bash
# Watch error counters
watch -n 2 "ip -s link show eth0 | grep -A4 RX"

# Check /proc for interface stats
cat /proc/net/dev | grep eth0
```

## Key Takeaways

- Duplex mismatch causes late collisions and high error rates; use `ethtool eth0` to verify speed and duplex.
- The safest fix is to enable auto-negotiation on both sides; avoid mixing forced and auto-negotiated settings.
- If forced settings are required, both sides must be set to the same speed and duplex explicitly, typically on 10/100 links.
- Use `ethtool -S eth0` only if the driver exposes collision-related counters; counter names vary by driver.
