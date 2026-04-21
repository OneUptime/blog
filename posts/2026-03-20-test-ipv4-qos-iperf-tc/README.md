# How to Test IPv4 QoS Policies with iperf and tc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iperf, tc, QoS, IPv4, Testing, Networking

Description: Use iperf3 and tc statistics to validate that IPv4 QoS policies correctly prioritize traffic, enforce bandwidth limits, and measure real-world throughput.

Testing QoS rules with actual traffic is essential to verify that your policies behave as intended. iperf3 generates controllable traffic flows, while tc statistics show how rules classify and shape that traffic.

## Prerequisites

```bash
# Install iperf3 on both server and client

sudo apt install iperf3 -y

# On the server machine
iperf3 -s

# On the client, iperf3 connects to the server
```

## Test 1: Verify Bandwidth Limiting

Apply a rate limit and verify iperf3 throughput matches:

```bash
# On client: Apply 10 Mbps TBF limit
sudo tc qdisc replace dev eth0 root tbf rate 10mbit burst 32kb latency 400ms

# Run iperf3 test (should show ≈ 10 Mbps)
iperf3 -c <SERVER_IP> -t 30

# Expected output:
# [ ID] Interval           Transfer     Bitrate
# [  5]  0.00-30.00 sec   35.6 MBytes  9.96 Mbits/sec  sender

# Check tc stats to confirm overlimits
sudo tc -s qdisc show dev eth0
# Look for: overlimits > 0 (packets shaped/delayed by TBF; drops are reported separately)
```

## Test 2: Verify HTB Priority Classes

```bash
# Set up HTB with two classes
sudo tc qdisc replace dev eth0 root handle 1: htb default 20
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 20mbit
sudo tc class add dev eth0 parent 1:1 classid 1:10 htb rate 15mbit ceil 20mbit prio 1
sudo tc class add dev eth0 parent 1:1 classid 1:20 htb rate 5mbit ceil 20mbit prio 2

# Filter: traffic to port 5201 (iperf3 default) → high priority class
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip protocol 6 0xff \
  match ip dport 5201 0xffff flowid 1:10

# On server: start a second iperf3 instance for the background flow
iperf3 -s -p 5202 &

# Run competing flows: priority flow (port 5201) and background flow (port 5202)
iperf3 -c <SERVER_IP> -t 30 -p 5201 &  # Priority
iperf3 -c <SERVER_IP> -t 30 -p 5202 &  # Background

# The priority flow should get the majority of bandwidth
# Check class stats to verify
sudo tc -s class show dev eth0
```

## Test 3: Test UDP with Jitter Measurement

```bash
# Apply netem latency for realistic conditions
sudo tc qdisc replace dev eth0 root netem delay 20ms 5ms rate 50mbit

# UDP test with iperf3 (measures jitter and loss)
iperf3 -c <SERVER_IP> -u -b 10M -t 30 -J

# iperf3 JSON output includes:
# "jitter_ms": X.X
# "lost_packets": N
# "lost_percent": X.X
```

## Test 4: Bidirectional Traffic Testing

```bash
# Test both upload and download simultaneously
iperf3 -c <SERVER_IP> --bidir -t 30

# Apply CAKE and re-test
sudo tc qdisc replace dev eth0 root cake bandwidth 50mbit diffserv4

iperf3 -c <SERVER_IP> --bidir -t 30
```

## Test 5: Multi-Flow Fairness Test

```bash
# Verify fair queuing distributes bandwidth evenly
sudo tc qdisc replace dev eth0 root fq_codel

# Start 4 parallel flows
iperf3 -c <SERVER_IP> -P 4 -t 30

# Each flow should get roughly equal bandwidth
# In the output, check per-stream bitrates
```

## Interpreting Results

| Result | Meaning | Action |
|---|---|---|
| Throughput ≈ limit | Rate limit is being enforced | None needed |
| Throughput > limit | Policy not applied | Check tc filter hits |
| High jitter | Queue depth too large | Reduce burst/latency |
| Priority flow not faster | Filter not matching | Verify filter with `tc -s filter show dev eth0 parent 1:0` |

Systematic testing with iperf3 closes the loop between policy configuration and actual network behavior.
