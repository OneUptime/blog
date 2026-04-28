# How to Use mtr (My Traceroute) for Advanced Path Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mtr, Traceroute, Networking, Troubleshooting, IPv4, Linux

Description: Use mtr to continuously monitor the network path to a destination, identify packet loss and latency issues at each hop, and distinguish transient from persistent problems.

## Introduction

MTR (My Traceroute) combines traceroute and ping into a continuous monitoring tool. Where traceroute shows the path at one moment in time, MTR repeatedly probes each hop and calculates statistics - loss percentage, average RTT, jitter - for each router on the path. This makes it far more effective at catching intermittent problems.

## Installation and Basic Usage

```bash
# Install MTR

apt install mtr-tiny   # Debian/Ubuntu
yum install mtr        # RHEL/CentOS

# Interactive mode (default): live updating display
mtr 8.8.8.8

# Report mode: run N cycles and print summary
mtr --report --report-cycles 20 8.8.8.8

# Numeric output: skip reverse DNS lookups (faster)
mtr -n --report 8.8.8.8
```

## Reading MTR Report Output

```text
HOST: myserver            Loss%  Snt  Last  Avg  Best  Wrst StDev
  1. 192.168.1.1           0.0%   20   1.2  1.1   0.9   1.5   0.2
  2. 203.0.113.1            0.0%   20   5.4  5.3   5.1   5.9   0.2
  3. ???                   100.0%  20   0.0  0.0   0.0   0.0   0.0  <- ICMP filtered
  4. 142.250.0.1            0.0%   20   12.3 12.1  11.9  12.8  0.3
  5. 8.8.8.8                0.0%   20   12.5 12.4  12.1  12.9  0.3
```

Fields:
- **Loss%**: Percentage of probes with no response
- **Snt**: Total probes sent
- **Last/Avg/Best/Wrst**: RTT statistics in ms
- **StDev**: Jitter (standard deviation of RTT)

## Interpreting Loss Patterns

```bash
# Pattern 1: Loss at one hop, then 0% at all subsequent hops
# -> ICMP filtering at that hop (benign, traffic still flows)

# Pattern 2: Loss at hop N, same % at all subsequent hops
# -> Real packet loss AT hop N or just before
# The loss originates at hop N and cascades downstream

# Pattern 3: Increasing StDev at a hop
# -> Congestion causing variable queuing delay at that router

# Quick check: if destination shows 0% loss, the path is functionally OK
# regardless of asterisks at intermediate hops
```

## Advanced MTR Options

```bash
# Use TCP SYN probes (passes through most firewalls)
mtr --tcp --port 443 --report 8.8.8.8

# Use UDP probes (ICMP ECHO is the default; --udp can give a different view)
mtr --udp --report 8.8.8.8

# Set probe interval (default 1 second)
mtr --interval 0.5 --report-cycles 100 8.8.8.8

# Set packet size for MTU testing
mtr --psize 1400 --report 8.8.8.8

# Show AS numbers for each hop (requires internet connectivity)
mtr --aslookup --report 8.8.8.8
```

## Comparing MTR in Both Directions

```bash
# Run MTR from both ends to diagnose asymmetric issues
# From host A:
mtr --report -n 10.20.0.5

# From host B (run simultaneously):
mtr --report -n 192.168.1.10

# If loss is asymmetric (A->B fine, B->A lossy), problem is on return path
```

## MTR for VoIP/Real-Time Application Diagnosis

```bash
# High jitter causes audio/video problems
# Run MTR with high cycle count to detect jitter patterns
mtr --report-cycles 100 --interval 0.2 -n voip-server.example.com

# Look for StDev > 10ms at any hop - that's significant jitter
# Also watch for Wrst (worst) RTT spikes which cause audio gaps
```

## Conclusion

MTR is superior to traceroute for diagnosing intermittent problems. Its continuous probing reveals loss and latency statistics that a single traceroute snapshot would miss. Use `--report` for sharable output, `--tcp` for firewall-friendly probes, and run from both endpoints to diagnose asymmetric path issues. MTR output is the standard format for reporting network path problems to ISPs.
