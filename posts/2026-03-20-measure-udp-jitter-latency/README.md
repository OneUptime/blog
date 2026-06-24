# How to Measure UDP Jitter and Latency on Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Jitter, Latency, Performance, Networking, iperf3, Measurement

Description: Measure UDP one-way latency, round-trip time, and jitter using iperf3, custom scripts, and dedicated tools to assess network quality for real-time applications.

## Introduction

Latency and jitter are the critical metrics for real-time UDP applications. Latency is how long a packet takes to travel from sender to receiver. Jitter is the variation in latency between consecutive packets - high jitter causes audio dropouts and video stutters even when average latency is acceptable. As rough targets, VoIP often aims to keep jitter under 30ms, while fast-paced gaming is usually much more sensitive and benefits from keeping jitter well under 10ms.

## Measuring RTT with ping (ICMP baseline)

```bash
# ping gives RTT (round-trip) and RTT variability (`mdev`) on Linux:

ping -c 100 -i 0.1 10.20.0.5 | tail -3
# rtt min/avg/max/mdev = 0.4/0.6/2.1/0.3 ms
# mdev = population standard deviation of RTT = rough proxy for variability

# Higher sample count for better jitter estimate:
ping -c 1000 -i 0.01 10.20.0.5 | tail -3
# mdev is RTT variability in ms, not a UDP-specific jitter measurement

# Note: ping uses ICMP, not UDP. Actual UDP jitter may differ.
# Use iperf3 UDP mode for UDP-specific measurement.
```

## UDP Jitter with iperf3

```bash
# Server (on remote host):
iperf3 -s

# Client: measure UDP jitter with 160-byte payloads at about 50 packets/sec:
iperf3 -c 10.20.0.5 -u -b 64K -l 160 -t 60 --get-server-output
# -b 64K: 64 kbps payload rate, which works out to about 50 packets/sec with -l 160
# -l 160: 160-byte UDP payload approximates a 20 ms G.711 audio payload
# Output: server-side reports include jitter in ms

# For gaming: small packets at gaming rate:
iperf3 -c 10.20.0.5 -u -b 100K -l 60 -t 30
# -l 60: small game state packets

# Interpret results:
# Jitter < 5ms: excellent (suitable for all real-time apps)
# Jitter 5-30ms: acceptable for VoIP (with jitter buffer)
# Jitter > 30ms: problematic for VoIP, unacceptable for gaming
```

## Custom UDP RTT Measurement

```python
#!/usr/bin/env python3
# udp_latency_measure.py - Measure UDP echo RTT

import socket
import time
import statistics
import math

SERVER = '10.20.0.5'
PORT = 5000
NUM_PACKETS = 100
INTERVAL = 0.05  # 50ms between packets

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(1.0)

# This script measures RTT. Measuring one-way latency requires synchronized clocks
# on both hosts and timestamps taken at both endpoints.

# Start echo server on remote:
# python3 -c "
# import socket
# s=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
# s.bind(('',5000))
# while True:
#     d,a=s.recvfrom(100)
#     s.sendto(d,a)
# "

rtts = []
for i in range(NUM_PACKETS):
    send_time = time.perf_counter()
    sock.sendto(str(send_time).encode(), (SERVER, PORT))
    try:
        data, _ = sock.recvfrom(100)
        rtt_ms = (time.perf_counter() - send_time) * 1000
        rtts.append(rtt_ms)
    except socket.timeout:
        pass
    time.sleep(INTERVAL)

sock.close()

if rtts:
    print(f"Packets: {len(rtts)}/{NUM_PACKETS}")
    print(f"Min RTT:  {min(rtts):.2f} ms")
    print(f"Avg RTT:  {statistics.mean(rtts):.2f} ms")
    print(f"Max RTT:  {max(rtts):.2f} ms")
    if len(rtts) > 1:
        rtt_stddev = statistics.stdev(rtts)
        print(f"RTT Std Dev: {rtt_stddev:.2f} ms")
    else:
        print("RTT Std Dev: n/a (need at least 2 samples)")

    # Percentiles:
    sorted_rtts = sorted(rtts)
    p99_index = max(0, math.ceil(0.99 * len(sorted_rtts)) - 1)
    p99 = sorted_rtts[p99_index]
    print(f"P99 RTT:  {p99:.2f} ms")
```

## Continuous Jitter Monitoring

```bash
#!/bin/bash
# Monitor jitter over time, log results

SERVER="10.20.0.5"
LOG_FILE="/var/log/udp-jitter.log"

while true; do
    RESULT=$(iperf3 -c "$SERVER" -u -b 64K -l 160 -t 10 -J 2>/dev/null)
    METRICS=$(echo "$RESULT" | python3 -c "
import json,sys
try:
    end=json.load(sys.stdin).get('end', {})
    candidates=[end.get('sum'), end.get('sum_received'), end.get('sum_sent')]
    report=next(item for item in candidates if isinstance(item, dict) and 'jitter_ms' in item)
    print(f\"{report['jitter_ms']:.3f} {report['lost_percent']:.2f}\")
except Exception:
    print('error error')")
    JITTER=${METRICS%% *}
    LOSS=${METRICS##* }
    echo "$(date +%Y-%m-%dT%H:%M:%S) jitter=${JITTER}ms loss=${LOSS}%" | tee -a "$LOG_FILE"
    sleep 60
done
```

## Network Quality Thresholds

```text
Metric       | Excellent | Acceptable | Poor
-------------|-----------|------------|------
RTT          | < 20ms    | 20-100ms   | > 100ms
Jitter       | < 5ms     | 5-30ms     | > 30ms
Packet Loss  | < 0.1%    | 0.1-1%     | > 1%

Typical starting points (application behavior varies):
VoIP (G.711):     RTT < 150ms, Jitter < 30ms, Loss < 1%
HD Video call:    RTT < 100ms, Jitter < 15ms, Loss < 0.5%
Online gaming:    RTT < 30ms,  Jitter < 10ms, Loss < 0.1%
Live streaming:   Throughput, loss, and player buffer depth usually matter more than RTT alone
```

## Conclusion

iperf3 UDP mode provides a practical UDP-specific jitter measurement - run with small packets at the target bitrate to simulate your specific application. Monitor `mdev` from ping for quick RTT-variability checks. For production monitoring, run the jitter logging script continuously and alert when jitter exceeds application-specific thresholds. P99 latency is more actionable than average for user-facing applications - a P99 > 50ms is noticeable even when average is low.
