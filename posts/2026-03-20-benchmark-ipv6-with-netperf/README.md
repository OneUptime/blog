# How to Benchmark IPv6 with netperf - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Netperf, Benchmarking, Networking, Performance, TCP

Description: Use netperf to benchmark IPv6 network performance with TCP stream tests, TCP request/response tests, and UDP unidirectional throughput measurements.

## Introduction

netperf is a network benchmarking tool developed by HP that complements iperf3. It excels at measuring request/response performance and transaction throughput - patterns that better represent real application workloads than pure bulk throughput tests.

## Prerequisites

```bash
# Install netperf
# Package availability varies by distro release; upstream also ships source tarballs.

sudo apt-get install netperf   # Debian/Ubuntu
sudo dnf install netperf       # RHEL/CentOS with EPEL enabled

# Start netserver on the remote host, listening on IPv6
netserver -6 -p 12865
```

## Step 1: TCP Stream Throughput (IPv6)

```bash
# Basic TCP bulk throughput test over IPv6
netperf -6 -H 2001:db8::1 -t TCP_STREAM -l 30

# With explicit port and test duration
# -H sets the remote host; ",6" explicitly requests AF_INET6
netperf -6 \
  -H 2001:db8::1,6 \
  -p 12865 \
  -t TCP_STREAM \
  -l 30 \
  -- \
  -m 16384

# Example output:
# Recv   Send    Send
# Socket Socket  Message  Elapsed
# Size   Size    Size     Time    Throughput
# bytes  bytes   bytes    secs.   10^6bits/sec
# 87380  16384   16384    30.00    9412.34
```

## Step 2: TCP Request/Response (Transaction Rate)

This test measures how many short request-response cycles per second the network supports - a useful proxy for small synchronous service calls.

```bash
# TCP_RR - request/response test (measures transaction rate)
netperf -6 -H 2001:db8::1 -t TCP_RR -l 30 \
  -- \
  -r 64,64    # 64-byte request, 64-byte response

# Output shows transactions/second:
# Socket Size   Request  Resp.   Elapsed  Trans.
# Send   Recv   Size     Size    Time     Rate
# bytes  Bytes  bytes    bytes   secs.    per sec
# 16384  87380  64       64      30.00    85234.12
#
# Approximate average round-trip latency:
# 1000000 / 85234.12 ~= 11.73 usec/transaction

# Variable request sizes
netperf -6 -H 2001:db8::1 -t TCP_RR -l 30 \
  -- -r 512,512    # Simulate a typical API call size
```

## Step 3: TCP Connect/Request/Response (Connection Overhead)

```bash
# TCP_CRR - each transaction uses a new connection
# Measures the overhead of connection setup + one request/response exchange
netperf -6 -H 2001:db8::1 -t TCP_CRR -l 30 \
  -- -r 64,64

# Compare TCP_RR vs TCP_CRR to quantify connection setup cost:
echo "=== TCP_RR (persistent connection) ==="
netperf -6 -H 2001:db8::1 -t TCP_RR -l 15 -- -r 64,64

echo "=== TCP_CRR (new connection per transaction) ==="
netperf -6 -H 2001:db8::1 -t TCP_CRR -l 15 -- -r 64,64
```

## Step 4: UDP Unidirectional Throughput

```bash
# UDP_STREAM - measure UDP send/receive throughput
netperf -6 -H 2001:db8::1 -t UDP_STREAM -l 30 \
  -- -m 1400    # 1400-byte datagrams

# UDP_RR - UDP request/response transaction rate
# Approximate RTT with: 1000000 / Trans/sec
netperf -6 -H 2001:db8::1 -t UDP_RR -l 30 \
  -- -r 160,160  # VoIP-sized packets
```

## Step 5: Automated Benchmark Script

```bash
#!/bin/bash
# ipv6-netperf-suite.sh

SERVER="2001:db8::1"
DURATION=30

echo "=== IPv6 netperf Benchmark Suite ==="
printf "%-30s %15s %15s\n" "Test" "Metric" "Approx RTT"
printf "%-30s %15s %15s\n" "----" "------" "----------"

# TCP Stream
THROUGHPUT=$(netperf -6 -H "$SERVER" -P 0 -v 0 -t TCP_STREAM -l "$DURATION" 2>/dev/null)
printf "%-30s %12s Mbps %15s\n" "TCP Stream" "$THROUGHPUT" "N/A"

# TCP RR
TPS=$(netperf -6 -H "$SERVER" -P 0 -v 0 -t TCP_RR -l "$DURATION" -- -r 64,64 2>/dev/null)
LAT=$(awk -v tps="$TPS" 'BEGIN { if (tps > 0) printf "%.2f", 1000000 / tps; else print "N/A" }')
printf "%-30s %11s TPS %12s usec\n" "TCP RR (64B)" "$TPS" "$LAT"

# TCP CRR
TPS=$(netperf -6 -H "$SERVER" -P 0 -v 0 -t TCP_CRR -l "$DURATION" -- -r 64,64 2>/dev/null)
LAT=$(awk -v tps="$TPS" 'BEGIN { if (tps > 0) printf "%.2f", 1000000 / tps; else print "N/A" }')
printf "%-30s %11s TPS %12s usec\n" "TCP CRR (64B)" "$TPS" "$LAT"

# UDP Stream
# UDP_STREAM prints sender and receiver lines; use the final line for receiver throughput.
RESULT=$(netperf -6 -H "$SERVER" -t UDP_STREAM -l "$DURATION" -- -m 1400 2>/dev/null | tail -1)
THROUGHPUT=$(echo "$RESULT" | awk '{print $NF}')
printf "%-30s %12s Mbps %15s\n" "UDP Stream (1400B recv)" "$THROUGHPUT" "N/A"
```

## Conclusion

netperf's request/response tests provide insight into IPv6 latency characteristics that pure throughput tests miss. TCP_RR transaction rates provide a useful proxy for small synchronous microservice call performance, and you can approximate average round-trip latency by inverting the transaction rate. Use these baselines alongside OneUptime's synthetic monitoring to establish and maintain IPv6 performance SLOs.
