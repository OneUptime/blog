# How to Test Network Connectivity with ping, traceroute, and mtr on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Ping, Traceroute, Mtr, Troubleshooting

Description: Use ping, traceroute, and mtr effectively on Ubuntu to diagnose network connectivity issues, measure latency, and identify routing problems.

---

Network connectivity troubleshooting almost always starts with three tools: `ping`, `traceroute`, and `mtr`. Knowing how to use them effectively - and how to interpret their output - cuts diagnostic time significantly. Each tool answers a different question about what is happening between two network endpoints.

## ping - Testing Basic Reachability

`ping` sends ICMP Echo Request packets to a target and waits for ICMP Echo Reply packets. It measures round-trip time and identifies packet loss.

### Basic Usage

```bash
# Ping a hostname
ping google.com

# Ping an IP address
ping 8.8.8.8

# Stop after 5 packets (instead of running until interrupted)
ping -c 5 google.com
```

Default output:

```text
PING google.com (142.250.80.46) 56(84) bytes of data.
64 bytes from lax17s56-in-f14.1e100.net (142.250.80.46): icmp_seq=1 ttl=115 time=12.4 ms
64 bytes from lax17s56-in-f14.1e100.net (142.250.80.46): icmp_seq=2 ttl=115 time=12.1 ms
64 bytes from lax17s56-in-f14.1e100.net (142.250.80.46): icmp_seq=3 ttl=115 time=12.3 ms
^C
--- google.com ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 12.059/12.268/12.398/0.145 ms
```

Key fields:
- `icmp_seq` - sequence number. Gaps indicate lost packets.
- `ttl` - Time to Live value in the response. Decrements at each router hop.
- `time` - round-trip time in milliseconds

### Useful ping Options

```bash
# Set packet size (useful for testing MTU)
ping -s 1400 google.com

# Set the interval between packets (default 1 second)
ping -i 0.2 google.com       # Faster pings (200ms interval)
ping -i 5 google.com         # Slower pings (5 second interval)

# Set the TTL (number of hops before packet is dropped)
ping -t 5 google.com         # Only reaches hosts 5 hops away

# Flood ping (requires root - sends as fast as possible)
sudo ping -f google.com

# Specify source interface
ping -I eth0 google.com

# Quiet output - only show summary at the end
ping -q -c 100 google.com

# Audible bell on each received packet
ping -a google.com

# IPv4 only (useful when IPv6 is the default)
ping -4 google.com

# IPv6 only
ping -6 ipv6.google.com
```

### Interpreting ping Results

**0% packet loss, low consistent latency** - healthy connection.

**0% packet loss, variable latency** - possible congestion or bufferbloat.

**Some packet loss** - may indicate congestion, a failing link, or a firewall rate-limiting ICMP. Note that some hosts deliberately rate-limit or drop ICMP, so packet loss to a single hop does not necessarily mean the path is broken.

**100% packet loss** - either the host is unreachable, the host blocks ICMP, or there is a routing problem.

```bash
# Test if ICMP is being blocked (try TCP instead)
# If ping fails but curl succeeds, ICMP is being filtered
curl -I https://google.com
```

## traceroute - Mapping the Network Path

`traceroute` discovers the routing path to a destination by sending packets with incrementing TTL values. Each router decrements the TTL; when it reaches 0, the router sends back an ICMP Time Exceeded message, revealing its address.

```bash
# Install if not present
sudo apt install traceroute

# Basic traceroute
traceroute google.com
```

Output:

```text
traceroute to google.com (142.250.80.46), 30 hops max, 60 byte packets
 1  192.168.1.1 (192.168.1.1)  1.234 ms  1.089 ms  0.987 ms
 2  10.0.0.1 (10.0.0.1)  5.432 ms  5.298 ms  5.187 ms
 3  * * *
 4  72.14.232.1 (72.14.232.1)  15.234 ms  14.987 ms  15.012 ms
 5  142.250.80.46 (142.250.80.46)  12.456 ms  12.234 ms  12.198 ms
```

Each line represents one hop. The three time values are three separate probe packets to that hop.

`* * *` means that hop did not respond - the router may drop TTL-exceeded messages but still forward traffic. Do not assume this hop is the problem.

### traceroute Options

```bash
# Use TCP instead of UDP (better at crossing firewalls)
sudo traceroute -T -p 443 google.com

# Use ICMP instead of UDP
traceroute -I google.com

# Set maximum hops (default 30)
traceroute -m 20 google.com

# Do not resolve hostnames (faster output)
traceroute -n google.com

# Set wait time for responses (default 5 seconds)
traceroute -w 2 google.com

# Specify source interface
traceroute -i eth0 google.com

# IPv6 traceroute
traceroute6 ipv6.google.com
# or
traceroute -6 google.com
```

### tracepath as an Alternative

`tracepath` does not require root and is available by default:

```bash
# tracepath works without root and shows MTU at each hop
tracepath google.com
```

## mtr - Combining ping and traceroute

`mtr` (Matt's Traceroute) combines ping and traceroute into a single continuously-updating display. It is the most useful tool for characterizing a network path over time, since it shows per-hop packet loss and latency statistics accumulated over many probes.

```bash
# Install mtr
sudo apt install mtr

# Run interactive mtr (updates in real time)
mtr google.com

# Run for a fixed number of cycles and exit
mtr -c 100 --report google.com
```

### mtr Report Output

```bash
mtr --report -c 50 google.com
```

```text
Start: 2026-03-02T10:00:00+0000
HOST: ubuntu-server              Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 192.168.1.1               0.0%    50    0.9   1.0   0.8   1.5   0.2
  2.|-- 10.0.0.1                  0.0%    50    5.2   5.3   4.9   6.1   0.3
  3.|-- 72.14.203.65              0.0%    50   12.1  12.3  11.8  13.2   0.3
  4.|-- 108.170.234.81            0.0%    50   11.9  12.0  11.7  12.8   0.2
  5.|-- 142.250.80.46             0.0%    50   12.2  12.1  11.9  12.6   0.1
```

Columns:
- **Loss%** - percentage of packets lost at that hop
- **Snt** - number of probes sent
- **Last** - last round-trip time
- **Avg** - average round-trip time
- **Best** - minimum round-trip time seen
- **Wrst** - maximum round-trip time seen
- **StDev** - standard deviation of latency (high = jitter)

### Interpreting mtr Output

**High loss at an intermediate hop, no loss at later hops** - that router rate-limits ICMP responses. Not a real problem; traffic is passing through fine.

**Loss starting at a hop and continuing through the rest** - the problem is at or before that hop.

**Low loss at all hops but high loss at the destination** - the destination host is rate-limiting or dropping some probes.

**Rising latency after a specific hop** - congestion at or after that point in the path.

**High StDev (jitter) at a hop** - inconsistent performance. Can indicate congestion or a QoS policy at that hop.

### mtr Options

```bash
# TCP mode (port 443) - better against firewalls
sudo mtr -T -P 443 google.com

# ICMP mode instead of UDP
mtr -I google.com

# No hostname resolution (faster, cleaner output)
mtr -n google.com

# Show both IP and hostname
mtr -b google.com

# Set probe interval (default 1 second)
mtr -i 0.5 google.com

# Wider report with more statistics
mtr --report --report-wide -c 100 google.com

# IPv6
mtr -6 ipv6.google.com
```

## Practical Diagnostic Workflow

When troubleshooting a connectivity problem, work through these steps:

```bash
# Step 1: Check local interface and routing
ip addr show
ip route show
# Is the interface up? Does a default route exist?

# Step 2: Ping the local gateway
ping -c 5 192.168.1.1
# If this fails, the problem is local (interface, cable, switch)

# Step 3: Ping a known external IP (bypass DNS)
ping -c 5 8.8.8.8
# If gateway succeeds but 8.8.8.8 fails, problem is upstream from your router

# Step 4: Ping using a hostname
ping -c 5 google.com
# If IP works but hostname fails, the problem is DNS

# Step 5: Trace the path to the failing destination
mtr --report -c 20 destination.example.com
# Look for loss% and latency spikes
```

## Capturing Results for Reports

When working with ISPs or for incident documentation:

```bash
# Capture mtr report to a file
mtr --report -c 100 google.com | tee /tmp/mtr-report.txt

# Add timestamps to ping output
ping google.com | while read line; do echo "$(date '+%H:%M:%S') $line"; done

# Run ping for 5 minutes and capture summary
ping -c 300 -i 1 google.com > /tmp/ping-test.txt 2>&1
```

These three tools - `ping`, `traceroute`, and `mtr` - cover most network diagnostic scenarios. `mtr` in particular is worth becoming proficient with because it gives you statistically meaningful data across the full network path, which is far more actionable than a handful of traceroute hops.
