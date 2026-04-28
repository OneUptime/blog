# How to Use MTR for Continuous Traceroute Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mtr, Traceroute, Linux, Networking, Monitoring, Latency

Description: Use MTR (My TraceRoute) to combine ping and traceroute into continuous monitoring that reveals packet loss and latency at every hop, not just the destination.

MTR combines the hop discovery of traceroute with the continuous measurement of ping. It updates in real time, showing loss and latency statistics for every hop simultaneously - making it far more powerful for detecting intermittent problems.

## Install MTR

```bash
# Debian/Ubuntu

sudo apt install mtr-tiny -y

# RHEL/CentOS
sudo yum install mtr -y

# macOS
brew install mtr
```

## Basic Interactive Mode

```bash
# Run MTR interactively (Ctrl+C to quit)
sudo mtr 8.8.8.8

# Numeric output (no DNS lookups - faster)
sudo mtr -n 8.8.8.8
```

## Reading MTR Output

```text
                             My traceroute  [v0.95]
Keys:  Help   Display mode   Restart statistics   Order of fields   quit
                                     Packets               Pings
 Host                              Loss%   Snt  Last   Avg  Best  Wrst StDev
 1. 192.168.1.1                     0.0%    50   1.1   1.2   1.0   2.1   0.2
 2. 10.1.0.1                        0.0%    50   8.3   8.4   7.9   9.1   0.3
 3. 72.14.0.1                       5.0%    50  12.5  13.1  11.8  45.2   4.1
 4. 8.8.8.8                         0.0%    50  12.8  13.0  12.1  14.2   0.5

Columns:
  Loss%  - Packet loss percentage (any > 0% is worth investigating)
  Snt    - Packets sent
  Last   - Last RTT in milliseconds
  Avg    - Mean RTT
  Best   - Minimum RTT (theoretical link latency)
  Wrst   - Maximum RTT (worst case)
  StDev  - Jitter (higher = less consistent = more congested)
```

## Generate a Report

For sharing or logging, use report mode:

```bash
# Run 100 cycles and generate a text report
sudo mtr --report --report-cycles=100 -n 8.8.8.8

# Include both hostnames and IPs
sudo mtr --report --report-cycles=50 --show-ips 8.8.8.8

# Save to a file
sudo mtr --report --report-cycles=100 -n 8.8.8.8 > /tmp/mtr-report.txt
```

## MTR in Report Mode Output

```text
Start: 2026-03-19T10:00:00+0000
HOST: myserver              Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 192.168.1.1          0.0%   100    1.1   1.2   1.0   2.0   0.2
  2.|-- 10.1.0.1             0.0%   100    8.3   8.4   7.9   9.5   0.4
  3.|-- 72.14.0.1            2.0%   100   12.5  13.8  11.8  82.1   6.4
  4.|-- 8.8.8.8              0.0%   100   12.8  13.0  12.1  14.2   0.5
```

## Diagnosing Specific Patterns

```bash
# Pattern 1: Loss at intermediate hop but NOT at destination
# → Router deprioritizes ICMP, not a real problem
# Hop 3: 5% loss, Hop 4: 0% loss = hop 3 is fine

# Pattern 2: Loss at hop X and all subsequent hops
# → Real packet loss starting at hop X
# Hop 3: 5% loss, Hop 4: 5% loss = bottleneck at hop 3

# Pattern 3: High StDev at one hop
# → Congestion or jitter on that link
# Hop 2: StDev 15ms = high jitter on ISP edge link

# Pattern 4: High Wrst but normal Avg
# → Occasional burst loss or congestion (bufferbloat)
# Hop 3: Avg 12ms but Wrst 500ms = bufferbloat
```

## Useful MTR Options

```bash
# TCP mode (bypass ICMP/UDP firewalls)
sudo mtr -T -P 80 8.8.8.8     # TCP SYN to port 80

# UDP mode
sudo mtr -u 8.8.8.8

# Limit max hops
sudo mtr -m 20 8.8.8.8

# Set packet size (for MTU testing)
sudo mtr -s 1400 8.8.8.8

# Set interval (seconds between probes)
sudo mtr -i 0.5 8.8.8.8

# Set DSCP/TOS bits (test QoS handling)
sudo mtr --tos 184 8.8.8.8   # TOS 0xB8 = DSCP EF (expedited forwarding)
```

MTR is the single best tool for diagnosing intermittent network problems - by continuously measuring every hop simultaneously, it catches transient issues that a single traceroute would miss.
