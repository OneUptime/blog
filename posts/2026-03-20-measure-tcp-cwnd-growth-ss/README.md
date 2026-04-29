# How to Measure TCP Congestion Window Growth with ss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, ss, CWND, Congestion Control, Performance

Description: Use the ss command to measure and track TCP congestion window growth during active transfers, providing insight into congestion control behavior.

## Introduction

The `ss` (socket statistics) command on Linux provides detailed per-connection TCP information including the congestion window (CWND) size, smoothed RTT, and retransmission counters. This makes it an essential tool for understanding how congestion control algorithms behave during real transfers, without needing to capture packets.

## Key TCP Fields in ss Output

```bash
# Show detailed TCP info for all established connections

ss -tin state established

# Example output (annotated):
# tcp ESTAB 0 0 192.168.1.10:52341 10.20.0.5:8080
#  cubic wscale:7,7               ← congestion algorithm, window scale
#  rto:204                         ← current RTO in ms
#  rtt:1.2/0.5                    ← smoothed RTT / mean deviation in ms
#  ato:40                          ← ACK timeout in ms
#  mss:1460                        ← MSS in bytes
#  pmtu:1500                       ← Path MTU
#  rcvmss:1460                     ← Receive MSS
#  advmss:1460                     ← Advertised MSS to peer
#  cwnd:10                         ← Congestion window in MSS units!
#  ssthresh:128                    ← Slow start threshold
#  bytes_sent:14600                ← Total bytes sent
#  bytes_acked:14600               ← Total bytes acknowledged
#  bytes_received:5840             ← Total bytes received
#  segs_out:10                     ← Segments sent
#  segs_in:5                       ← Segments received
#  data_segs_out:10                ← Data segments sent
#  send 96.5Mbps                   ← Calculated send rate
#  rcv_space:87380                 ← TCP receive-buffer autotuning helper
#  retrans:0/0                     ← Retransmission counters
```

## Capturing CWND Growth Over Time

```bash
#!/bin/bash
# Capture CWND values every 100ms during a transfer

TARGET="10.20.0.5"
OUTPUT="/tmp/cwnd_growth.csv"
echo "timestamp,cwnd_mss,cwnd_bytes,rtt_ms,retrans" > $OUTPUT

# Start a transfer in background
# Requires an iperf3 server listening on $TARGET
iperf3 -c $TARGET -t 30 &>/dev/null &
IPERF_PID=$!

# Capture CWND data
for i in $(seq 1 300); do  # 300 samples × 100ms = 30 seconds
    DATA=$(ss -tinHO state established "( dst $TARGET )" 2>/dev/null | \
           awk '
             BEGIN { best = -1 }
             /cwnd:/ {
               cwnd = mss = retrans = bytes_acked = 0
               rtt = ""
               for (i = 1; i <= NF; i++) {
                 if ($i ~ /^cwnd:/) {
                   split($i, a, ":")
                   cwnd = a[2] + 0
                 } else if ($i ~ /^rtt:/) {
                   split($i, a, ":")
                   split(a[2], b, "/")
                   rtt = b[1]
                 } else if ($i ~ /^mss:/) {
                   split($i, a, ":")
                   mss = a[2] + 0
                 } else if ($i ~ /^retrans:/) {
                   split($i, a, ":")
                   split(a[2], b, "/")
                   retrans = b[1] + 0
                 } else if ($i ~ /^bytes_acked:/) {
                   split($i, a, ":")
                   bytes_acked = a[2] + 0
                 }
               }
               if (cwnd && mss && bytes_acked >= best) {
                 best = bytes_acked
                 best_cwnd = cwnd
                 best_mss = mss
                 best_rtt = rtt
                 best_retrans = retrans
               }
             }
             END {
               if (best >= 0)
                 printf "%d,%d,%s,%d", best_cwnd, best_cwnd * best_mss, best_rtt, best_retrans
             }')
    if [ -n "$DATA" ]; then
        echo "$(date +%s.%3N),$DATA" >> $OUTPUT
    fi
    sleep 0.1
done

kill $IPERF_PID 2>/dev/null
echo "Data saved to $OUTPUT"

# Quick analysis
awk -F, 'NR>1{sum+=$2; n++; if($2>max)max=$2; if($2<min||min=="")min=$2}
  END{if(n) print "CWND - Min:", min, "Max:", max, "Avg:", sum/n" MSS"; else print "No samples captured"}' $OUTPUT
```

## Extracting RTT and CWND Together

```bash
# Show both RTT and CWND for quick assessment
ss -tinH state established | \
  awk '{
    cwnd = rtt = ""
    ssthresh = "n/a"
    for (i = 1; i <= NF; i++) {
      if ($i ~ /^rtt:/) {
        split($i, a, ":")
        split(a[2], b, "/")
        rtt = b[1]
      } else if ($i ~ /^cwnd:/) {
        split($i, a, ":")
        cwnd = a[2]
      } else if ($i ~ /^ssthresh:/) {
        split($i, a, ":")
        ssthresh = a[2]
      }
    }
    if (cwnd != "")
      printf "CWND: %s MSS, RTT: %s ms, ssthresh: %s\n", cwnd, rtt, ssthresh
  }'
```

## Analyzing the Data

```bash
# After collecting cwnd_growth.csv, analyze the growth pattern:

python3 << 'EOF'
import csv

with open('/tmp/cwnd_growth.csv') as f:
    rows = list(csv.DictReader(f))

if rows:
    print(f"Samples: {len(rows)}")
    cwnd_values = [int(r['cwnd_mss']) for r in rows if r['cwnd_mss']]
    print(f"Min CWND: {min(cwnd_values)} MSS")
    print(f"Max CWND: {max(cwnd_values)} MSS")
    print(f"Final CWND: {cwnd_values[-1]} MSS")

    # Detect congestion events (CWND drops)
    drops = [(i, cwnd_values[i], cwnd_values[i-1])
             for i in range(1, len(cwnd_values))
             if cwnd_values[i] < cwnd_values[i-1] * 0.7]
    print(f"Congestion events (>30% CWND drop): {len(drops)}")
EOF
```

## Conclusion

`ss -tin` provides a comprehensive view of TCP connection internals without packet capture overhead. The CWND field, combined with MSS size and RTT, helps estimate the sender's in-flight limit and an upper bound on throughput. Track CWND over time to see congestion events as drops, and compare ssthresh against CWND to help infer whether a flow is still in slow start or has moved into congestion avoidance.
