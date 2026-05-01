# How to Diagnose TCP Selective Acknowledgment (SACK) Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, SACK, Selective Acknowledgment, Performance, Debugging, Linux

Description: Diagnose TCP SACK negotiation failures, SACK scoreboard issues, and performance problems caused by disabled or mishandled selective acknowledgments.

## Introduction

TCP Selective Acknowledgment (SACK) allows a receiver to acknowledge non-contiguous blocks of received data. Without SACK, the sender can only infer loss from cumulative ACKs, which makes recovery from multiple losses less efficient and can require extra RTTs or unnecessary retransmissions. With SACK, the sender can retransmit only the missing segments. This makes a significant difference on lossy links. SACK problems arise when one side doesn't support it, when middleboxes strip SACK options, or when the SACK scoreboard becomes inconsistent.

## Verifying SACK is Enabled

```bash
# Check Linux SACK settings

sysctl net.ipv4.tcp_sack
# 1 = enabled (default), 0 = disabled

# Check tcp_fack (legacy compatibility knob)
sysctl net.ipv4.tcp_fack
# Legacy option in modern kernels; it has no effect anymore

# Check DSACK (Duplicate SACK) - detect spurious retransmissions
sysctl net.ipv4.tcp_dsack
# 1 = enabled
```

## Check if SACK is Being Negotiated

```bash
# Capture a connection handshake and check for SACK option in SYN
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-syn != 0' -v 2>/dev/null | head -30
# Look for: options [mss 1460,sackOK,TS val ...

# In Wireshark:
# Filter: tcp.flags.syn == 1
# Look at "TCP Options" in packet details
# Should show: SACK permitted option (kind=4, len=2)

# SACK-permitted is direction-specific:
# If SYN has sackOK but SYN-ACK doesn't, SACK is negotiated for client-to-server
# data only, not for server-to-client data
```

## Check SACK Statistics

```bash
# SACK-related kernel counters
nstat -az | grep -i sack

# Key counters:
# TcpExtTCPSACKReneging  → Sender inferred reneging: data reported in SACK was not
#                          cumulatively ACKed and had to be retransmitted
# TcpExtTCPSACKReorder   → Reordering detected using SACK information
# TcpExtTCPSACKDiscard   → Invalid SACK blocks discarded
# TcpExtTCPSackFailures  → SACK-based loss recovery/disorder handling still ended
#                          in retransmission timeout
# TcpExtTCPSackShifted   → SACK processing shifted skb data in the retransmit queue
# TcpExtTCPDSACKOfoRecv  → DSACK received for an out-of-order duplicate packet
# TcpExtTCPDSACKRecv     → DSACK received for a duplicate packet that was already ACKed

# Monitor over time during a transfer:
watch -n 2 'nstat -z | grep -i sack'
```

## SACK Reneging Problem

```bash
# SACK reneging: receiver reported data in SACK, then later no longer reports it
# This forces the sender to retransmit data it previously believed was queued

# Symptoms:
# TcpExtTCPSACKReneging counter increasing
# Performance degradation on high-BDP links
# Wireshark shows previously reported SACK blocks disappearing or shrinking

# Wireshark detection:
# Follow the TCP stream and inspect SACK blocks over time
# Look for previously reported SACK ranges disappearing before cumulative ACK advances

# Causes:
# - Buggy middle boxes (firewalls, proxies mangling TCP options or sequence state)
# - Memory pressure on receiver causing buffer contents to be freed
# - Some NAT or WAN optimization devices

# Fix: if reneging is from middlebox:
# Bypass the middlebox for this traffic path
# Or disable SACK (last resort - performance impact):
sysctl -w net.ipv4.tcp_sack=0
```

## SACK Scoreboard Analysis

```bash
# The SACK scoreboard tracks which segments were received out of order
# Problems occur when the scoreboard is wrong

# Enable detailed TCP tracing to see SACK scoreboard activity:
# (requires bpftrace, root, and a probe name present on your kernel)
bpftrace -l 'kprobe:tcp_sack*'
bpftrace -e 'kprobe:tcp_sacktag_walk { printf("SACK tag: %s\n", comm); }'

# Simpler: watch SACK events with tcpdump
tcpdump -i eth0 -n -v host 10.20.0.5 2>/dev/null | grep -i sack

# SACK block format in tcpdump output:
# sack 1 {1001:1500} = one SACK block, sequence range [1001,1500) received
# sack 2 {2001:2500}{3001:3500} = two blocks (gaps [1500,2001) and [2500,3001))
```

## Performance Comparison With/Without SACK

```bash
# Test performance on a lossy link with and without SACK
# First, with SACK enabled (default):
sysctl -w net.ipv4.tcp_sack=1
iperf3 -c 10.20.0.5 -t 30 2>&1 | grep sender

# Introduce simulated loss:
tc qdisc add dev eth0 root netem loss 1%

# Test with SACK:
iperf3 -c 10.20.0.5 -t 30 2>&1 | grep sender

# Test without SACK:
sysctl -w net.ipv4.tcp_sack=0
iperf3 -c 10.20.0.5 -t 30 2>&1 | grep sender

# On lossy paths, SACK usually delivers better throughput; exact gains depend on
# RTT, congestion window size, and the loss pattern
# Clean up:
tc qdisc del dev eth0 root
sysctl -w net.ipv4.tcp_sack=1
```

## Conclusion

SACK is important for performance on lossy paths. Verify what was negotiated in the handshake, and remember that SACK-permitted is direction-specific. Monitor `TcpExtTCPSACKReneging` - rising values mean the sender inferred that previously SACKed data later went missing, which can be caused by receiver memory pressure or middlebox interference. DSACK counters help confirm duplicate delivery and spurious retransmissions. Only disable SACK as a last resort; performance on lossy or high-BDP paths can degrade noticeably without it.
