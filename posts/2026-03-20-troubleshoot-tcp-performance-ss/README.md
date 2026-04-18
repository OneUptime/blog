# How to Troubleshoot TCP Performance with the ss Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, ss, Performance, Troubleshooting, Networking

Description: Use the ss command's detailed TCP information to diagnose connection performance issues including RTT, retransmissions, window sizes, and congestion control state.

## Introduction

The `ss` (socket statistics) command is the modern replacement for `netstat`. Its `-tin` flag provides detailed per-connection TCP information that would otherwise require packet capture: RTT, smoothed variance, CWND, receive space, retransmission counts, and more. This makes it the fastest way to get a performance snapshot for any TCP connection.

## Key TCP Metrics from ss

```bash
# Basic syntax for detailed TCP info

ss -tin state established

# Essential fields explained:
# tcp ESTAB 0 0 local:port peer:port
#   timer: keepalive timeout information
#   skmem: socket memory usage
#   cubic wscale:7,7 = congestion algorithm and window scale
#   rto:204 = retransmission timeout in ms
#   rtt:1.2/0.5 = RTT / variance (both in ms)
#   ato:40 = ACK timeout in ms (for delayed ACKs)
#   mss:1460 = Maximum Segment Size
#   pmtu:1500 = Path MTU
#   rcvmss:1460 = Receive MSS
#   advmss:1460 = Advertised MSS
#   cwnd:10 = Congestion Window in MSS units
#   ssthresh:256 = Slow Start Threshold
#   bytes_sent = total bytes sent on this connection
#   bytes_acked = total bytes acknowledged (confirmed delivered)
#   bytes_received = total bytes received
#   segs_out / segs_in = segment counts
#   data_segs_out = actual data segments (not pure ACKs)
#   send XXMbps = calculated current send rate
#   rcv_space = helper variable for TCP receive buffer auto-tuning (not the actual allocated rcvbuf)
#   snd_wnd = send window (receiver's advertised window)
#   retrans:N/M = current retransmit counter / total retransmissions
```

## Diagnosing with ss

```bash
# Check RTT for all connections (high RTT = distant hosts or congestion)
ss -tin state established | grep -oP 'rtt:\K[\d.]+'
# Values over 100ms: may need buffer tuning
# Values over 500ms: satellite or very distant connection

# Check retransmission rates
ss -tin state established | grep -oP 'retrans:\K[0-9]+/[0-9]+'
# Format: current/total
# Non-zero = retransmissions occurring

# Check congestion window
ss -tin state established | grep -oP 'cwnd:\K[0-9]+'
# Low values (< 10) during sustained transfer = CWND being reduced (congestion)

# Check window size (receiver's buffer)
ss -tin state established | grep -oP 'snd_wnd:\K[0-9]+'
# Very low values = receiver's buffer is limiting throughput
```

## Performance Analysis Script

```bash
#!/bin/bash
# Comprehensive TCP performance analysis using ss

TARGET=${1:-""}  # Optional: filter by destination host

if [ -n "$TARGET" ]; then
    FILTER="( dst $TARGET )"
else
    FILTER=""
fi

echo "=== TCP Connection Performance Analysis ==="
echo ""

# Get all connection details
while IFS= read -r line; do
    if [[ "$line" =~ ^tcp ]]; then
        echo "Connection: $line"
    fi

    # Extract and display key metrics
    if [[ "$line" =~ rtt:([0-9.]+)/([0-9.]+) ]]; then
        RTT="${BASH_REMATCH[1]}"
        VAR="${BASH_REMATCH[2]}"
        [[ $(echo "$RTT > 100" | bc) -eq 1 ]] && echo "  ⚠ High RTT: ${RTT}ms (variance: ${VAR}ms)"
    fi

    if [[ "$line" =~ cwnd:([0-9]+) ]]; then
        CWND="${BASH_REMATCH[1]}"
        [[ $CWND -lt 5 ]] && echo "  ⚠ Small CWND: ${CWND} MSS (congestion?)"
    fi

    if [[ "$line" =~ retrans:([0-9]+)/([0-9]+) ]]; then
        CURRENT="${BASH_REMATCH[1]}"
        TOTAL="${BASH_REMATCH[2]}"
        [[ $TOTAL -gt 0 ]] && echo "  ⚠ Retransmissions: ${CURRENT}/${TOTAL}"
    fi

done < <(ss -tin state established $FILTER 2>/dev/null)
```

## Filtering Specific Connections

```bash
# Filter by destination IP
ss -tin state established "( dst 10.20.0.5 )"

# Filter by destination port
ss -tin state established "( dport = :8080 )"

# Filter by source port
ss -tin state established "( sport = :443 )"

# Filter by state
ss -tin state syn-recv   # Half-open connections
ss -tin state close-wait  # Stuck connections (app bug)
ss -tin state time-wait | wc -l  # TIME_WAIT count
```

## Conclusion

`ss -tin` provides a no-overhead, real-time view of TCP connection internals for every connection on the system. RTT values confirm network latency; non-zero retransmit counters indicate loss; small CWND with active transfers indicates congestion. Combined with the performance analysis script, it provides immediate diagnostic value without needing to start a packet capture.
