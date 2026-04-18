# How to Troubleshoot TCP Throughput Drops Due to Congestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Congestion, Throughput, Troubleshooting, Linux, Performance

Description: Diagnose sudden or gradual TCP throughput drops caused by network congestion, buffer overflow, and competing flows using kernel statistics and packet analysis.

## Introduction

TCP throughput can drop suddenly due to congestion events (packet loss), gradually due to competing traffic filling the bottleneck link, or intermittently due to periodic congestion from bursty applications. Diagnosing which type is occurring guides the appropriate fix - whether that's congestion control tuning, QoS implementation, or traffic shaping.

## Step 1: Identify the Drop Pattern

```bash
# Monitor throughput over time to identify the pattern

# Run a sustained transfer and watch throughput
iperf3 -c 10.20.0.5 -t 120 -i 5   # 120-second test, report every 5 seconds

# Pattern analysis:
# Gradual decline: bottleneck link filling up (competing traffic)
# Sudden drops then recovery: congestion events (loss, CWND halving)
# Periodic spikes: bursty competing traffic
```

## Step 2: Check for Packet Loss

```bash
# Measure packet loss on the path
ping -c 100 -i 0.1 10.20.0.5 | tail -3

# During iperf3 transfer:
iperf3 -c 10.20.0.5 -t 30 -i 1 | grep -E "Mbits|Retr"
# Non-zero Retr = loss events occurring

# Interface error statistics (hardware errors)
ip -s link show eth0 | grep -A1 "RX\|TX"
# Should show 0 errors; non-zero = hardware/duplex issue
```

## Step 3: Check for Competing Traffic

```bash
# Identify which processes/connections are using bandwidth
iftop -i eth0 -n   # Real-time bandwidth by connection
nethogs eth0       # Bandwidth by process

# Check overall interface utilization
watch -n 1 "cat /sys/class/net/eth0/statistics/tx_bytes"
# Calculate MB/s from the bytes counter difference
```

## Step 4: Inspect Congestion Window Behavior

```bash
# During a throughput drop, check what's happening to CWND
# Run iperf3 and simultaneously monitor ss
iperf3 -c 10.20.0.5 -t 60 &
watch -n 0.5 "ss -tin state established '(dst 10.20.0.5)' | \
  grep -oP 'cwnd:\K[0-9]+'"

# If CWND drops from 100 to 1: timeout occurred (severe)
# If CWND drops from 100 to 50: fast recovery (mild, expected under congestion)
```

## Step 5: Check Queue Depths

```bash
# Interface TX queue depth (full queue = congestion)
tc -s qdisc show dev eth0
# "backlog XXbytes YYpkts" = current queue size
# "dropped ZZ" = packets dropped from queue

# Network buffer memory pressure
cat /proc/net/sockstat | grep TCP
# mem = socket buffer pages in use
```

## Fixing the Root Cause

```bash
# Fix 1: Switch to BBR (handles congestion better)
sysctl -w net.ipv4.tcp_congestion_control=bbr

# Fix 2: Enable Fair Queue (prevents single flow from monopolizing)
tc qdisc replace dev eth0 root fq

# Fix 3: Rate-limit competing applications
# Identify the offending application
nethogs eth0
# Then limit its bandwidth with tc
tc qdisc add dev eth0 root handle 1: htb default 10
tc class add dev eth0 parent 1: classid 1:10 htb rate 100mbit

# Fix 4: Increase QoS for critical traffic
# Prioritize traffic to 10.20.0.5
tc qdisc replace dev eth0 root fq_codel
# Or use DSCP marking
iptables -t mangle -A OUTPUT -d 10.20.0.5 -j DSCP --set-dscp 46  # EF/46 = high priority
```

## Conclusion

TCP throughput drops follow identifiable patterns. Gradual decline indicates filling bottleneck bandwidth. Sudden drops with CWND halving indicate loss events. Periodic dips suggest bursty competing flows. Fix paths: BBR for loss-sensitive environments, fair queueing for congested shared links, and QoS prioritization for critical flows on overloaded links.
