# How to Use iperf3 for Network Throughput Testing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iperf3, Network, Throughput Testing, Performance

Description: Learn how to use iperf3 on RHEL to measure network bandwidth and throughput between two hosts.

---

iperf3 is the standard tool for measuring network throughput between two endpoints. It supports TCP, UDP, and SCTP protocols and provides detailed bandwidth measurements.

## Installing iperf3

```bash
# Install iperf3 from the base repository
sudo dnf install -y iperf3
```

## Setting Up Server and Client

You need two machines. One runs the iperf3 server and the other runs the client.

On the server machine:

```bash
# Start iperf3 in server mode (listens on port 5201 by default)
iperf3 -s

# Run in background with a specific port
iperf3 -s -p 5201 -D
```

Open the firewall for iperf3:

```bash
# Allow iperf3 traffic through the firewall
sudo firewall-cmd --add-port=5201/tcp --permanent
sudo firewall-cmd --add-port=5201/udp --permanent
sudo firewall-cmd --reload
```

## Running TCP Throughput Tests

On the client machine:

```bash
# Basic TCP throughput test (10 seconds by default)
iperf3 -c 192.168.1.100

# Run for 30 seconds with 4 parallel streams
iperf3 -c 192.168.1.100 -t 30 -P 4

# Test in reverse mode (server sends to client)
iperf3 -c 192.168.1.100 -R
```

## UDP Throughput Tests

```bash
# UDP test with target bandwidth of 1Gbps
iperf3 -c 192.168.1.100 -u -b 1G

# UDP test with specific packet size
iperf3 -c 192.168.1.100 -u -b 1G -l 1400
```

## Bidirectional Test

```bash
# Test both directions simultaneously
iperf3 -c 192.168.1.100 --bidir -t 30
```

## JSON Output for Automation

```bash
# Output results in JSON format
iperf3 -c 192.168.1.100 -t 10 -J > /tmp/iperf-results.json

# Parse specific fields with jq
iperf3 -c 192.168.1.100 -t 10 -J | jq '.end.sum_received.bits_per_second / 1000000'
```

The output shows interval bandwidth, retransmits (for TCP), and jitter/loss (for UDP). Use multiple parallel streams (`-P`) to saturate high-bandwidth links, as a single TCP stream may not fill a 10Gbps or faster connection.
