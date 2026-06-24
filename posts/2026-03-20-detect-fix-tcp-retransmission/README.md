# How to Detect and Fix TCP Retransmission Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Retransmission, Packet Loss, Wireshark, Performance

Description: Detect TCP retransmissions using kernel counters, tcpdump, and Wireshark, then diagnose whether the cause is packet loss, congestion, or receiver-side delays.

## Introduction

A TCP retransmission occurs when the sender doesn't receive an ACK within the expected time and resends the packet. Retransmissions directly reduce throughput and increase latency. They are usually caused by packet loss, heavy congestion, or delayed/lost ACKs. Detecting the retransmission rate and identifying its cause leads to the appropriate fix.

## Measuring Retransmission Rate

```bash
# Check kernel-wide TCP retransmission statistics

netstat -s | grep -i "retransmit"
# 98570 segments retransmitted   <- total retransmitted segments since boot

# Or use nstat for delta values
nstat | grep TcpRetrans
# TcpRetransSegs     10      0.0

# Watch retransmission rate in real time
watch -n 1 "nstat -z | grep Tcp.*Retrans"

# Per-connection retransmission stats with ss
ss -tin state established | grep retrans
# retrans:X/Y  <- per-socket retransmission counters, not a direct loss percentage
```

## Capturing Retransmissions with tcpdump

```bash
# Capture TCP data and look for retransmitted segments
# (same sequence range appearing multiple times in the same direction)
tcpdump -i eth0 -n -w /tmp/retrans.pcap 'tcp and host 10.20.0.5'

# Check for retransmissions: repeated seq start:end for the same flow
tcpdump -r /tmp/retrans.pcap -nn -S | awk '
  {
    for (i = 1; i < NF; i++) if ($i == "seq") {
      src=$3
      dst=$5
      sub(/:$/, "", dst)
      seq=$(i+1)
      sub(/,$/, "", seq)
      key = src ">" dst " " seq
      if (seen[key]++) print "Possible retransmission: " $0
    }
  }
'
```

## Wireshark Retransmission Analysis

```text
# In Wireshark:
# Filter: tcp.analysis.retransmission
#   Shows all retransmitted packets (colored in red by default)

# Filter: tcp.analysis.fast_retransmission
#   Shows fast retransmits (triggered by 3 duplicate ACKs)

# Statistics → TCP Stream Graphs → Time-Sequence (Stevens)
#   Retransmissions show as backward arrows in the graph
```

## Diagnosing the Root Cause

```bash
# Cause 1: Network packet loss
# Check interface error counters
ip -s link show eth0
# RX errors, drops, overrun should be zero
# TX errors, drops should be zero

# Check for packet loss with ping
ping -c 100 -i 0.1 10.20.0.5 | tail -5
# >0% loss suggests packet loss on the path (or ICMP being treated differently)

# Cause 2: Network congestion
# Check retransmissions alongside throughput
iperf3 -c 10.20.0.5
# High retransmits under load can point to congestion, but not every retransmit is congestion

# Cause 3: MTU mismatch
# Large packets get dropped, small ones work
ping -s 1472 -M do -c 10 10.20.0.5   # Large ping
ping -s 100  -M do -c 10 10.20.0.5   # Small ping
# If large fails, small works: MTU issue causing retransmissions
```

## Fixing Common Causes

```bash
# Fix 1: Correct MTU mismatch (example MTU; use the value your path supports)
ip link set eth0 mtu 1400

# Fix 2: Re-enable autonegotiation if both ends are meant to autonegotiate
ethtool eth0 | grep -i -E 'speed|duplex|auto-negotiation'
ethtool -s eth0 autoneg on

# Fix 3: Increase TCP buffer sizes for high-latency links
# (large buffers allow more in-flight data before needing ACK)
sysctl -w net.ipv4.tcp_rmem="4096 131072 6291456"
sysctl -w net.ipv4.tcp_wmem="4096 131072 6291456"

# Fix 4: Try BBR if it is available on this kernel
sysctl net.ipv4.tcp_available_congestion_control
sysctl -w net.ipv4.tcp_congestion_control=bbr
```

## Conclusion

TCP retransmissions are the network's way of reporting that packets aren't getting through reliably. As a rule of thumb, a retransmission rate below 0.1% is often acceptable. Above 1% commonly starts to impact performance; above 5% usually causes significant throughput degradation. Check interface error counters for hardware issues, use ping as a quick signal for path problems, and adjust MTU or congestion control based on what you find.
