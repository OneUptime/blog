# How to Measure Network Throughput with iperf3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iperf3, Network Testing, Throughput, TCP, UDP, Performance

Description: Learn how to use iperf3 to accurately measure network throughput between two hosts, covering TCP and UDP tests, parallel streams, reverse mode, and interpreting results.

## What Is iperf3?

iperf3 is a standard tool for measuring TCP and UDP throughput between two endpoints. It runs a server on one host and a client on the other, sending data for a specified duration and reporting the achieved throughput. For UDP tests, the send rate is controlled with `-b`.

## Step 1: Install iperf3

```bash
# Ubuntu/Debian

sudo apt-get install -y iperf3

# RHEL/CentOS/Rocky Linux
sudo dnf install -y iperf3

# macOS (Homebrew)
brew install iperf3

# Verify version
iperf3 --version
```

## Step 2: Run a Basic TCP Throughput Test

Start the server on the remote host:

```bash
# On the server (binds to all interfaces, default port 5201)
iperf3 -s

# Or run in daemon mode
iperf3 -s -D --logfile /var/log/iperf3.log
```

Run the client:

```bash
# Basic test - TCP, 10 seconds, single stream
iperf3 -c 192.168.1.100

# Extended test - 60 seconds, 4 parallel TCP streams
iperf3 -c 192.168.1.100 -t 60 -P 4

# Output includes per-stream lines plus a total:
# [SUM] 0.00-60.00 sec  27.9 GBytes   3.99 Gbits/sec  sender
# [SUM] 0.00-60.00 sec  27.9 GBytes   3.99 Gbits/sec  receiver
```

## Step 3: Test Reverse Direction (Download)

By default, iperf3 measures upload (client → server). Use `-R` to test download:

```bash
# Test download throughput (server sends to client)
iperf3 -c 192.168.1.100 -t 30 -R

# Bidirectional test (simultaneous upload and download)
iperf3 -c 192.168.1.100 -t 30 --bidir
```

## Step 4: Run a UDP Test

UDP testing measures achievable throughput without TCP flow control, and also reports packet loss and jitter (important for VoIP/video):

```bash
# UDP test - target 1 Gbps, 30 seconds
iperf3 -c 192.168.1.100 -u -b 1G -t 30

# UDP test targeting 10 Gbps
iperf3 -c 192.168.1.100 -u -b 10G -t 30

# Output includes:
# Transfer/Bandwidth + Jitter + Lost/Total Datagrams
# 0.00-30.00 sec  3.44 GBytes  987 Mbits/sec  0.025 ms  0/2535000 (0%) receiver
```

## Step 5: Use Multiple Streams for Maximum Throughput

A single TCP stream may not fully saturate a high-bandwidth link on its own. Use parallel streams:

```bash
# 8 parallel streams (useful for testing aggregate throughput across multiple flows)
iperf3 -c 192.168.1.100 -t 60 -P 8

# The [SUM] line shows total across all streams:
# [SUM] 0.00-60.00 sec  68.0 GBytes  9.75 Gbits/sec   sender
```

## Step 6: Adjust Socket and Send Options

Adjust socket and send behavior for more targeted tests:

```bash
# Set TCP socket buffer size explicitly
iperf3 -c 192.168.1.100 -t 30 -w 64M

# Try setting a specific MSS
iperf3 -c 192.168.1.100 -t 30 -M 1460

# Zero-copy mode (uses sendfile() for efficiency)
iperf3 -c 192.168.1.100 -t 30 -Z
```

## Step 7: Interpret iperf3 Results

```text
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5] 0.00-10.00 sec  1.09 GBytes   936 Mbits/sec    0    2.86 MBytes

Columns:
- ID: Stream identifier
- Interval: Time window for this measurement
- Transfer: Data transferred in interval
- Bitrate: Achieved throughput
- Retr: Number of TCP retransmissions (should be near 0)
- Cwnd: TCP congestion window size
```

High retransmissions indicate packet loss or congestion. Low Cwnd indicates buffer or window size limits.

## Step 8: Output Results to JSON

```bash
# Save results as JSON for processing
iperf3 -c 192.168.1.100 -t 30 -J > /tmp/iperf3-results.json

# Extract key metrics with jq
jq '.end.sum_received.bits_per_second / 1e9' /tmp/iperf3-results.json
# Output: 0.9358 (Gbps)
```

## Conclusion

iperf3 is the definitive tool for measuring network throughput. Use `-P 4` or `-P 8` when testing whether multiple concurrent flows improve throughput on a high-bandwidth link, `-R` for download tests, and `-u` for UDP with jitter and loss metrics. High retransmission counts indicate network issues; low throughput compared to link speed indicates buffer, congestion control, or offload problems. Run tests at least 30 seconds to average out startup transients.
