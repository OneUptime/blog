# How to Measure IPv6 Latency and Jitter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Latency, Jitter, Monitoring, Ping, iperf3, Networking

Description: Measure IPv6 network latency and jitter using ping6, iperf3 UDP mode, and custom Python scripts to establish baselines and detect degradation over time.

## Introduction

Latency (round-trip time) and jitter (variation in latency) are critical quality metrics for IPv6 networks, especially for real-time applications like VoIP and video. This guide covers practical measurement techniques using standard tools and custom monitoring.

## Step 1: Basic Latency Measurement with ping -6

```bash
# Standard latency measurement - 100 packets

ping -6 -c 100 2001:db8::1

# High-frequency measurement - 1000 packets at 10 pps
ping -6 -c 1000 -i 0.1 2001:db8::1

# Flood ping (requires root) - maximum rate
sudo ping -6 -f -c 10000 2001:db8::1

# Specify packet size to test path MTU behavior
ping -6 -c 100 -s 1400 2001:db8::1   # 1400-byte payload
ping -6 -c 100 -s 8952 2001:db8::1   # ~9000-byte IPv6 packet
```

Output parsing:
```text
# Key output line:
# rtt min/avg/max/mdev = 0.451/0.612/1.203/0.087 ms
# mdev = RTT variability (population standard deviation), often used as a jitter proxy
```

## Step 2: Jitter Measurement with iperf3 UDP

iperf3's UDP mode reports receiver-side interarrival jitter directly.

```bash
# Start server on remote host
iperf3 -s -6 -p 5201

# Run UDP test - 1 Mbps for 60 seconds, report every second
# -u: UDP mode
# -b 1M: 1 Mbps send rate
# -t 60: 60-second duration
# -i 1: Report every second
# --format m: Mbits/s output
iperf3 -6 -c 2001:db8::1 \
  -u \
  -b 1M \
  -t 60 \
  -i 1 \
  --format m

# For interval jitter JSON, restart the server in JSON mode and
# have the client capture the receiver-side results.
# Remote server:
# iperf3 -s -6 -1 -J
iperf3 -6 -c 2001:db8::1 -u -b 1M -t 60 -i 1 -J --get-server-output > jitter_test.json
```

## Step 3: Parse iperf3 Jitter Results

```python
import json
import statistics

# jitter_analysis.py - parse iperf3 JSON output for jitter statistics

with open("jitter_test.json") as f:
    data = json.load(f)

# Extract receiver-side per-interval jitter values. When the client uses
# --get-server-output against a server started with -J, the server JSON is
# nested under server_output_json.
interval_source = data.get("server_output_json", data)
intervals = interval_source.get("intervals", [])
jitter_values = [
    iv["sum"]["jitter_ms"]
    for iv in intervals
    if "jitter_ms" in iv.get("sum", {})
]

if jitter_values:
    avg_jitter = statistics.mean(jitter_values)
    print(f"Samples:  {len(jitter_values)}")
    print(f"Min jitter: {min(jitter_values):.3f} ms")
    print(f"Max jitter: {max(jitter_values):.3f} ms")
    print(f"Avg jitter: {avg_jitter:.3f} ms")
    if len(jitter_values) > 1:
        print(f"StdDev:     {statistics.stdev(jitter_values):.3f} ms")
    else:
        print("StdDev:     N/A (need at least two samples)")

    # Alert if average jitter exceeds threshold
    JITTER_THRESHOLD_MS = 5.0
    if avg_jitter > JITTER_THRESHOLD_MS:
        print(f"WARNING: Average jitter exceeds {JITTER_THRESHOLD_MS}ms")
```

## Step 4: Continuous Latency Monitoring Script

```bash
#!/bin/bash
# ipv6-latency-monitor.sh - log latency every 60 seconds

TARGET="2001:db8::1"
LOG="/var/log/ipv6-latency.csv"
INTERVAL=60

# Write CSV header
echo "timestamp,min_ms,avg_ms,max_ms,mdev_ms,loss_pct" > "$LOG"

while true; do
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Run ping and capture statistics
    RESULT=$(ping -6 -c 20 -i 0.1 -q "$TARGET" 2>&1)

    # Parse RTT line: rtt min/avg/max/mdev = X/X/X/X ms
    RTT=$(echo "$RESULT" | grep -oP 'rtt min/avg/max/mdev = \K[0-9./]+')
    MIN=$(echo "$RTT" | cut -d/ -f1)
    AVG=$(echo "$RTT" | cut -d/ -f2)
    MAX=$(echo "$RTT" | cut -d/ -f3)
    MDEV=$(echo "$RTT" | cut -d/ -f4)

    # Parse packet loss percentage
    LOSS=$(echo "$RESULT" | grep -oP '\K[0-9.]+(?=% packet loss)')

    echo "$TIMESTAMP,$MIN,$AVG,$MAX,$MDEV,$LOSS" >> "$LOG"

    sleep $INTERVAL
done
```

## Step 5: Visualize Latency Trends

Import the CSV into Grafana using a CSV-capable datasource plugin, or use Python:

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load and plot latency over time
df = pd.read_csv("/var/log/ipv6-latency.csv", parse_dates=["timestamp"])
df.set_index("timestamp", inplace=True)

fig, axes = plt.subplots(2, 1, figsize=(12, 8))
df[["min_ms", "avg_ms", "max_ms"]].plot(ax=axes[0], title="IPv6 RTT (ms)")
df["mdev_ms"].plot(ax=axes[1], title="Jitter (mdev ms)")
plt.tight_layout()
plt.savefig("ipv6_latency.png")
```

## Conclusion

Measuring IPv6 latency and jitter requires both point-in-time snapshots and continuous monitoring. The `ping -6` `mdev` value is a useful proxy for RTT variation, while iperf3 UDP mode provides receiver-side per-second jitter measurements. Feed these metrics into OneUptime to alert on regressions and track trends over time.
