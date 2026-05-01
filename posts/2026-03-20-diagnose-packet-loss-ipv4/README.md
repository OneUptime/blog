# How to Diagnose Packet Loss on an IPv4 Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Packet Loss, IPv4, Linux, Networking, Diagnostic, mtr

Description: Systematically diagnose IPv4 packet loss using ping, MTR, tcpdump, and interface statistics to identify whether loss occurs at the physical layer, a specific link, or the destination.

Packet loss causes slow downloads, dropped VoIP calls, and broken connections. But "packet loss" can occur for many different reasons at different points in the network path. This guide walks through a systematic diagnosis.

## Step 1: Confirm Packet Loss with Ping

```bash
# Run enough packets for statistically meaningful results

ping -c 100 8.8.8.8

# Look for: X packets transmitted, Y received, Z% packet loss
# Z > 0 = packet loss detected

# Test different destinations to localize the problem
ping -c 50 192.168.1.1     # Gateway (LAN)
ping -c 50 8.8.8.8         # Internet host
ping -c 50 1.1.1.1         # Different internet host

# Loss to gateway only:
#   → Gateway may be rate-limiting ICMP replies; verify with MTR or app traffic
# Loss to all internet IPs:
#   → Upstream path, ISP, or gateway problem
# Loss to specific IP only:
#   → That path or host may be filtering/deprioritizing ICMP or having issues
```

## Step 2: Identify Which Hop Has Loss with MTR

```bash
# Report-mode traceroute with per-hop loss statistics
sudo mtr --report --report-cycles=50 -n 8.8.8.8

# Key columns:
# Loss%: percentage of probes not answered by this hop
# StDev: standard deviation of RTT (high = variable latency)

# Interpretation:
# Loss at hop 3, zero loss at hop 4+ → hop 3 is rate-limiting/deprioritizing ICMP
# Loss at hop 3, same loss at hop 4+ → real loss likely starts at or before hop 3
```

## Step 3: Check Physical Layer Errors

```bash
# Check interface statistics for errors
ip -s -s link show eth0

# Output includes:
# RX: bytes  packets  errors  dropped  missed  mcast
#     12345    100      0       0        0       0
# RX errors: length  crc  frame  fifo  overrun
#            0       0    0      0     0
# TX: bytes  packets  errors  dropped  carrier  collsns
#     23456    80       0       0        0        0
# TX errors: aborted  fifo  window  heartbt  transns
#            0        0     0       0        0

# CRC/frame errors > 0 → physical issues (bad cable, faulty NIC, duplex mismatch)
# TX carrier/window errors > 0 → link negotiation or duplex problems
# dropped/missed > 0           → packets discarded; often host resource pressure or queue overflow

# Also check with ethtool
sudo ethtool -S eth0 | grep -Ei 'err|drop|miss|timeout'
```

## Step 4: Check for Duplex Mismatch

```bash
# Duplex mismatch is a common cause of loss and poor throughput on Ethernet LANs
sudo ethtool eth0 | grep -Ei 'speed|duplex|auto-negotiation'

# Expected: both ends agree on speed/duplex; most modern LANs are full-duplex
# If one side is full and the other half: high collision/window errors

# Test a fixed setting only if the switch port is configured identically:
sudo ethtool -s eth0 autoneg off speed 1000 duplex full
```

## Step 5: Capture Loss Events with tcpdump

```bash
# Capture the affected flow for later analysis
sudo tcpdump -nn -i eth0 -w loss.pcap host 8.8.8.8

# Count TCP retransmissions using tshark
sudo tshark -r loss.pcap -Y "tcp.analysis.retransmission"
# Lists suspected retransmissions in the capture

# High retransmissions + low interface errors = loss or congestion beyond the local NIC
# High retransmissions + high interface errors = local physical or host-side problem
```

## Step 6: Check System Buffer Drops

```bash
# Check kernel UDP receive and receive-buffer errors
nstat -az UdpInErrors UdpRcvbufErrors

# Check per-socket receive memory and drop counters
ss -ulm
# Look for skmem:(...,dN) where N > 0 indicates dropped packets for that socket

# Increase receive buffer if needed
sudo sysctl -w net.core.rmem_max=16777216
sudo sysctl -w net.core.rmem_default=16777216
```

## Categorize and Fix

```text
Loss pattern                Likely cause             Fix
--------------------------  ----------------------   -------------------------
Loss at first hop onward    LAN problem              Cable, switch, NIC
Loss to gateway only        ICMP reply deprioritized Verify with MTR/app traffic
Loss beyond gateway         Upstream path issue      Contact ISP/provider
Burst loss (not constant)   Congestion/bufferbloat   QoS, bandwidth upgrade
Loss at specific remote IP  Path or target issue     Verify with app traffic
Loss with high errors       Physical layer failure   Replace cable/NIC/switch
```

Systematic packet loss diagnosis avoids the common trap of blaming the wrong layer - physical errors and ISP congestion look identical from application logs but require completely different fixes.
