# How to Analyze Network Latency with hping3 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, hping3, Network Diagnostics, Performance

Description: Learn how to install and use hping3 on Ubuntu to measure network latency, detect packet loss, and diagnose connectivity issues across TCP, UDP, and ICMP protocols.

---

Network latency analysis goes beyond what a simple `ping` command provides. While `ping` uses ICMP echo requests, many firewalls block ICMP traffic entirely. `hping3` fills that gap by sending probes over TCP, UDP, or raw IP, giving you much more control over how you test connectivity and latency between hosts.

## Installing hping3

hping3 is available in the Ubuntu repositories:

```bash
sudo apt update
sudo apt install hping3 -y
```

Verify the installation:

```bash
hping3 --version
```

You need root privileges (or `sudo`) for most hping3 operations since it works with raw sockets.

## Understanding hping3 Basics

hping3 sends custom packets to a target host and measures the round-trip time (RTT). The output format resembles ping but includes more detail:

```bash
# Basic ICMP ping (equivalent to regular ping)
sudo hping3 -1 192.168.1.1
```

Output example:
```
HPING 192.168.1.1 (eth0 192.168.1.1): icmp mode set, 28 headers + 0 data bytes
len=28 ip=192.168.1.1 ttl=64 id=12345 icmp_seq=0 rtt=0.8 ms
len=28 ip=192.168.1.1 ttl=64 id=12346 icmp_seq=1 rtt=0.7 ms
```

## ICMP Mode Latency Testing

```bash
# Send 10 ICMP probes to a host
sudo hping3 -1 -c 10 192.168.1.1

# Flood mode - send packets as fast as possible (use with caution)
sudo hping3 -1 --flood 192.168.1.1

# Set packet size to 1000 bytes to test with larger payloads
sudo hping3 -1 -d 1000 -c 5 192.168.1.1
```

## TCP Mode - Testing Through Firewalls

When ICMP is blocked, TCP SYN probes can often reach the target. This is useful for testing latency to web servers or any host with open TCP ports:

```bash
# Send TCP SYN to port 80 (HTTP)
sudo hping3 -S -p 80 -c 5 192.168.1.100

# Test latency to HTTPS port
sudo hping3 -S -p 443 -c 5 example.com

# TCP ACK probes (bypasses some stateful firewalls)
sudo hping3 -A -p 80 -c 5 192.168.1.100
```

The `-S` flag sets the SYN flag, `-A` sets the ACK flag. TCP SYN probes are useful because the target host sends a SYN-ACK back even if it doesn't complete the connection.

## UDP Mode Testing

```bash
# UDP probe on port 53 (DNS server test)
sudo hping3 -2 -p 53 -c 5 8.8.8.8

# UDP probe with custom data size
sudo hping3 -2 -p 53 -d 512 -c 10 192.168.1.1
```

Note that UDP responses depend on the application listening on that port. You may get ICMP port unreachable messages back, which still indicate round-trip time.

## Setting Intervals and Count

Control the packet rate and count to run sustained tests:

```bash
# Send 100 packets with 100ms interval (10 packets/second)
sudo hping3 -S -p 80 -c 100 -i u100000 192.168.1.100

# -i u100000 means interval of 100000 microseconds (100ms)
# For 1 second intervals, use -i 1 (in seconds)
sudo hping3 -1 -c 20 -i 1 192.168.1.1
```

## Traceroute with hping3

Unlike `traceroute` which uses UDP by default, `hping3` lets you trace the path using TCP or ICMP:

```bash
# TCP SYN traceroute to port 80
sudo hping3 -S -p 80 --traceroute 192.168.1.100

# ICMP traceroute
sudo hping3 -1 --traceroute 192.168.1.100
```

This is particularly valuable when network paths pass through firewalls that block UDP but allow HTTP traffic.

## Detecting Packet Loss

Run a longer test to measure packet loss percentage:

```bash
# Send 1000 packets and analyze results
sudo hping3 -S -p 443 -c 1000 -i u10000 192.168.1.100
```

At the end of the run, hping3 prints a summary showing packets transmitted, received, and lost:

```
--- 192.168.1.100 hping statistic ---
1000 packets transmitted, 998 packets received, 0% packet loss
round-trip min/avg/max = 0.5/1.2/8.7 ms
```

A packet loss percentage above 0.1% on a LAN is worth investigating. On WAN links, anything above 1% consistently indicates a problem.

## Measuring Jitter (Latency Variation)

Jitter matters for real-time applications like VoIP and video conferencing. While hping3 doesn't calculate jitter natively, you can capture RTT values and analyze them:

```bash
# Capture RTT values to a file
sudo hping3 -S -p 80 -c 100 192.168.1.100 2>&1 | grep "rtt=" | awk -F'rtt=' '{print $2}' | cut -d' ' -f1 > rtts.txt

# Calculate min/max/avg with a simple script
awk 'BEGIN{min=9999;max=0;sum=0;n=0} {
  val=$1+0;
  if(val<min) min=val;
  if(val>max) max=val;
  sum+=val; n++;
} END {
  printf "min=%.2f max=%.2f avg=%.2f jitter=%.2f\n", min, max, sum/n, max-min
}' rtts.txt
```

## Simulating Network Conditions

hping3 can help verify how your application behaves under high latency conditions by flooding a test interface or measuring baseline performance before and after applying traffic control rules:

```bash
# Before applying tc qdisc delay rules - measure baseline
sudo hping3 -S -p 80 -c 50 192.168.1.100

# After applying 100ms artificial delay with tc
sudo tc qdisc add dev eth0 root netem delay 100ms
sudo hping3 -S -p 80 -c 50 192.168.1.100

# Remove the artificial delay
sudo tc qdisc del dev eth0 root
```

## Checking Path MTU

Packet fragmentation can cause latency spikes. You can probe for the MTU of a path using the DF (Don't Fragment) bit:

```bash
# Test with various packet sizes to find MTU
sudo hping3 -1 -d 1472 --dont-frag -c 3 192.168.1.1  # 1500 byte frame (1472 + 28 header)
sudo hping3 -1 -d 1400 --dont-frag -c 3 192.168.1.1  # Try smaller

# If you get no response with a large size but response with smaller, MTU is between those values
```

## Comparing Latency Between Paths

If you have multiple network paths or interfaces, compare latency through each:

```bash
# Test through interface eth0
sudo hping3 -S -p 80 -c 20 -I eth0 192.168.1.100

# Test through interface eth1
sudo hping3 -S -p 80 -c 20 -I eth1 192.168.1.100
```

## Interpreting Results

- RTT under 1ms - Local network, everything is healthy
- RTT 1-10ms - Local datacenter or nearby region
- RTT 10-100ms - Cross-region or moderate distance WAN
- RTT above 100ms - Long distance WAN or satellite; check for routing issues
- Packet loss any percentage consistently - indicates congestion, hardware faults, or routing problems

When you notice high RTT spikes combined with packet loss, check interface error counters with `ip -s link show` and look at switch logs for CRC errors. Consistent high latency without packet loss often points to congestion or QoS misconfiguration somewhere in the path.

## Automating Latency Checks

Write a simple monitoring wrapper:

```bash
#!/bin/bash
# latency-check.sh - Monitor latency to a host and alert if threshold exceeded

TARGET=${1:-"8.8.8.8"}
PORT=${2:-80}
THRESHOLD_MS=${3:-50}
COUNT=10

RESULT=$(sudo hping3 -S -p "$PORT" -c "$COUNT" -q "$TARGET" 2>&1)
AVG_RTT=$(echo "$RESULT" | grep "round-trip" | awk -F'/' '{print $5}')

if [ -z "$AVG_RTT" ]; then
  echo "ERROR: Could not reach $TARGET on port $PORT"
  exit 1
fi

# Compare using bc for floating point
if (( $(echo "$AVG_RTT > $THRESHOLD_MS" | bc -l) )); then
  echo "ALERT: Average RTT to $TARGET is ${AVG_RTT}ms (threshold: ${THRESHOLD_MS}ms)"
  exit 2
else
  echo "OK: Average RTT to $TARGET is ${AVG_RTT}ms"
fi
```

Run this from cron to get periodic latency alerts before users notice performance degradation.

hping3 is a powerful tool that belongs in every network engineer's toolbox. Combined with tools like `ss`, `netstat`, and `tc`, you can diagnose and resolve latency issues with precision rather than guesswork.
