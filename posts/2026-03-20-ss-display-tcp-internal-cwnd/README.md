# How to Display TCP Internal Information (CWND, RTT) with ss -i

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, TCP, CWND, RTT, Linux, Performance

Description: Use ss -i to display TCP internal statistics including congestion window (cwnd), retransmission rate, round-trip time, and sender/receiver buffer information for performance analysis.

`ss -i` exposes the TCP stack's internal state for each connection. This is far more detailed than anything netstat can show, helping diagnose throughput problems, retransmissions, and TCP tuning effectiveness.

## Display TCP Internal Information

```bash
# Show internal TCP info for TCP connections

ss -ti

# With IPv4 filter
ss -4ti

# For connections to a specific host
sudo ss -ti dst 8.8.8.8

# All established connections with internal info
ss -tin state established
```

## Reading ss -ti Output

```bash
ss -ti

# ESTAB 0 0 192.168.1.100:22 203.0.113.5:54321
#   cubic wscale:7,7 rto:220 rtt:12.4/3.1 ato:40 mss:1460
#   rcvmss:1460 advmss:1460 cwnd:10 bytes_sent:12345 bytes_retrans:0
#   bytes_acked:12345 bytes_received:5678 segs_out:50 segs_in:40
#   data_segs_out:30 data_segs_in:20 send 11.8Mbps lastsnd:100
#   lastrcv:100 lastack:100 pacing_rate 23.6Mbps delivery_rate 11.8Mbps
#   delivered:30 busy:100ms rcv_rtt:12.5 rcv_space:65536 rcv_ssthresh:65536

# Key fields explained below
```

## Key Fields Explained

```yaml
Field           Description                        What to Look For
--------------  ---------------------------------  ----------------------------
rtt:X/Y         Round-trip time / variation        X=avg, Y=mean deviation
                                                   High Y = jitter problem
cwnd:N          Congestion window (segments)       Low cwnd can limit throughput
                                                   Loss/slow start may reduce cwnd
bytes_retrans   Bytes retransmitted                > 0 = data was retransmitted
bytes_sent      Total bytes sent                   Throughput indicator
send NNMbps     Current send rate estimate         Compare to link capacity
pacing_rate     TCP pacing rate                    Compare to send/delivery rate
delivery_rate   ACK-clocked delivery estimate      Low value needs context
```

## Diagnose Retransmissions with ss -ti

```bash
# Check for retransmissions (non-zero = data was retransmitted)
ss -ti | grep bytes_retrans

# Calculate retransmission rate
ss -ti | awk '
/bytes_/ {
    sent = retrans = 0
    for (i = 1; i <= NF; i++) {
        if ($i ~ /^bytes_sent:/) {
            split($i, s, ":")
            sent = s[2]
        }
        if ($i ~ /^bytes_retrans:/) {
            split($i, r, ":")
            retrans = r[2]
        }
    }
    if (sent > 0) printf "Retrans: %.2f%%\n", (retrans/sent)*100
}'
```

## Check Congestion Window Size

```bash
# View cwnd for all established connections
ss -ti | grep cwnd

# A small cwnd indicates:
# - Recent packet loss (TCP reduced cwnd)
# - Connection is in slow start
# - The congestion window is limiting throughput

# cwnd=10 with MSS=1460 -> max in-flight = 14600 bytes ~= 11.7Mbps at 10ms RTT
# Formula (bits/s): throughput ~= cwnd * MSS * 8 / RTT
```

## Measure Actual TCP Throughput

```bash
# For a connection to a file server, see the delivery rate
ss -ti dst 10.0.0.50

# send 11.8Mbps = current egress rate estimate
# delivery_rate 11.8Mbps = recent ACK-clocked delivery rate estimate
# If delivery_rate << send rate -> check for loss, congestion, receiver limits, or app-limited traffic
```

## Monitor TCP Health in Real Time

```bash
#!/bin/bash
# tcp-health.sh - Monitor TCP connection health

while true; do
    echo "=== TCP Health $(date '+%H:%M:%S') ==="
    ss -ti state established | awk '
        /rtt:/ || /bytes_retrans:/ || /cwnd:/ {
          for (i = 1; i <= NF; i++) {
            if ($i ~ /^rtt:/) {
              split($i, rtt_fields, "[:/]")
              rtt += rtt_fields[2]
              count++
            }
            if ($i ~ /^bytes_retrans:/) {
              split($i, retrans_fields, ":")
              retrans += retrans_fields[2]
            }
          }
        }
        END {
          if(count>0) printf "Avg RTT: %.1fms | Total retrans: %d bytes\n", rtt/count, retrans
        }
      '
    sleep 5
done
```

`ss -i` provides rich TCP connection data on Linux - it's a primary tool for understanding why a specific connection is performing poorly.
