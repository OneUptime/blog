# How to Test UDP Throughput with iperf3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, iperf3, Throughput, Testing, Networking, Performance

Description: Use iperf3 to measure UDP throughput, packet loss, and jitter between two hosts for network capacity planning and troubleshooting.

## Introduction

`iperf3` is the standard tool for measuring network performance, and its UDP mode provides metrics that TCP mode cannot: packet loss percentage and jitter. These are critical for applications like VoIP, video streaming, and gaming. Unlike TCP, UDP sends at a specified rate regardless of network conditions, making it possible to test how the network handles a specific load and measure exactly how much is lost.

## Basic UDP Throughput Test

```bash
# Start iperf3 server on the remote host:

iperf3 -s

# Run UDP test from client (sends at 100 Mbps for 10 seconds):
iperf3 -c 10.20.0.5 -u -b 100M -t 10
# -u: UDP mode
# -b 100M: target bitrate (set explicitly for UDP; default is 1 Mbps)
# -t 10: test duration in seconds

# Sample output:
# [ ID] Interval      Transfer   Bitrate    Jitter   Lost/Total Datagrams
# [  5]  0.00-10.00 sec  119 MBytes  100 Mbits/sec  85415  sender
# [  5]  0.00-10.00 sec  119 MBytes  99.8 Mbits/sec  0.054 ms  282/85415 (0.33%)  receiver
```

## Key UDP Metrics

```text
Bitrate (sender):   Rate iperf3 actually sent
Bitrate (receiver): Rate that was received (< sender = loss)
Jitter:             Average delay variation (ms) - critical for VoIP/media
                    < 5ms excellent, 5-30ms acceptable, >30ms problematic for VoIP
Lost/Total:         Packets lost / total sent
Loss %:             (lost/total) * 100
                    < 0.1%: good for most applications
                    1-5%: affects VoIP quality
                    > 5%: severely impacts real-time media
```

## Sweep Test to Find Maximum Throughput

```bash
#!/bin/bash
# Find maximum UDP rate before significant loss occurs

SERVER="10.20.0.5"
declare -a RATES=("10M" "50M" "100M" "200M" "500M" "1G")

echo "Rate       | Achieved  | Loss%  | Jitter"
echo "-----------|-----------|--------|-------"

for RATE in "${RATES[@]}"; do
    RESULT=$(iperf3 -c $SERVER -u -b $RATE -t 10 -J 2>/dev/null)
    RECV_BPS=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['end']['sum_received']['bits_per_second'])" 2>/dev/null)
    LOSS=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['end']['sum_received']['lost_percent'])" 2>/dev/null)
    JITTER=$(echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['end']['sum_received']['jitter_ms'])" 2>/dev/null)
    RECV_MBPS=$(echo "scale=1; ${RECV_BPS:-0} / 1000000" | bc 2>/dev/null)
    printf "%-10s | %-9s | %-6s | %s ms\n" "$RATE" "${RECV_MBPS}M" "${LOSS}%" "$JITTER"
done
```

## VoIP / Real-Time UDP Testing

```bash
# VoIP typically uses small packets (160-200 bytes) at ~50 pps per call
# Simulate 100 concurrent VoIP calls:
# 100 calls * 50 pps * 200 bytes = 5000 pps, 1 MB/s (8 Mbits/sec)

iperf3 -c 10.20.0.5 -u -b 8M -l 200 -t 30
# -l 200: 200-byte UDP payload size (VoIP-sized datagrams)
# Focus on jitter (target: < 5ms)

# For video streaming simulation (1 Mbps HD stream):
iperf3 -c 10.20.0.5 -u -b 1M -l 1316 -t 30
# -l 1316: typical RTP video packet size
```

## Bidirectional UDP Test

```bash
# Test in both directions simultaneously:
iperf3 -c 10.20.0.5 -u -b 100M -t 10 --bidir
# Shows TX and RX separately
# Different loss in each direction can indicate an asymmetric path issue

# Reverse direction only (server sends to client):
iperf3 -c 10.20.0.5 -u -b 100M -t 10 -R
```

## Parse iperf3 JSON Output

```bash
# Get machine-readable results:
iperf3 -c 10.20.0.5 -u -b 100M -t 10 -J > /tmp/udp_result.json

# Parse with Python:
python3 << 'EOF'
import json
with open('/tmp/udp_result.json') as f:
    data = json.load(f)

sent = data['end']['sum_sent']
received = data['end']['sum_received']
print(f"Sent:     {sent['bits_per_second']/1e6:.1f} Mbps")
print(f"Received: {received['bits_per_second']/1e6:.1f} Mbps")
print(f"Loss:     {received['lost_percent']:.2f}%")
print(f"Jitter:   {received['jitter_ms']:.3f} ms")
print(f"Packets:  {sent['packets']} sent, {received['lost_packets']} lost")
EOF
```

## Conclusion

`iperf3 -u` measures UDP throughput, packet loss, and jitter with a single command. Always specify the `-b` rate for UDP tests to avoid the 1 Mbps default. Use the sweep test to find the point where loss begins increasing. For VoIP and real-time applications, focus on jitter: target under 5ms for acceptable call quality. The JSON output (`-J`) enables automated integration with monitoring systems.
