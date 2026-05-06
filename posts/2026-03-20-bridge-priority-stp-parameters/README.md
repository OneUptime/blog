# How to Configure Bridge Priority and STP Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Bridge, STP, Spanning Tree Protocol, Linux, Brctl, Ip link, Bridge Priority, RSTP

Description: Learn how to configure Spanning Tree Protocol (STP) parameters on Linux bridges including bridge priority, port cost, and port priority to control root bridge election and forwarding topology.

---

STP prevents Layer 2 loops in networks with multiple bridge paths. Configuring bridge priority determines which bridge becomes the root bridge and controls the active forwarding topology.

## STP Basics

```text
Root Bridge: Lowest bridge ID (priority + MAC)
Bridge ID: Priority (0-65535, lower=better) + bridge MAC

Default priority: 32768
To prefer this bridge as root: set a lower priority than competing bridges
(e.g., 4096 when other bridges use the default 32768)
```

## Setting Bridge Priority with brctl

```bash
# Set bridge priority

brctl setbridgeprio br0 4096

# Verify
brctl showstp br0 | grep "bridge id"
# bridge id              1000.aabbccddeeff
# (1000 hex = 4096 decimal)
```

## Setting Bridge Priority with ip link

```bash
# Set bridge priority using ip link
ip link set br0 type bridge priority 4096

# Verify all bridge parameters
ip -d link show br0 | grep bridge
```

## Setting Port Cost

```bash
# Port cost influences path selection (lower cost = preferred path)
# Linux bridge defaults are based on link speed:
# 100 for 10Mbps, 19 for 100Mbps, 5 for 1Gbps, 2 for 10Gbps

# Set port cost on a bridge port
brctl setpathcost br0 eth0 10    # Lower cost = preferred

# Or with ip link
ip link set eth0 type bridge_slave cost 10
```

## Setting Port Priority

```bash
# Port priority (0-63, lower = more preferred)
# Default: 32

brctl setportprio br0 eth0 16   # More preferred port

# With ip link
ip link set eth0 type bridge_slave priority 16
```

## Enabling STP

```bash
# Enable STP on the bridge
ip link set br0 type bridge stp_state 1
# Note: This enables STP; it does not by itself select RSTP

# Set hello time, max age, forward delay (values are in seconds)
ip link set br0 type bridge hello_time 2       # 2 seconds
ip link set br0 type bridge max_age 20         # 20 seconds
ip link set br0 type bridge forward_delay 15   # 15 seconds
```

## Persistent STP Configuration (systemd-networkd)

```ini
# /etc/systemd/network/br0.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
STP=yes
Priority=4096
HelloTimeSec=2
MaxAgeSec=20
ForwardDelaySec=15
```

## Verifying STP State

```bash
# Show STP state for all ports
brctl showstp br0

# Output:
# br0
#  bridge id              1000.aabbccddeeff
#  designated root        1000.aabbccddeeff   ← This bridge IS the root
#  root port                0                 ← 0 = this is root bridge
#  path cost                  0
# 
# eth0 (1)
#  port id                8001
#  state                  forwarding          ← Active port
#  designated cost           0
#  port cost                 5

# Check per-port state
bridge link show
```

## Key Takeaways

- Lower bridge priority wins root bridge election; a value such as 4096 is commonly used for a preferred root bridge.
- Linux bridge priority is an unsigned 16-bit value (0-65535); lower values are preferred.
- Port cost controls path selection within STP; lower cost paths are preferred.
- Enabling `stp_state` turns on STP for the bridge; it does not by itself select RSTP.
