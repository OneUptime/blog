# How to Benchmark IPv6 with iperf3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, iperf3, Benchmarking, Throughput, Performance

Description: Use iperf3 to benchmark IPv6 TCP and UDP throughput, measure bandwidth between hosts, and identify network bottlenecks.

## Introduction

iperf3 is the de facto standard for active network throughput measurement. It natively supports IPv6 via the `-6` flag. Use it to validate link capacity, tune TCP parameters, and establish performance baselines.

## Basic TCP Throughput Test

```bash
# Server side (listen on all IPv6 interfaces)

iperf3 -s -6 -p 5201

# Client side: TCP test from client to server
iperf3 -c 2001:db8::1 -6 -t 30 -P 4
# -t 30: run for 30 seconds
# -P 4: 4 parallel streams (may increase throughput on CPU-limited paths)

# Expected output:
# [SUM] 0.00-30.00 sec  33.6 GBytes  9.62 Gbits/sec  sender
# [SUM] 0.00-30.00 sec  33.6 GBytes  9.62 Gbits/sec  receiver
```

## UDP Bandwidth and Jitter Test

```bash
# UDP test - useful for measuring packet loss and jitter
# Server
iperf3 -s -6

# Client: 1Gbps UDP for 10 seconds
iperf3 -c 2001:db8::1 -6 -u -b 1G -t 10 -l 1400
# -u: UDP mode
# -b 1G: target bandwidth
# -l 1400: 1400-byte payload, leaving room for IPv6 and UDP headers on a 1500-byte path MTU

# Output includes:
# Jitter: 0.045 ms
# Lost/Total Datagrams: 12/7246 (0.17%)
```

## Reverse Direction and Bidirectional Tests

```bash
# Reverse: measure server-to-client throughput
iperf3 -c 2001:db8::1 -6 -R -t 20

# Bidirectional simultaneous test
iperf3 -c 2001:db8::1 -6 --bidir -t 20
```

## Testing with Different Socket Buffer Sizes

```bash
# Override socket buffer to test TCP performance tuning
# 128KB socket buffer
iperf3 -c 2001:db8::1 -6 -w 128K -t 10

# Large buffer (test BDP-optimized tuning)
iperf3 -c 2001:db8::1 -6 -w 16M -t 10

# -w sets send and receive socket buffer sizes on both sides.
# On Linux, the effective maximum window may be about 2x the requested value.
```

## Scripted Benchmark Suite

```bash
#!/bin/bash
SERVER="2001:db8::1"
LOG="/tmp/iperf3_ipv6_results.json"

echo "[" > "$LOG"

# TCP single stream
iperf3 -c "$SERVER" -6 -t 15 -J >> "$LOG"
echo "," >> "$LOG"

# TCP 4 streams
iperf3 -c "$SERVER" -6 -t 15 -P 4 -J >> "$LOG"
echo "," >> "$LOG"

# UDP 100Mbps
iperf3 -c "$SERVER" -6 -u -b 100M -t 15 -J >> "$LOG"

echo "]" >> "$LOG"

# Parse results with jq
jq '.[].end | (.sum_received.bits_per_second // .sum.bits_per_second) / 1e9' "$LOG" | \
  awk '{printf "Throughput: %.2f Gbps\n", $1}'
```

## Conclusion

iperf3 with `-6` provides reliable IPv6 throughput measurements for TCP and UDP. Use parallel streams to saturate high-bandwidth links. Run reverse and bidirectional tests to detect asymmetric bottlenecks. Schedule automated runs via cron and ingest results into OneUptime for long-term trend analysis.
