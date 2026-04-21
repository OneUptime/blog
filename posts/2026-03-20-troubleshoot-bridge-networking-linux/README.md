# How to Troubleshoot Bridge Networking Issues on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Network Bridge, Troubleshooting, Networking, FDB, STP, tcpdump

Description: Systematically diagnose and fix common Linux bridge networking problems including missing connectivity, STP blocking, incorrect FDB entries, and interface state issues.

## Introduction

Bridge networking issues commonly stem from incorrect interface states, STP blocking ports, IP address misconfiguration (IP on physical interface instead of bridge), or missing FDB entries. This guide provides a systematic troubleshooting approach.

## Step 1: Check Interface and Bridge State

```bash
# Check bridge is UP

ip link show br0
# Should show: state UP

# Check all bridge ports are UP and in forwarding state
bridge link show
# Should show: state forwarding (not blocking or listening)

# Check physical interface has NO IP (IP should be on bridge)
ip addr show eth0
# Should show no inet line
```

## Step 2: Verify IP is on the Bridge

A common mistake is leaving the IP on the physical interface after adding it to the bridge:

```bash
# Wrong: IP on eth0
# ip addr show eth0 → inet 192.168.1.100/24

# Correct: IP on br0
ip addr show br0
# Should show inet 192.168.1.100/24

# Fix: move IP from eth0 to br0
ip addr del 192.168.1.100/24 dev eth0
ip addr add 192.168.1.100/24 dev br0
```

## Step 3: Check FDB for MAC Learning

```bash
# Check if destination MAC is in the FDB
bridge fdb show br br0

# If FDB is empty or missing the target MAC, the bridge hasn't learned it
# Generate traffic from the target host to populate the FDB
```

## Step 4: Check for STP Blocking

STP can block ports, causing connectivity failure:

```bash
# Check port states
bridge link show
# BLOCKED ports won't forward traffic

# Check STP state
ip -d link show br0
# Look for: stp_state 0 or stp_state 1

# If STP is blocking and there are no loops, disable it
ip link set br0 type bridge stp_state 0
ip link set br0 type bridge forward_delay 0
```

## Step 5: Capture Traffic to Find the Issue

```bash
# Capture on the bridge to inspect traffic visible on br0
tcpdump -i br0 -n

# Capture on a specific port
tcpdump -i eth0 -n

# Look for ARP requests - if ARP is working but pings fail, check routing or firewall policy
tcpdump -i br0 arp -n
```

## Step 6: Check Routing

```bash
# Verify routing table
ip route show

# Check default gateway is reachable
ping -I br0 192.168.1.1

# Check ARP for the gateway
ip neigh show dev br0
```

## Common Issues Summary

| Issue | Symptom | Fix |
|---|---|---|
| IP on wrong interface | No connectivity from host | Move IP to br0 |
| STP blocking port | One-way or no connectivity | Disable STP or wait |
| Interface not added to bridge | No L2 forwarding | `ip link set eth0 master br0` |
| Port state DOWN | No traffic | `ip link set eth0 up` |
| MTU mismatch | Large packets fail | Match MTU on all bridge ports |
| Bridge filter rules | Traffic dropped | Check nftables/ebtables/iptables FORWARD chain |

## Check Bridge Filter Rules

```bash
# Check nftables rules (modern bridge and inet filtering)
nft list ruleset

# Check ebtables rules (bridge-level, legacy)
ebtables -L

# Check iptables FORWARD chain (only affects bridged traffic when bridge-nf is enabled)
iptables -L FORWARD -n -v

# Check whether bridge-nf is enabled for iptables
cat /proc/sys/net/bridge/bridge-nf-call-iptables
```

## Conclusion

Bridge troubleshooting follows a consistent checklist: interfaces up and in forwarding state, IP assigned to bridge (not physical port), FDB populated, STP not blocking, and no firewall rules dropping traffic. tcpdump on the bridge interface is the most powerful diagnostic tool - if packets arrive at br0 but don't forward, check nftables, ebtables, and FORWARD chain rules.
