# How to Tune TCP Congestion Avoidance Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Congestion Avoidance, Linux, Kernel Tuning, CUBIC, Performance

Description: Tune TCP congestion avoidance parameters to improve throughput stability and recovery speed after congestion events on your network.

## Introduction

TCP congestion avoidance is the phase after slow start where the sender grows CWND linearly (one MSS per RTT) to probe for additional bandwidth without triggering congestion. Tuning congestion avoidance parameters - slow start threshold, recovery algorithms, and RTO settings - can improve how quickly TCP recovers after packet loss and how efficiently it uses available bandwidth.

## Key Congestion Avoidance Parameters

```bash
# View all TCP tuning parameters

sysctl -a | grep "^net.ipv4.tcp" | sort

# Most relevant for congestion avoidance:
sysctl net.ipv4.tcp_congestion_control   # Algorithm (cubic/bbr)
sysctl net.ipv4.tcp_sack                 # Selective ACK (improves loss recovery)
sysctl net.ipv4.tcp_dsack                # Duplicate SACK reporting
sysctl net.ipv4.tcp_reordering           # Expected packet reordering
sysctl net.ipv4.tcp_recovery             # Loss recovery method (RACK/TLP)
sysctl net.ipv4.tcp_retries1             # Retries before reporting to upper layer
sysctl net.ipv4.tcp_retries2             # Retries before giving up
sysctl net.ipv4.tcp_rto_min_us           # Minimum RTO in microseconds
```

## Enabling SACK for Better Loss Recovery

```bash
# SACK allows receiver to acknowledge non-contiguous blocks of data
# Without SACK: sender must retransmit all data after a lost segment
# With SACK: sender only retransmits the specific lost segments

sysctl net.ipv4.tcp_sack   # Should be 1 (enabled by default)

# If disabled, enable it
sysctl -w net.ipv4.tcp_sack=1
```

## Tuning RTO (Retransmission Timeout)

```bash
# RTO is calculated from RTT measurements + variance
# After any timeout, RTO doubles (exponential backoff)
# On high-latency links, default minimum RTO (200ms) may cause premature retransmits

# View current minimum RTO
sysctl net.ipv4.tcp_rto_min_us
# Default: 200000 (200ms)

# For very low-latency LAN, can reduce minimum
# (careful: too low causes spurious retransmits)
sysctl -w net.ipv4.tcp_rto_min_us=50000  # 50ms minimum

# For high-latency satellite links, may need to increase
sysctl -w net.ipv4.tcp_rto_min_us=500000  # 500ms minimum
```

## Configuring Reordering Tolerance

```bash
# TCP detects loss when it sees 3 duplicate ACKs (fast retransmit)
# But packets can arrive out of order for non-loss reasons
# tcp_reordering sets how many out-of-order segments to tolerate before assuming loss

sysctl net.ipv4.tcp_reordering
# Default: 3

# For networks known to reorder frequently (ECMP, satellites):
sysctl -w net.ipv4.tcp_reordering=6  # Tolerate more reordering before retransmit
```

## CUBIC-Specific Tuning

```bash
# CUBIC uses these parameters:
# beta: multiplicative decrease factor, scaled by 1024 (default: 717, ~0.70)
#   Lower = more aggressive reduction on congestion
#   Higher = keeps more bandwidth, but more risk

# View CUBIC parameters
cat /sys/module/tcp_cubic/parameters/beta
cat /sys/module/tcp_cubic/parameters/bic_scale

# Adjust CUBIC's recovery (writable at runtime, no module reload needed)
# Note: most production systems use defaults; only change if you have specific data
echo 717 > /sys/module/tcp_cubic/parameters/beta
```

## Retransmission Retry Limits

```bash
# tcp_retries1: retries before hard errors are reported to application layer
sysctl net.ipv4.tcp_retries1   # Default: 3

# tcp_retries2: total retries before TCP gives up and closes connection
sysctl net.ipv4.tcp_retries2   # Default: 15 (about 15 minutes total)

# For fast failure detection in microservices, reduce retries2:
sysctl -w net.ipv4.tcp_retries2=5  # Fail after ~3-5 minutes instead of 15
# Adjust based on your SLA and expected recovery time
```

## Comprehensive Congestion Tuning

```bash
# Production-ready congestion avoidance tuning
cat > /etc/sysctl.d/40-tcp-congestion.conf << EOF
# Congestion control
net.ipv4.tcp_congestion_control=bbr
net.core.default_qdisc=fq

# Loss recovery improvements
net.ipv4.tcp_sack=1
net.ipv4.tcp_dsack=1

# Reordering tolerance
net.ipv4.tcp_reordering=6

# Faster retransmit on unstable paths
net.ipv4.tcp_retries2=5
EOF
sysctl -p /etc/sysctl.d/40-tcp-congestion.conf
```

## Conclusion

Congestion avoidance tuning is most impactful when combined with the right congestion control algorithm. Enable SACK for efficient loss recovery, tolerate some reordering on paths with ECMP, and reduce retries2 for faster failure detection in microservice environments. For most production deployments, switching to BBR with fq qdisc provides better out-of-the-box congestion management than tuning CUBIC parameters.
