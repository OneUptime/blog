# How to Monitor TCP Congestion Window (CWND) Size in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Congestion Window, CWND, Monitoring, Performance

Description: Monitor the TCP congestion window size in real time using ss and nstat to understand congestion control behavior and identify throughput limitations.

## Introduction

The TCP Congestion Window (CWND) limits how many bytes the sender can have in-flight beyond the receiver window constraint. Monitoring CWND during a transfer reveals how the congestion control algorithm is behaving - growing during slow start, limited by the receive window, or shrinking in response to detected congestion.

## Monitoring CWND with ss

```bash
# Show CWND for all established connections

ss -tin state established | grep cwnd

# Example output:
# tcp ESTAB ... cubic wscale:7,7 rto:204 rtt:1.5/0.3 ato:40 mss:1460
#   rcvmss:1460 advmss:1460 cwnd:10 bytes_acked:14600 bytes_received:0
#   rcv_space:87380 rcv_ssthresh:87380 minrtt:1.2 snd_wnd:65536

# cwnd: current congestion window in MSS units
# cwnd=10 means 10×1460 = 14,600 bytes can be in flight
```

## Real-Time CWND Monitoring Script

```bash
#!/bin/bash
# Monitor CWND for connections to a specific host during a transfer

TARGET="10.20.0.5"

echo "time_s,cwnd_mss,cwnd_bytes,rtt_ms"
while true; do
    DATA=$(ss -tin state established "( dst $TARGET )" 2>/dev/null | \
           awk '/cwnd:/{
             match($0, /[[:space:]]cwnd:([0-9]+)/, cwnd)
             match($0, /rtt:([0-9.]+)/, rtt)
             match($0, /[[:space:]]mss:([0-9]+)/, mss)
             if(cwnd[1] && mss[1])
               print cwnd[1], cwnd[1]*mss[1], rtt[1]
           }')

    if [ -n "$DATA" ]; then
        echo "$(date +%s.%3N),$DATA" | tr ' ' ','
    fi
    sleep 0.2
done
```

## Watching CWND Grow During Slow Start

```bash
# Start a large transfer in background
iperf3 -c 10.20.0.5 -t 60 &

# Watch CWND grow in real time (every 200ms)
watch -n 0.2 "ss -tin state established '( dst 10.20.0.5 )' | \
  grep -oP '(?<=[[:space:]])cwnd:\K[0-9]+'"

# Expected during slow start (Linux default initial CWND is 10, per RFC 6928):
# 10, 20, 40, 80, 160... (doubling each RTT until ssthresh)
# Then linear growth: 160, 161, 162... (congestion avoidance phase)
```

## CWND via /proc (Alternative Method)

```bash
# /proc/net/tcp does not expose CWND directly (only basic socket state)
# Detailed CWND info is only available via netlink (which ss uses)
cat /proc/net/tcp | awk 'NR>1{print $4}' | head -10
# Column 4 = connection state in hex (e.g. 01=ESTABLISHED, 0A=LISTEN)

# More portable: use nstat for aggregate statistics
nstat | grep TcpExt | grep -i cwnd
nstat -a | grep "TcpExt.*Cwnd"
```

## Interpreting CWND Patterns

```text
CWND Pattern        | Meaning
--------------------|-------------------------------------------
Exponential growth  | Slow start phase (healthy)
Linear growth       | Congestion avoidance (at capacity)
Sudden halving      | 3 duplicate ACKs (fast retransmit)
Drop to 1           | Timeout (severe congestion/loss)
Oscillating         | Normal CUBIC behavior under saturation
Steady large value  | BBR at estimated bandwidth rate
```

## Using iperf3 for CWND History

```bash
# iperf3 with --json gives detailed stats including congestion info
iperf3 -c 10.20.0.5 -t 30 --json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for interval in data['intervals']:
    # Extract per-interval statistics
    s = interval['streams'][0]
    print(f't={s[\"start\"]:.1f}s  '
          f'bits={s[\"bits_per_second\"]/1e6:.1f}Mbps  '
          f'retrans={s[\"retransmits\"]}  '
          f'cwnd={s.get(\"snd_cwnd\",0)/1024:.0f}KB')
"
```

## Conclusion

CWND monitoring reveals the congestion control algorithm's internal behavior in real time. During a healthy transfer, you should see CWND grow rapidly in slow start, then more gradually in congestion avoidance. Sudden drops indicate loss events. CWND plateauing at small values relative to your bandwidth-delay product means the window is the bottleneck - either due to packet loss forcing reduction or the receive window capping growth.
