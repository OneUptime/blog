# How to Troubleshoot Intermittent IPv4 Connectivity Issues on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, Troubleshooting, Connectivity, Network Diagnostics

Description: Learn how to diagnose and resolve intermittent IPv4 connectivity problems on Linux using network diagnostic tools, log analysis, and systematic troubleshooting techniques.

## Introduction

Intermittent IPv4 connectivity is one of the most frustrating network issues to diagnose because the problem disappears when you try to investigate. This guide provides a systematic approach to capture, analyze, and resolve intermittent failures.

## Step 1: Confirm the Intermittency

Run a continuous ping to establish a baseline:

```bash
ping -i 1 8.8.8.8 | tee /tmp/ping-log.txt &
# Let it run for 30+ minutes

```

Check for packet loss:

```bash
ping -c 100 8.8.8.8 | tail -2
```

## Step 2: Check Interface Statistics

Look for errors and drops:

```bash
ip -s link show eth0
```

High error counts suggest hardware or driver issues.

## Step 3: Monitor with mtr

`mtr` combines ping and traceroute and tracks packet loss per hop:

```bash
mtr --report --report-cycles=60 8.8.8.8
```

Persistent loss that starts at one hop and continues through later hops helps identify where in the path the loss occurs.

## Step 4: Check ARP Table

Intermittent issues often relate to ARP problems:

```bash
ip -4 neigh show dev eth0
```

FAILED or INCOMPLETE neighbor entries can indicate ARP resolution problems. Flush and refresh:

```bash
sudo ip -4 neigh flush dev eth0
```

## Step 5: Check for Duplicate IP Addresses

Duplicate IPs cause intermittent connectivity:

```bash
sudo arping -D -c 3 -I eth0 192.168.1.100
# Exit 0 means no replies/no duplicate; nonzero means duplicate detected or command failed
```

## Step 6: Check DNS

DNS failures appear as intermittent connectivity:

```bash
# Test DNS separately
dig google.com @8.8.8.8
dig google.com @1.1.1.1

# Check /etc/resolv.conf
cat /etc/resolv.conf
```

## Step 7: Review System Logs

```bash
dmesg | grep -i "eth0\|network\|link\|error" | tail -50
journalctl -u NetworkManager --since "1 hour ago"
journalctl -u systemd-networkd --since "1 hour ago"
```

## Step 8: Check Routing Table

Ensure routes are stable:

```bash
watch -n1 ip route show
```

## Step 9: Check Network Driver

Driver resets can cause intermittent drops:

```bash
dmesg | grep -i "reset\|firmware\|NIC\|eth0" | tail -20
ethtool eth0 | grep "Link detected"
```

## Step 10: TCP Retransmissions

High or rapidly increasing retransmission counters indicate packet loss:

```bash
ss -ti
nstat -az TcpRetransSegs TcpExtTCPLostRetransmit TcpAttemptFails
```

## Conclusion

Intermittent IPv4 issues require persistent monitoring to capture failures in progress. Use continuous ping logs, mtr, ARP inspection, and system logs together to triangulate the problem. Common culprits include ARP issues, duplicate IPs, DNS failures, and network interface driver problems.
