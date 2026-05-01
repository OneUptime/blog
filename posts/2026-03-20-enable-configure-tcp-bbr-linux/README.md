# How to Enable and Configure TCP BBR on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, BBR, Linux, Congestion Control, Performance, Networking

Description: Enable TCP BBR congestion control on Linux and configure it optimally for high-bandwidth, high-latency, or lossy network links.

## Introduction

BBR (Bottleneck Bandwidth and RTT) is Google's TCP congestion control algorithm, available in Linux kernel 4.9+ when the kernel is built with BBR support. Unlike pure loss-based algorithms (CUBIC, Reno), BBR models available bandwidth and minimum path RTT to guide its sending rate. This can make it substantially more effective on long-distance or lossy links where packet loss occurs even without congestion.

## Prerequisites and Installation

```bash
# Check kernel version (BBR requires 4.9+)

uname -r
# Should show 4.9 or higher

# Verify whether BBR is already available
sysctl net.ipv4.tcp_available_congestion_control | grep bbr

# If BBR is not listed, try loading the module and check again
modprobe tcp_bbr
sysctl net.ipv4.tcp_available_congestion_control | grep bbr

# If BBR is still not listed: kernel is too old, or BBR was not enabled
# Solution: upgrade kernel or build with CONFIG_TCP_CONG_BBR=y or CONFIG_TCP_CONG_BBR=m
```

## Enabling BBR

```bash
# Enable BBR as the default congestion control
sysctl -w net.ipv4.tcp_congestion_control=bbr

# For best results, pair BBR with the fq (Fair Queue) qdisc
sysctl -w net.core.default_qdisc=fq

# Verify both settings
sysctl net.ipv4.tcp_congestion_control
# net.ipv4.tcp_congestion_control = bbr

sysctl net.core.default_qdisc
# net.core.default_qdisc = fq

# Make permanent
cat >> /etc/sysctl.conf << EOF
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
EOF
sysctl -p

# On Debian/Ubuntu, auto-load the module on boot if BBR is built as a module
echo "tcp_bbr" >> /etc/modules
```

## Why fq Helps BBR

BBR controls sending rate through pacing - sending packets at a calculated rate rather than bursting them all at once. On Linux 4.20+ BBR no longer strictly requires the `fq` qdisc to function, but `fq` remains a strong default because it implements per-flow pacing efficiently:

```bash
# Check current qdisc on each interface
tc qdisc show dev eth0

# On single-queue interfaces, apply fq manually if needed
tc qdisc replace dev eth0 root fq

# The sysctl net.core.default_qdisc=fq affects qdiscs created after the setting changes
# Physical multiqueue NICs keep mq as the root qdisc and use the default qdisc for its leaves
```

## Verifying BBR is Active

```bash
# Confirm BBR is running on active connections
ss -tin state established | grep "bbr"
# Look for a TCP info line that begins with "bbr"

# More detailed BBR statistics
ss -tin state established | head -5
# Output includes:
# the congestion control name at the start of the TCP info line
# pacing_rate shows BBR's current pacing rate

# Monitor BBR congestion window during a transfer
watch -n 0.5 'ss -tin state established | grep -E "bbr|cwnd|pacing_rate"'
```

## BBR Performance Testing

```bash
# Baseline with CUBIC
sysctl -w net.ipv4.tcp_congestion_control=cubic
iperf3 -c 10.20.0.5 -t 30
echo "CUBIC result above"

# Switch to BBR
sysctl -w net.ipv4.tcp_congestion_control=bbr
iperf3 -c 10.20.0.5 -t 30
echo "BBR result above"

# Quick egress-side simulation with tc netem
# For realistic TCP results, place netem on the receiver ingress path
tc qdisc add dev eth0 root netem delay 100ms loss 1%
iperf3 -c 10.20.0.5 -t 30   # Compare the new-connection result with BBR vs CUBIC
tc qdisc del dev eth0 root
```

## When BBR Excels vs When to Stick with CUBIC

```text
Use BBR for:
- WAN links with RTT > 50ms
- Satellite links (300-600ms RTT)
- Networks with 0.5-2% background loss
- Long-distance bulk transfers (data center to cloud, etc.)

Keep CUBIC for:
- Pure LAN (<5ms RTT, near-zero loss)
- Legacy systems that may not play well with BBR's behavior
- Environments where single-flow fairness is critical
```

## Conclusion

BBR is a widely used congestion control option for internet-facing Linux systems. Enabling it usually means setting `tcp_congestion_control=bbr`, and many deployments also pair it with `default_qdisc=fq` for pacing behavior. The largest gains tend to show up on high-latency or random-loss paths, but the exact improvement depends on the workload and network path.
