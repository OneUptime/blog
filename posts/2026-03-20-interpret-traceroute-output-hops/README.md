# How to Interpret Traceroute Output (Hops, Latency, Asterisks)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, Networking, IPv4, Diagnostic, Latency, Linux

Description: Understand every element of traceroute output including hop numbers, IP addresses, latency values, and what asterisks mean for network troubleshooting.

Raw traceroute output is cryptic until you know how to read it. Each line tells a specific story about the network between you and the destination.

## Full Traceroute Output Example

```bash
traceroute -n 8.8.8.8

traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets
 1  192.168.1.1     1.2 ms   1.1 ms   1.0 ms
 2  10.10.0.1       8.3 ms   8.5 ms   8.1 ms
 3  172.16.1.254    9.1 ms   8.8 ms   9.3 ms
 4  * * *
 5  209.85.250.25  12.2 ms  12.5 ms  12.1 ms
 6  8.8.8.8        12.8 ms  12.7 ms  12.9 ms
```

## Understanding Hop Numbers

```nginx
Hop 1 - Your default gateway (local router)
         Latency is usually < 5ms on LAN
         If > 10ms: potential LAN congestion or WiFi issues

Hop 2+ - ISP or upstream routers
          End-to-end latency usually trends upward overall, but per-hop RTTs can vary

Last hop - The destination
            If missing → destination or a firewall may not return traceroute replies
```

## Understanding Latency Values (Three per Hop)

```bash
# Format: hop_num  ip_address  rtt1  rtt2  rtt3

  3  172.16.1.254    9.1 ms   8.8 ms   9.3 ms

# Three round-trip measurements for reliability
# All similar → stable link
# Wide variance (9ms, 50ms, 10ms) → congestion or ICMP deprioritization

# Latency does not need to increase monotonically.
# Look for jumps that persist in later hops:
# hop 1:  1ms  → OK
# hop 2:  8ms  → OK (+7ms across ISP link)
# hop 3: 12ms  → OK (+4ms)
# hop 4: 150ms → investigate if later hops stay near 150ms too
```

## What Asterisks Mean

```bash
 4  * * *

# Three asterisks = no response received within timeout

# Possible causes:
# 1. Router rate-limits ICMP TTL Exceeded responses (most common)
#    → Not a real problem - packets still pass through
# 2. Router or firewall filters traceroute replies
# 3. Router is very congested
# 4. Actual routing or reachability problem beyond this hop

# KEY INSIGHT: If hop 4 shows *** but hop 5 replies normally,
# the path is still progressing past hop 4.
# Only worry if the loss continues to the destination or matches a real connectivity problem.
```

## Interpreting Latency Patterns

```bash
# Good path - gradual latency increase:
 1  192.168.1.1      1ms
 2  10.1.0.1         8ms    +7ms (ISP edge)
 3  72.14.0.1       12ms    +4ms (ISP transit)
 4  8.8.8.8         13ms    +1ms (Google edge)

# Bad path - sudden latency spike that persists:
 1  192.168.1.1      1ms
 2  10.1.0.1         8ms
 3  209.0.0.1      180ms  ← investigate around this hop if later hops stay high
 4  8.8.8.8        181ms    persistent increase suggests an issue before or at hop 3

# Route that gets longer then shorter (MPLS or asymmetric routing):
 3  72.14.0.1      12ms
 4  72.14.1.50     10ms  ← lower latency is normal with MPLS shortcuts
```

## Diagnosing "All Stars" (No Response at All)

```bash
traceroute -n 10.50.0.1
 1  192.168.1.1   1ms
 2  10.1.0.1      8ms
 3  * * *
 4  * * *
 (stops here)

# Stars where traceroute terminates can mean filtering or a routing problem
# From this output alone, you can't prove hop 2 has no route to 10.50.0.1
# Fix: check routing tables, firewall policy, and another reachability test
```

## Tips for Better Output

```bash
# -w sets the max wait time for a probe response (default 5s on Linux traceroute)
traceroute -w 1 -n 8.8.8.8    # Faster output, caps wait sooner

# -q sets number of probes per hop (default 3)
traceroute -q 1 -n 8.8.8.8    # Only 1 probe per hop - faster

# -I uses ICMP Echo instead of the default UDP probes
sudo traceroute -I -n 8.8.8.8
```

The real skill in reading traceroute is distinguishing between "this router doesn't respond to probes" (often harmless stars) and "the path stops making progress" (which can indicate filtering or a routing problem).
