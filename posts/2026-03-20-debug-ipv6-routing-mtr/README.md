# How to Debug IPv6 Routing Issues with mtr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, mtr, Debugging, Routing, Network Monitoring

Description: Learn how to use mtr (My TraceRoute) to continuously monitor IPv6 path quality, detect packet loss, and identify latency issues.

## Overview

`mtr` combines the path discovery of traceroute with the continuous probing of ping. It provides real-time statistics for every hop on the IPv6 path, making it far more useful than a one-shot traceroute for diagnosing intermittent or load-dependent routing issues.

## Installation

```bash
# Debian/Ubuntu

sudo apt install mtr-tiny

# RHEL/Fedora
sudo dnf install mtr

# macOS (via Homebrew)
brew install mtr
```

## Basic Usage

```bash
# Run mtr against an IPv6 destination
mtr -6 2001:4860:4860::8888

# Force IPv6 for a dual-stack hostname
mtr --inet6 ipv6.google.com

# Disable DNS resolution for faster results
mtr -6 -n 2001:4860:4860::8888
```

## Understanding the mtr Output

```text
                             My traceroute [v0.95]
hostname (2001:db8::2)            2026-03-20T10:00:00+0000
Keys:  Help   Display mode   Restart statistics   Order of fields   quit
                                       Packets               Pings
 Host                            Loss%   Snt   Last   Avg  Best  Wrst StDev
 1. fe80::1                       0.0%    50    0.5    0.5   0.3   0.8   0.1
 2. 2001:db8:isp::1               0.0%    50    2.1    2.0   1.8   2.5   0.2
 3. ???                          100.0%   50    0.0    0.0   0.0   0.0   0.0
 4. 2001:db8:transit::1           0.0%    50    5.2    5.1   4.9   5.8   0.2
 5. 2607:f8b0:4004::1             0.0%    50   15.3   15.1  14.8  16.2   0.3
```

Column meanings:
- **Loss%**: Percentage of probes lost at this hop
- **Snt**: Total probes sent
- **Last**: Last RTT in milliseconds
- **Avg**: Average RTT
- **Best**: Lowest RTT seen
- **Wrst**: Highest RTT seen
- **StDev**: Standard deviation (jitter indicator)

## Interpreting Results

```text
# Hop 3 shows 100% loss but hop 4 responds → Hop 3 filters ICMP TTL-exceeded
# This is NOT a problem - it's normal ICMP rate limiting or filtering
# Only worry if Loss% first appears at a hop AND all subsequent hops also show loss

# High StDev (jitter) indicates an unstable or congested link
# Consistently high Avg at a specific hop = bottleneck

# Loss% only at the final hop = firewall at destination blocking ICMP
```

## Report Mode for Documentation

```bash
# Run for 100 cycles then generate a report (good for scripting and logs)
mtr -6 -n -r -c 100 2001:4860:4860::8888

# Save report to a file
mtr -6 -n -r -c 100 2001:4860:4860::8888 > /tmp/mtr-report.txt

# JSON output for automated processing
mtr -6 -n --json -c 50 2001:4860:4860::8888 | jq .
```

## Testing from a Specific Source Address

```bash
# Use -a to specify the source address (useful on multi-homed hosts)
mtr -6 -a 2001:db8::2 2001:4860:4860::8888
```

## Using TCP Probes (Bypassing ICMP Filters)

Some networks filter ICMPv6 but allow TCP. Use TCP SYN probes:

```bash
# Use TCP probes on port 443 (HTTPS) to bypass ICMP filtering
mtr -6 --tcp --port 443 2001:4860:4860::8888
```

## Diagnosing Intermittent Loss

```bash
# Run for 1000 cycles to catch intermittent issues
mtr -6 -n -r -c 1000 2001:4860:4860::8888

# High cycle count captures transient events that a 10-probe traceroute misses
```

## Comparing Path Quality to Multiple Destinations

```bash
# Run multiple mtr instances in parallel for A/B comparison
mtr -6 -n -r -c 50 2001:4860:4860::8888 &
mtr -6 -n -r -c 50 2620:fe::fe &
wait
```

## Summary

`mtr -6` is the definitive tool for IPv6 path quality analysis. It combines traceroute hop discovery with continuous ping statistics. Focus on the final destination's Loss% and Avg values for application impact, and look for the first hop where Loss% increases and stays high for network-layer issues. Use `-r -c 100` for script-friendly report output.
