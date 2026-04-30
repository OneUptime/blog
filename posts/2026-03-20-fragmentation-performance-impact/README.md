# How to Understand the Performance Impact of IPv4 Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, Performance, MTU, Linux, Networking

Description: Measure and understand the CPU, throughput, and reliability impact of IPv4 fragmentation, and quantify the benefit of avoiding fragmentation through proper MTU sizing.

## Introduction

IPv4 fragmentation has real performance costs that are often underestimated. Every fragment that must be reassembled consumes CPU cycles and memory. When a single fragment is lost, the entire original packet fails - increasing the effective loss rate as the fragment count rises. In high-throughput environments, fragmentation can measurably reduce throughput compared to properly sized packets.

## Why Fragmentation Hurts Performance

```text
Performance costs of fragmentation:

1. Increased loss probability:
   For low loss rates, a packet split into N fragments has roughly N times the failure chance
   If fragment losses are independent, effective loss is 1 - (1 - p)^N
   1% link loss rate + 3-fragment packet = ~3% packet loss
   (vs 1% with unfragmented packets)

2. CPU overhead at receiver:
   Each fragment must be queued, tracked, and reassembled
   Requires memory allocation per fragment set
   Adds extra per-fragment bookkeeping in the IP stack

3. Memory pressure:
   Fragments held in memory until all arrive (or ipfrag_time expires)
   Stale incomplete fragment sets accumulate on lossy networks

4. Additional header overhead:
   IP+UDP = 28 bytes overhead on first fragment
   IP only = 20 bytes overhead on subsequent fragments
   vs single large packet with just 28 bytes overhead
```

## Measure Fragmentation Impact

```bash
# Benchmark 1: Compare throughput with and without fragmentation

# Setup: lower the interface MTU for the test host

ORIG_MTU=$(cat /sys/class/net/eth0/mtu)
sudo ip link set dev eth0 mtu 1400

# Measure throughput WITH fragmentation:
iperf3 -c 10.20.0.5 -t 30 -u -b 500M -l 8960  # Large UDP packets
# At a 1400-byte MTU, this UDP payload requires 7 IPv4 fragments

# Measure throughput WITHOUT fragmentation:
iperf3 -c 10.20.0.5 -t 30 -u -b 500M -l 1372  # 1372-byte UDP payload fits in a 1400-byte IPv4 MTU

# Restore the original MTU after the test:
sudo ip link set dev eth0 mtu "$ORIG_MTU"

# Compare the receiver-side throughput numbers
```

## Measure CPU Impact of Fragmentation

```bash
# Monitor CPU during fragment-heavy traffic:

# Run this as root (or with CAP_NET_RAW) because flood ping needs privileges.

# Start fragment-generating traffic:
ping -4 -M want -s 8000 -f 10.20.0.5 &   # Flood ping with large (fragmented) packets
PING_PID=$!

# Measure CPU:
mpstat 1 5 | tail -5

# Kill ping:
kill $PING_PID

# Comparison: same traffic with unfragmented packets:
ping -4 -M want -s 1400 -f 10.20.0.5 &   # Fits within a 1500-byte MTU
PING_PID=$!
mpstat 1 5 | tail -5
kill $PING_PID

# The fragmented traffic often shows higher %sys CPU usage
```

## Monitor Fragmentation Statistics

```bash
# Track fragmentation impact in production:

# Check fragmentation rate:
watch -n 1 "nstat | grep -E 'IpFrag|IpReasm'"
# IpFragCreates: output fragments created locally
# IpReasmReqds: received fragments that required reassembly
# IpReasmOKs: datagrams successfully reassembled
# IpReasmFails: reassembly failures (timeout, missing fragments, overlap/errors, etc.)

# Calculate failure rate:
nstat | python3 -c "
import sys
data = {}
for line in sys.stdin:
    parts = line.split()
    if len(parts) >= 2:
        data[parts[0]] = int(parts[1])

ok = data.get('IpReasmOKs', 0)
fail = data.get('IpReasmFails', 0)
total = ok + fail
if total > 0:
    fail_rate = fail / total * 100
    print(f'Reassembly failure rate: {fail_rate:.2f}% ({fail}/{total})')
"
```

## Practical Loss Rate Calculation

```python
#!/usr/bin/env python3
# Calculate effective packet loss with fragmentation

import math


def calculate_loss_with_fragmentation(link_loss_pct, udp_payload_bytes, mtu=1500):
    """
    Calculate effective UDP packet loss when IPv4 fragmentation occurs.

    With fragmentation, each original packet is split into N fragments.
    The original packet fails if ANY fragment is lost.

    Assumes IPv4 without IP options.
    """
    link_loss = link_loss_pct / 100
    ip_header = 20
    udp_header = 8
    max_ip_payload = mtu - ip_header

    # Number of fragments per packet:
    if udp_payload_bytes + udp_header <= max_ip_payload:
        n_fragments = 1
    else:
        # Non-final IPv4 fragments must carry a payload size divisible by 8 bytes.
        fragment_payload = (max_ip_payload // 8) * 8
        n_fragments = math.ceil((udp_payload_bytes + udp_header) / fragment_payload)

    # Probability all N fragments arrive successfully:
    success_prob = (1 - link_loss) ** n_fragments
    effective_loss = (1 - success_prob) * 100

    return n_fragments, effective_loss

# Example: 0.5% link loss, various UDP payload sizes
print("UDP Payload | Fragments | Effective Loss (0.5% link)")
print("-----------|-----------|---------------------------")
for size in [1000, 1472, 3000, 9000, 16000]:
    frags, loss = calculate_loss_with_fragmentation(0.5, size)
    print(f"{size:10d} | {frags:9d} | {loss:.3f}%")
```

## Conclusion

Fragmentation multiplies your effective packet loss rate - under independent fragment loss, a 1% link loss becomes about 6.8% effective loss for a 7-fragment packet. It also adds CPU overhead for reassembly and memory pressure from queued fragment sets. The performance fix is simple: size packets to fit within the path MTU. For TCP, this happens automatically via PMTUD and MSS negotiation. For UDP, limit application payload to the path MTU minus 28 bytes. Monitor `IpReasmFails` in production - a non-zero rate means some fragmented packets could not be reassembled.
