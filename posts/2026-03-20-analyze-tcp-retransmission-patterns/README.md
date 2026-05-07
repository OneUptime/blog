# How to Analyze TCP Retransmission Rates and Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Retransmission, Networking, Analysis, Wireshark, Performance

Description: Analyze TCP retransmission patterns to distinguish between fast retransmits from loss events, spurious retransmits from reordering, and timeout retransmits from severe congestion.

## Introduction

Not all TCP retransmissions are equal. Fast retransmits (classically triggered after 3 duplicate ACKs) represent mild loss quickly recovered. Spurious retransmits happen when the sender infers loss incorrectly, often because packets arrived out of order. Timeout retransmits indicate more serious loss recovery driven by the retransmission timer. Distinguishing these patterns tells you how serious the problem is and where to look.

## Types of TCP Retransmissions

| Type | Trigger | Severity | CWND Action |
|---|---|---|---|
| Fast Retransmit | 3 duplicate ACKs | Mild | Enter recovery; sending window reduced |
| SACK Retransmit | SACK blocks show missing data | Mild | Window reduced during recovery |
| Spurious Retransmit | Reordering or another false loss signal | False positive | May be undone if detected |
| Timeout Retransmit | RTO expires | Severe | CWND = 1 MSS |

## Counting Retransmission Signals in Kernel

```bash
# Get all retransmission-related counters

nstat -az | grep -iE "retrans|timeout|spurious|sack" | grep -v "^#"

# Key counters:
# TcpRetransSegs: Total retransmitted segments (all types)
# TcpExtTCPFastRetrans: Retransmitted segments sent outside the Loss state
# TcpExtTCPSlowStartRetrans: Retransmitted segments sent in the Loss state
# TcpExtTCPTimeouts: RTO expirations
# TcpExtTCPSackRecovery: Times TCP entered SACK-based recovery
# TcpExtTCPSpuriousRTOs: Spurious RTOs detected by F-RTO
# TcpExtTCPSpuriousRtxHostQueues: Retransmits avoided because data was still queued locally

# Compare fast retransmits, loss-state retransmits, and RTO expirations
nstat -asz TcpExtTCPFastRetrans TcpExtTCPSlowStartRetrans TcpExtTCPTimeouts TcpRetransSegs 2>/dev/null | awk '
/TcpExtTCPFastRetrans/ {fast=$2}
/TcpExtTCPSlowStartRetrans/ {loss=$2}
/TcpExtTCPTimeouts/ {rtos=$2}
/TcpRetransSegs/ {total=$2}
END {
    print "Fast retransmits:", fast+0
    print "Loss-state retransmits:", loss+0
    print "RTO expirations:", rtos+0
    print "Total retransmitted segments:", total+0
}'
```

## Monitoring Retransmission Rate

```bash
#!/bin/bash
# Track retransmission rate over time using absolute counters

get_counters() {
    nstat -asz TcpRetransSegs TcpExtTCPOrigDataSent 2>/dev/null | awk '
    /TcpRetransSegs/ {retrans=$2}
    /TcpExtTCPOrigDataSent/ {orig=$2}
    END {print retrans+0, orig+0}'
}

read PREV_RETRANS PREV_ORIG < <(get_counters)

while true; do
    read RETRANS ORIG < <(get_counters)

    DELTA_RETRANS=$((RETRANS - PREV_RETRANS))
    DELTA_ORIG=$((ORIG - PREV_ORIG))

    if [ "$DELTA_ORIG" -gt 0 ]; then
        RATE=$(awk -v r="$DELTA_RETRANS" -v s="$DELTA_ORIG" 'BEGIN {printf "%.2f", (r * 100) / s}')
        echo "$(date +%H:%M:%S) Retransmit rate: $RATE% ($DELTA_RETRANS/$DELTA_ORIG original data segments)"
    fi

    PREV_RETRANS=$RETRANS
    PREV_ORIG=$ORIG
    sleep 5
done
```

## Wireshark Retransmission Analysis

```text
# In Wireshark:

# Standard retransmissions
tcp.analysis.retransmission

# Suspected fast retransmits
tcp.analysis.fast_retransmission

# Suspected spurious retransmissions (data was already ACKed)
tcp.analysis.spurious_retransmission

# All retransmission-related categories
tcp.analysis.retransmission or tcp.analysis.fast_retransmission or tcp.analysis.spurious_retransmission

# View retransmit statistics:
# Statistics → TCP Stream Graphs → Time-Sequence (Stevens)
# Retransmissions appear as data points below the main line

# Expert Information shows all retransmit events:
# Analyze → Expert Information → filter by "Retransmission"
```

## Interpreting Patterns

```bash
# Pattern 1: Mostly fast retransmits (< 1% of original data segments)
# → Normal behavior, occasional loss with quick recovery
# → No action needed if throughput is acceptable

# Pattern 2: Many loss-state retransmits and rising RTO expirations
# → Severe congestion or unreliable link
# → Investigate: check interface errors, reduce traffic, check routing

# Pattern 3: Many spurious retransmits
# → Often packet reordering (ECMP, satellite, wireless)
# → On Linux senders, consider increasing tcp_reordering tolerance
sysctl -w net.ipv4.tcp_reordering=6

# Pattern 4: Periodic retransmit spikes
# → Bursty cross-traffic causing momentary congestion
# → Fix: fair queuing, traffic shaping
```

## Conclusion

TCP retransmission analysis is most useful when you classify by type rather than counting all retransmissions together. A low fast retransmit rate can be normal; persistent loss-state retransmits or rising RTO counts are more concerning. High spurious retransmit rates often indicate reordering rather than true loss - increasing `tcp_reordering` on a Linux sender can reduce unnecessary recovery. Monitor continuously with the rate script to detect when retransmissions start increasing.
