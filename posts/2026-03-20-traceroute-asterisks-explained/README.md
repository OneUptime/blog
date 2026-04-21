# How to Understand Why Traceroute Shows Asterisks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traceroute, ICMP, Networking, Troubleshooting, IPv4, Firewall

Description: Understand the multiple reasons why traceroute displays asterisks instead of hop information, and how to differentiate between benign filtering and actual packet loss.

## Introduction

Asterisks (`* * *`) in traceroute output indicate that no expected response was received for those probes within the timeout period. For intermediate hops, that response is usually ICMP Time Exceeded; at the destination, it may be an ICMP Port Unreachable, ICMP Echo Reply, or TCP response depending on the traceroute mode. This is often mistaken for a routing problem, but in most cases it simply means the router at that hop does not respond to traceroute probes - while still forwarding traffic normally.

## Why Asterisks Appear

### Reason 1: ICMP Rate Limiting

Routers often rate-limit ICMP Time Exceeded messages to avoid processing overhead:

```bash
# If some probes get through and others don't, it's rate limiting

traceroute -n 8.8.8.8
# 4  * 203.0.113.1  8.4 ms  *   <- partial responses = rate limiting
```

### Reason 2: ICMP Filtering

Many routers (especially ISP core routers) suppress ICMP Time Exceeded replies, filter traceroute probe types, or don't respond:

```bash
# Consistent * * * at one hop followed by normal hops = benign filtering
traceroute -n 8.8.8.8
# 5  * * *                      <- router doesn't respond to this probe type
# 6  8.8.8.8  12.3 ms  12.2 ms  <- destination reachable!
# Conclusion: hop 5 is filtering, not a problem
```

### Reason 3: Asymmetric Routing

The return ICMP Time Exceeded reply takes a different path and never arrives:

```bash
# Use a Paris-traceroute-style tool to reduce ECMP path variation
sudo apt install dublin-traceroute
sudo dublin-traceroute 8.8.8.8
# Uses Paris traceroute techniques to enumerate ECMP flow-based paths
```

### Reason 4: Actual Packet Loss

If asterisks appear from a certain hop onward AND destination checks fail across the protocol you care about:

```bash
# Check if destination is reachable despite asterisks
traceroute -n 10.20.0.5
# ...
# 8  * * *
# 9  * * *     <- consistent failure from here onward
# ping also fails:
ping -c 5 10.20.0.5  # 100% packet loss to ICMP Echo
# This suggests actual loss or filtering; confirm with the real application protocol
```

## Differentiating Benign vs Real Loss

```bash
# Method 1: Try ICMP mode instead of UDP
traceroute -I 8.8.8.8   # ICMP Echo mode
# Some routers that filter UDP probes respond to ICMP

# Method 2: Use TCP on a likely-open port
traceroute -T -p 80 8.8.8.8   # TCP SYN on port 80
# TCP probes to an allowed port may pass through firewalls that block UDP/ICMP probes

# Method 3: Test destination reachability directly
ping -c 10 8.8.8.8
# If ping succeeds: asterisks are likely probe/reply filtering or rate limiting
# If ping fails: confirm with TCP or application tests before calling it actual loss
```

## Traceroute Timeout Tuning

```bash
# Increase timeout per probe (default 5 seconds)
traceroute -w 10 8.8.8.8

# Send more probes per hop (default 3)
traceroute -q 5 8.8.8.8

# Both together for slow or rate-limited paths
traceroute -w 10 -q 5 -n 8.8.8.8
```

## Using MTR for Better Visibility

```bash
# MTR sends repeated probes and shows loss percentage
mtr --report -n 8.8.8.8

# If a hop shows 0% loss in MTR but traceroute shows asterisks:
# -> Router responds to MTR's probe type but not traceroute's
# This points to probe/reply filtering or rate limiting, not a forwarding problem

# If a hop shows > 0% loss in MTR AND subsequent hops show same loss:
# -> Actual packet loss at or before that hop
```

## Conclusion

Asterisks in traceroute are often harmless. A router that shows `* * *` but the destination is reachable is simply not responding to the traceroute probe type or reply path - traffic still flows through it. True packet loss is more likely when asterisks continue from a hop onward and the destination also fails over the protocol you are testing. Always verify destination reachability before assuming a router with asterisks is the problem.
