# How to Identify MTU Mismatch Issues on Network Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, Mismatch, Networking, Linux, Troubleshooting, Interface

Description: Identify MTU mismatches between network interfaces, tunnel endpoints, and network paths that cause fragmentation, packet drops, and performance degradation.

## Introduction

MTU mismatches occur when different parts of a network path expect different maximum packet sizes. Common scenarios: a host configured for 9000 MTU (jumbo frames) connecting to a switch that only supports 1500 MTU, or a VPN endpoint with wrong MTU that silently drops large packets. Identifying mismatches requires checking MTU at each hop and comparing with actual test packets.

## Check Local Interface MTU

```bash
# List all interfaces with their MTUs:

ip link show | grep -E "^[0-9]|mtu"
# Shows each interface line, including its mtu value

# Or more readable:
ip -o link show | awk '{sub(/:$/, "", $2); for (i=1; i<=NF; i++) if ($i == "mtu") print $2, "MTU:", $(i+1)}'

# Check specific interface:
ip link show eth0 | grep mtu
cat /sys/class/net/eth0/mtu

# Check all tunnel interfaces:
ip link show | grep -E "tun|gre|vxlan|wireguard|wg"
```

## Detect MTU Mismatch with ping

```bash
# With DF set, probes larger than the path MTU fail:

# Test from HOST A to HOST B:
# Host A has MTU 9000 (jumbo frames):
ping -4 -M do -s 8972 -c 3 HOST_B   # IPv4: 9000 - 28 = 8972
# If HOST B or the path between them doesn't support jumbo: fail

# Test from HOST B to HOST A:
# Host B has MTU 1500:
ping -4 -M do -s 1472 -c 3 HOST_A   # IPv4: 1500 - 28 = 1472
# Should succeed if the path supports 1500-byte IPv4 packets

# Asymmetric success → MTU mismatch:
# A → B works at 1472 but not 8972: path MTU is below 9000 (often 1500)
# B → A fails at 1472: interface or path MTU < 1500
```

## Find MTU Mismatch in a Path

```bash
# Use tracepath to discover the end-to-end path MTU:
tracepath -n 10.20.0.5
# Shows "pmtu" when the discovered path MTU changes

# Example output showing mismatch:
# 1?: [LOCALHOST]  pmtu 9000
# 1: 10.0.0.1      0.5ms
# 2: 192.168.1.1   2.1ms
# 3: 10.1.0.1      3.5ms  pmtu 1500   ← path MTU drops here
# 4: 10.20.0.5     5.1ms reached
#     Resume: pmtu 1500 hops 4 back 4

# The end-to-end path MTU is 1500
# tracepath shows where the path MTU changed during the trace,
# but you still need to check the device at that hop to confirm the exact interface MTU
```

## Common MTU Mismatch Scenarios

```bash
# Scenario 1: Jumbo frame NIC + non-jumbo switch port
# Symptom: large transfers fail, small transfers work
# Check: NIC MTU
ip link show eth0 | grep mtu
# vs switch port MTU (check switch configuration)

# Scenario 2: Docker container MTU mismatch
# Docker default bridge MTU can differ from host MTU
docker network inspect bridge --format '{{json .Options}}'   # Look for com.docker.network.driver.mtu
# vs:
ip link show eth0 | grep mtu
# If the container bridge MTU exceeds the actual egress path MTU: large packets may fragment or get dropped

# Scenario 3: VPN tunnel MTU not updated when path changes
ip link show wg0 | grep mtu    # Tunnel interface
ip link show eth0 | grep mtu   # Underlying interface
# wg-quick auto-determines MTU from the endpoint/default-route MTU,
# and on Linux subtracts 80 bytes when it calculates one automatically

# Scenario 4: VLAN interface inheriting wrong MTU
ip link show eth0.100 | grep mtu  # VLAN interface
ip link show eth0 | grep mtu      # Parent interface
# Both should have same MTU (VLAN adds 4 bytes tag but MTU remains same)
```

## Verify Two Hosts Can Exchange Max-Size Packets

```bash
#!/bin/bash
# Verify MTU from this host to a peer
# Run it from each host to test both directions
HOST2="10.20.0.11"

echo "Testing MTU from this host to $HOST2"
echo "========================================"

# Test standard Ethernet MTU (1500):
echo -n "1500 MTU: "
if ping -4 -M do -s 1472 -c 3 -W 2 "$HOST2" > /dev/null 2>&1; then
    echo "PASS"
else
    echo "FAIL"
fi

# Test jumbo frames (9000):
echo -n "9000 MTU: "
if ping -4 -M do -s 8972 -c 3 -W 2 "$HOST2" > /dev/null 2>&1; then
    echo "PASS (jumbo frames working)"
else
    echo "FAIL (jumbo frames not supported on this path)"
fi

# Find actual path MTU:
ACTUAL_MTU=$(tracepath -4 -n "$HOST2" 2>/dev/null | awk '/pmtu/ {for (i=1; i<=NF; i++) if ($i == "pmtu") mtu=$(i+1)} END {print mtu}')
echo "Path MTU from tracepath: ${ACTUAL_MTU:-not determined}"
```

## Conclusion

MTU mismatches are identified by testing packet delivery at different sizes with the DF bit set. Use `tracepath` to discover the path MTU and where it drops during the trace. Common mismatches are jumbo-enabled hosts connecting to standard-MTU switches, Docker containers with wrong MTU settings, and VPN tunnels not accounting for tunnel overhead. Fix mismatches by aligning MTU values across all interfaces in the path, or by reducing the MTU of the sending interface to match the bottleneck.
