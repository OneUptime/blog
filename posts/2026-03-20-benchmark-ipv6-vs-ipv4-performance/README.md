# How to Benchmark IPv6 vs IPv4 Network Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Benchmarking, Performance, iperf3, Networking

Description: Systematically benchmark and compare IPv6 versus IPv4 network throughput, latency, and jitter using iperf3, ping, and netperf on Linux systems.

## Introduction

Comparing IPv6 and IPv4 performance helps identify protocol-specific bottlenecks, validate dual-stack deployments, and justify IPv6 adoption. This guide covers throughput, latency, and jitter benchmarking using standard tools.

## Prerequisites

- Two Linux hosts with both IPv4 and IPv6 addresses
- `iperf3` and `ping` installed
- No firewall blocking test ports

## Step 1: Measure Round-Trip Latency

```bash
# IPv4 ping - 100 packets

ping -c 100 -i 0.1 192.0.2.1

# IPv6 ping - 100 packets
ping -6 -c 100 -i 0.1 2001:db8::1

# Compare statistics output:
# rtt min/avg/max/mdev = X.XXX/X.XXX/X.XXX/X.XXX ms
```

IPv6 and IPv4 latency is often similar on native dual-stack networks; any differences are usually due to routing, peering, or device behavior rather than the IP version alone.

## Step 2: TCP Throughput with iperf3

Run iperf3 as a server on the remote host, then benchmark from the local host.

```bash
# On the server host - listen on port 5201
iperf3 -s -p 5201

# From the client - IPv4 TCP throughput (30 seconds, 4 parallel streams)
iperf3 -c 192.0.2.1 -p 5201 \
  -t 30 \
  -P 4 \
  --format m

# From the client - IPv6 TCP throughput
iperf3 -6 -c 2001:db8::1 -p 5201 \
  -t 30 \
  -P 4 \
  --format m

# UDP throughput test - IPv4
iperf3 -c 192.0.2.1 -u -b 1G -t 30

# UDP throughput test - IPv6
iperf3 -6 -c 2001:db8::1 -u -b 1G -t 30
```

## Step 3: Jitter Measurement with UDP

```bash
# IPv4 UDP jitter test (use -u for UDP, -b to set bandwidth)
iperf3 -c 192.0.2.1 -u -b 100M -t 60 --format m

# IPv6 UDP jitter test
iperf3 -6 -c 2001:db8::1 -u -b 100M -t 60 --format m

# iperf3 JSON output for scripted comparison
iperf3 -6 -c 2001:db8::1 -u -b 100M -t 60 -J > ipv6_result.json
iperf3 -c 192.0.2.1 -u -b 100M -t 60 -J > ipv4_result.json

# Parse and compare
python3 - <<'EOF'
import json

for label, fname in [("IPv4", "ipv4_result.json"), ("IPv6", "ipv6_result.json")]:
    with open(fname) as f:
        d = json.load(f)
    summary = d["end"].get("sum_received") or d["end"]["sum"]
    bps = summary["bits_per_second"]
    jitter = summary["jitter_ms"]
    loss = summary["lost_percent"]
    print(f"{label}: {bps/1e6:.2f} Mbps, jitter {jitter:.3f} ms, loss {loss:.2f}%")
EOF
```

## Step 4: Automated Comparison Script

```bash
#!/bin/bash
# bench-ip-comparison.sh - compare IPv4 vs IPv6 throughput

SERVER4="192.0.2.1"
SERVER6="2001:db8::1"
DURATION=30
PARALLEL=4

echo "=== IPv4 TCP Throughput ==="
iperf3 -c "$SERVER4" -t $DURATION -P $PARALLEL \
  --format m --logfile /tmp/ipv4_tcp.log
grep "receiver" /tmp/ipv4_tcp.log | tail -1

echo "=== IPv6 TCP Throughput ==="
iperf3 -6 -c "$SERVER6" -t $DURATION -P $PARALLEL \
  --format m --logfile /tmp/ipv6_tcp.log
grep "receiver" /tmp/ipv6_tcp.log | tail -1

echo "=== IPv4 Latency ==="
ping -c 50 -q "$SERVER4" 2>&1 | tail -2

echo "=== IPv6 Latency ==="
ping -6 -c 50 -q "$SERVER6" 2>&1 | tail -2
```

## Typical Results Interpretation

| Metric | Expected Outcome |
|---|---|
| TCP throughput | Approximately equal on native paths |
| RTT latency | Usually similar; differences are often path-dependent |
| Jitter | Similar; depends on path quality |
| CPU overhead | Usually similar on modern systems; verify on your hardware |

## Conclusion

On well-provisioned networks, IPv6 and IPv4 performance is nearly identical. Any latency differences are usually driven by routing and path characteristics rather than the IP version alone. Use these benchmarks as a baseline, and run them periodically with OneUptime's performance metrics to detect regressions after infrastructure changes.
