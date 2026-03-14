# How to Diagnose Packet Loss with mtr on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Troubleshooting, Mtr, Network Diagnostics

Description: Practical guide to using mtr on Ubuntu to diagnose network packet loss and latency, including how to read mtr output, identify problem hops, and interpret common patterns.

---

When users report slow connections or intermittent drops, the first question is always "where in the network is the problem?" Ping confirms there is a problem but does not tell you where. Traceroute maps the path but only takes a single snapshot. `mtr` (Matt's Traceroute) combines both and runs continuously, showing packet loss statistics at every hop in real time.

## Installing mtr

```bash
# Install mtr
sudo apt-get update
sudo apt-get install -y mtr-tiny

# Or install the full version with GUI
sudo apt-get install -y mtr

# Verify installation
mtr --version
```

## Basic Usage

```bash
# Basic interactive mode - launches a curses-based live view
mtr google.com

# Report mode - runs 100 cycles and prints a summary
mtr --report google.com

# Shorter version
mtr -r google.com

# Specify number of ping cycles (default is 10 in report mode)
mtr -r -c 100 google.com

# Use numeric IPs instead of hostnames (faster, avoids DNS timeouts)
mtr -n google.com
mtr -r -n -c 100 google.com
```

## Reading mtr Output

The report output looks like this:

```text
Start: 2026-03-02T10:15:00+0000
HOST: server                      Loss%   Snt   Last   Avg  Best  Wrst StDev
  1.|-- 192.168.1.1               0.0%    100    1.2   1.3   1.0   2.1   0.2
  2.|-- 10.0.0.1                  0.0%    100    8.4   8.6   7.9  12.3   0.5
  3.|-- 203.0.113.1               0.0%    100   12.1  12.4  11.8  14.2   0.4
  4.|-- 198.51.100.2              5.0%    100   15.2  15.8  14.9  45.2   3.1
  5.|-- 198.51.100.5             85.0%    100   89.2  91.3  85.1 120.4  12.2
  6.|-- 142.250.217.46            0.0%    100   16.8  17.1  16.5  19.3   0.5
```

### Column Definitions

- **Loss%**: Percentage of packets dropped at this hop
- **Snt**: Number of packets sent
- **Last**: Latency of the most recent packet (milliseconds)
- **Avg**: Average latency across all packets
- **Best**: Lowest latency observed
**Wrst**: Highest latency observed
- **StDev**: Standard deviation - high values indicate inconsistent latency (jitter)

## Interpreting Common Patterns

### Normal Output

Every hop shows 0.0% loss and latency increases incrementally as packets travel further. Minor latency spikes (Wrst much higher than Avg) are normal.

### Loss That Stops at an Intermediate Hop

```text
  3.|-- 10.4.5.1                  0.0%    100   12.1  12.4  11.8  14.2   0.4
  4.|-- 203.0.113.2              50.0%    100   15.2  15.8  14.9  45.2   3.1
  5.|-- 198.51.100.5              0.0%    100   17.3  17.5  16.8  20.1   0.5
  6.|-- 142.250.80.10             0.0%    100   18.1  18.4  17.9  21.3   0.4
```

Hop 4 shows 50% loss, but all subsequent hops show 0% loss. This is a **false positive**. The router at hop 4 rate-limits or deprioritizes ICMP traffic (the packets mtr uses). Since traffic flows fine past that hop (as evidenced by normal latency to the destination), the "loss" at hop 4 is the router's policy, not actual packet loss.

**Rule**: If hops after the "losing" hop show normal results, the problem is at the router's ICMP policy, not real packet loss.

### Real Packet Loss at a Specific Hop

```text
  3.|-- 10.4.5.1                  0.0%    100   12.1  12.4  11.8  14.2   0.4
  4.|-- 203.0.113.2              50.0%    100   15.2  15.8  14.9  45.2   3.1
  5.|-- 198.51.100.5             50.0%    100   45.3  48.1  42.2  80.1  11.3
  6.|-- 142.250.80.10            50.0%    100   47.8  50.2  44.1  85.3  12.1
```

Here, loss at hop 4 **propagates** through all subsequent hops at the same rate. This is real packet loss at hop 4. The problem is the link between hop 3 and hop 4.

**Rule**: If loss appears at a hop and all subsequent hops show similar loss percentages, the problem is at or before the first hop showing loss.

### High Latency at One Hop

```text
  4.|-- 203.0.113.2               0.0%    100   150.2  155.8  149.1  200.4  11.2
  5.|-- 198.51.100.5              0.0%    100   153.5  158.2  151.8  205.1  12.3
```

Suddenly high latency at hop 4 that persists to the destination indicates congestion or a slow link at hop 4. If the high latency disappears in subsequent hops (hop 5 shows normal latency), it is likely that router's ICMP priority again.

## Advanced mtr Options

### TCP Mode

ICMP packets are sometimes blocked or rate-limited differently than TCP. Using TCP mode tests the actual protocol:

```bash
# Test using TCP (default to port 80)
sudo mtr --tcp google.com

# Specify a custom port
sudo mtr --tcp --port 443 google.com

# Test UDP instead
sudo mtr --udp google.com
```

### IPv4/IPv6 Selection

```bash
# Force IPv4
mtr -4 google.com

# Force IPv6
mtr -6 google.com

# Report which protocol is being used
mtr -r -4 -n -c 50 google.com
```

### Output Formats for Automation

```bash
# CSV output (useful for scripting)
mtr -r --csv google.com

# JSON output
mtr -r --json google.com | python3 -m json.tool

# Export to a file for documentation
mtr -r -n -c 100 google.com > /tmp/mtr-report-$(date +%F).txt
```

## Diagnosing Specific Problems

### Testing a Problematic Application Connection

When users report issues with a specific service, test the exact path to that server:

```bash
# Test to a specific server IP
mtr -r -n -c 50 10.20.30.40

# Test to an application's hostname with TCP (tests the actual port)
sudo mtr -r --tcp --port 443 -n -c 50 app.company.com
```

### Bidirectional Path Testing

Routing is not always symmetric. Traffic to a destination may take a completely different path than traffic from it. If users report latency from an external server to yours:

```bash
# From your server to the remote
mtr -r remote-server.com

# You also need someone at the remote to run mtr toward you
# Or use a service like mtr-report.com or Cloudflare's debug page
```

### Comparing Two Paths

When you have multiple network paths (failover routes or load balancing):

```bash
# Run mtr to the same destination from different source IPs
# On a multi-homed server
mtr -r -n --address 192.168.1.10 destination.com
mtr -r -n --address 192.168.1.11 destination.com

# Compare the outputs for differences in path and latency
```

### Testing Internal Network Hops

For internal network problems:

```bash
# Test to a server in the same datacenter
mtr -r -n -c 100 10.0.0.50

# Test to a server in another datacenter over a leased line
mtr -r -n -c 100 10.100.0.50

# The number of hops and latency reveals the path complexity
```

## Running mtr Without Interactivity

For scripted monitoring or collecting reports:

```bash
# Collect a report and save it with timestamp
mtr -r -n -c 100 8.8.8.8 | tee /var/log/mtr-$(date +%F-%H%M).txt

# Run continuously in background, saving reports every 5 minutes
while true; do
    mtr -r -n -c 50 8.8.8.8 >> /var/log/mtr-continuous.log
    sleep 300
done &
```

## Common Scenarios and Their Solutions

### Packet Loss to a CDN Edge Node

```bash
mtr -r -n cdn.example.com
```

If loss appears only at the last hop (the CDN), the CDN node itself may be congested or having issues. Contact the CDN provider with the mtr output showing the last-hop loss.

### ISP Link Congestion

If you see increasing latency and loss in the middle of the path (typically hops 3-8), you are looking at ISP backbone congestion. Peak hours (evenings) often show this. Document with timestamps and report to your upstream ISP with the mtr output.

### Local Network Issues

If the very first hop (your default gateway, typically a router at hop 1) shows loss or high latency:

```bash
# Check your local network health
ping -c 100 $(ip route | grep default | awk '{print $3}')

# Check for packet loss on the interface itself
ip -s link show eth0
```

High collision or error counts on the interface often indicate a bad cable, duplex mismatch, or failing NIC.

mtr output is the single most useful piece of information you can provide when reporting network problems to an ISP or cloud provider. Save reports with timestamps and include them when opening support tickets - they make root cause identification dramatically faster.
