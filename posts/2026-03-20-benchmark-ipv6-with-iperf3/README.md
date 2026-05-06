# How to Benchmark IPv6 with iperf3 - With

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, iperf3, Benchmarking, Networking, Performance, Testing

Description: Comprehensive guide to benchmarking IPv6 network performance with iperf3, covering TCP throughput, UDP jitter, parallel streams, and result interpretation.

## Introduction

iperf3 is the standard tool for network performance benchmarking. Its `-6` flag enables IPv6 testing. This guide covers all major iperf3 test modes for IPv6, from basic throughput to advanced multi-stream and bidirectional tests.

## Prerequisites

- iperf3 installed on both endpoints: `apt-get install iperf3`
- IPv6 connectivity between the two hosts
- Firewall allowing TCP/UDP port 5201
- `jq` installed on the machine running the benchmark suite script
- Python 3 installed for the JSON analysis example

## Step 1: Basic IPv6 TCP Throughput Test

```bash
# On the server host - start iperf3 server

iperf3 -s -6

# On the client - run a 30-second TCP test
iperf3 -6 -c 2001:db8::1 -t 30

# Example output:
# [ ID] Interval       Transfer     Bitrate
# [  5]  0.00-30.00 sec  35.8 GBytes  9.55 Gbits/sec  sender
# [  5]  0.00-30.00 sec  35.8 GBytes  9.55 Gbits/sec  receiver
```

## Step 2: Parallel Streams (Simulating Multiple Connections)

```bash
# 4 parallel TCP streams - simulates multi-user load
iperf3 -6 -c 2001:db8::1 -t 30 -P 4

# 8 parallel streams for near-line-rate testing
iperf3 -6 -c 2001:db8::1 -t 30 -P 8

# With JSON output for scripted analysis
iperf3 -6 -c 2001:db8::1 -t 30 -P 4 -J > results.json
```

## Step 3: UDP Jitter and Packet Loss Test

```bash
# UDP test at 100 Mbps for 60 seconds
iperf3 -6 -c 2001:db8::1 -u -b 100M -t 60

# UDP at specific packet sizes (mimics different application types)
# VoIP simulation: 160-byte packets
iperf3 -6 -c 2001:db8::1 -u -b 100k -l 160 -t 60

# Video streaming simulation: 1316-byte packets
iperf3 -6 -c 2001:db8::1 -u -b 10M -l 1316 -t 60

# UDP output includes:
# Jitter: X.XXX ms
# Lost/Total: X/X (X%)
```

## Step 4: Bidirectional Test

```bash
# Simultaneous send and receive (full duplex)
iperf3 -6 -c 2001:db8::1 -t 30 --bidir

# Reverse test - server sends to client
iperf3 -6 -c 2001:db8::1 -t 30 -R
```

## Step 5: Automated Benchmark Suite Script

```bash
#!/bin/bash
# ipv6-benchmark-suite.sh - comprehensive IPv6 performance test

SERVER="2001:db8::1"
DURATION=30
OUTPUT_DIR="/tmp/iperf3-results"
mkdir -p "$OUTPUT_DIR"

echo "=== IPv6 Network Benchmark Suite ===" | tee "$OUTPUT_DIR/summary.txt"
echo "Server: $SERVER, Duration: ${DURATION}s each" | tee -a "$OUTPUT_DIR/summary.txt"
echo "" | tee -a "$OUTPUT_DIR/summary.txt"

tests=(
    "tcp_1stream:-t $DURATION"
    "tcp_4streams:-t $DURATION -P 4"
    "tcp_reverse:-t $DURATION -R"
    "udp_100m:-u -b 100M -t $DURATION"
    "udp_1g:-u -b 1G -t $DURATION"
    "tcp_bidir:-t $DURATION --bidir"
)

for test_spec in "${tests[@]}"; do
    name="${test_spec%%:*}"
    flags="${test_spec##*:}"

    echo "--- $name ---" | tee -a "$OUTPUT_DIR/summary.txt"

    iperf3 -6 -c "$SERVER" $flags -J \
        > "$OUTPUT_DIR/${name}.json" 2>&1

    # Extract and print key metrics
    if [ "$name" = "tcp_bidir" ]; then
        jq -r '"  Forward: \(.end.sum_received.bits_per_second / 1e6) Mbps  Reverse: \(.end.sum_received_bidir_reverse.bits_per_second / 1e6) Mbps"' \
            "$OUTPUT_DIR/${name}.json" | tee -a "$OUTPUT_DIR/summary.txt"
    elif [ "${name:0:3}" = "udp" ]; then
        jq -r '(.end.sum_received // .end.sum) as $rx |
               "  Throughput: \($rx.bits_per_second / 1e6) Mbps  Jitter: \($rx.jitter_ms)ms  Lost: \($rx.lost_percent)%"' \
            "$OUTPUT_DIR/${name}.json" | tee -a "$OUTPUT_DIR/summary.txt"
    else
        jq -r '.end.sum_received.bits_per_second / 1e6 |
               "  Throughput: \(.) Mbps"' \
            "$OUTPUT_DIR/${name}.json" | tee -a "$OUTPUT_DIR/summary.txt"
    fi
done

echo "" && echo "Results saved to $OUTPUT_DIR"
```

## Step 6: Analyze JSON Results

```python
import json
import glob

# Summarize all iperf3 JSON results
for filepath in glob.glob("/tmp/iperf3-results/*.json"):
    test_name = filepath.split("/")[-1].replace(".json", "")
    with open(filepath) as f:
        data = json.load(f)

    if "error" in data:
        print(f"{test_name}: ERROR - {data['error']}")
        continue

    protocol = data.get("start", {}).get("test_start", {}).get("protocol", "").upper()
    end = data.get("end", {})

    if protocol == "UDP":
        udp = end.get("sum_received") or end.get("sum", {})
        mbps = udp.get("bits_per_second", 0) / 1e6
        jitter = udp.get("jitter_ms", 0)
        lost_pct = udp.get("lost_percent", 0)
        print(f"{test_name}: {mbps:.1f} Mbps, jitter={jitter:.3f}ms, loss={lost_pct:.2f}%")
    elif "sum_received_bidir_reverse" in end:
        forward_mbps = end["sum_received"]["bits_per_second"] / 1e6
        reverse_mbps = end["sum_received_bidir_reverse"]["bits_per_second"] / 1e6
        forward_retrans = end.get("sum_sent", {}).get("retransmits", 0)
        reverse_retrans = end.get("sum_sent_bidir_reverse", {}).get("retransmits", 0)
        print(
            f"{test_name}: forward={forward_mbps:.1f} Mbps (retransmits={forward_retrans}), "
            f"reverse={reverse_mbps:.1f} Mbps (retransmits={reverse_retrans})"
        )
    elif "sum_received" in end:
        mbps = end["sum_received"]["bits_per_second"] / 1e6
        retrans = end.get("sum_sent", {}).get("retransmits", 0)
        print(f"{test_name}: {mbps:.1f} Mbps, retransmits={retrans}")
```

## Conclusion

iperf3 with the `-6` flag provides comprehensive IPv6 benchmarking across TCP throughput, UDP jitter, and packet loss dimensions. Run these tests as baselines and after infrastructure changes. Pair iperf3 baselines with continuous OneUptime monitoring to detect performance regressions in production.
