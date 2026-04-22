# How to Simulate Jitter on IPv4 Connections Using tc netem Delay Variation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tc, Netem, IPv4, Jitter, Network Testing, Linux

Description: Use tc netem delay variation parameters to simulate IPv4 network jitter and test application sensitivity to variable latency, especially for real-time communications.

Jitter is variation in packet arrival times. While latency affects all traffic, jitter particularly impacts real-time applications like VoIP, video conferencing, and online gaming. netem provides several models for simulating realistic jitter.

## Basic Jitter (Uniform Variation)

```bash
# Add 100ms delay with ±25ms uniform jitter

# Each packet gets a delay between 75ms and 125ms
sudo tc qdisc add dev eth0 root netem delay 100ms 25ms

# Verify the configuration
sudo tc qdisc show dev eth0
# Expected: qdisc netem ... delay 100ms  25ms
```

## Correlated Jitter (Smoother, More Realistic)

With correlation, consecutive packets tend to have similar delays, creating smoother jitter patterns:

```bash
# 100ms ± 25ms jitter, with 50% correlation between consecutive packets
sudo tc qdisc add dev eth0 root netem delay 100ms 25ms 50%
```

## Jitter with Statistical Distributions

```bash
# Normal distribution: most packets near 100ms, fewer at extremes
sudo tc qdisc add dev eth0 root netem \
  delay 100ms 30ms distribution normal

# Pareto distribution: occasional very large delays (long-tail jitter)
sudo tc qdisc add dev eth0 root netem \
  delay 100ms 30ms distribution pareto

# Pareto-normal: combination for realistic network jitter
sudo tc qdisc add dev eth0 root netem \
  delay 100ms 30ms distribution paretonormal
```

## Measuring Jitter

```bash
# Use ping to observe jitter - look at the variation in RTT
ping -c 100 -i 0.1 8.8.8.8

# Expected output:
# rtt min/avg/max/mdev = 175.2/200.3/225.4/12.8 ms
# mdev (population standard deviation) shows RTT variability

# Use mtr for ongoing measurement
mtr --report --report-cycles 100 8.8.8.8
# Look at StDev (standard deviation) column
```

## VoIP Jitter Testing

VoIP applications use jitter buffers to smooth out arrival variation. Test jitter buffer sizing:

```bash
# Simulate cellular jitter (30ms ± 15ms)
sudo tc qdisc add dev eth0 root netem delay 30ms 15ms 30%

# Generate SIP/RTP traffic and observe packet timing
# Use a softphone or RTP test tool to measure MOS score
```

## High-Jitter Network (Congested Link)

```bash
# Simulate a heavily congested network with high jitter and occasional loss
sudo tc qdisc add dev eth0 root netem \
  delay 200ms 100ms distribution paretonormal \
  loss 5% \
  reorder 10%
```

## Measuring Jitter with iperf3

```bash
# Apply jitter
sudo tc qdisc add dev eth0 root netem delay 50ms 20ms

# Test UDP jitter (iperf3 measures UDP jitter natively)
# On server:
iperf3 -s

# On client (UDP mode):
iperf3 -c <SERVER_IP> -u -b 10M -t 30

# iperf3 UDP output includes: Jitter x ms  Lost/Total Datagrams x/y (z%)
```

## Cleanup

```bash
sudo tc qdisc del dev eth0 root
```

Testing with realistic jitter patterns helps verify that VoIP codecs handle delay variation correctly, video players have appropriate buffering, and gaming clients maintain smooth frame rates under degraded network conditions.
