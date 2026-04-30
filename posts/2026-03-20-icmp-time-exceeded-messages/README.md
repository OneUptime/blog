# How to Understand ICMP Time Exceeded Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Networking, Traceroute, IPv4, TTL, Troubleshooting

Description: Understand ICMP Type 11 Time Exceeded messages, how they enable traceroute to work, and what they reveal about routing loops and fragmentation problems.

## Introduction

ICMP Time Exceeded (Type 11) is generated when a router decrements a packet's TTL to zero in transit, or when a host cannot complete fragment reassembly before its timer expires. TTL is the built-in anti-loop mechanism that prevents packets from circulating forever. The Time Exceeded message includes the original packet's IP header and the first 64 bits of payload, giving the source enough information to identify the problem. Traceroute exploits this mechanism deliberately.

## ICMP Type 11 Codes

| Code | Name | When Generated |
|---|---|---|
| 0 | TTL Exceeded in Transit | Router decrements TTL to 0 |
| 1 | Fragment Reassembly Time Exceeded | Destination can't reassemble all fragments in time |

## How Traceroute Uses TTL Exceeded

```bash
# Traditional UDP traceroute sends probes with TTL=1, 2, 3, etc.

# Each router sends back ICMP Type 11 Code 0 when it decrements TTL to 0
# In classic UDP traceroute, the final destination usually replies with ICMP port unreachable instead
# This reveals each hop's IP address and RTT

# Capture traceroute UDP probes plus ICMP replies
tcpdump -i eth0 -n '((icmp[0] = 11) or (icmp[0] = 3 and icmp[1] = 3)) or (udp dst portrange 33434-33534)'
```

## Capturing Time Exceeded Messages

```bash
# Watch for TTL exceeded messages in real time
tcpdump -i eth0 -n -v 'icmp[0] = 11 and icmp[1] = 0'

# Example output:
# IP 10.0.0.1 > 192.168.1.10: ICMP time exceeded in-transit
# -> Router 10.0.0.1 discarded our probe because TTL hit 0 there
```

## Using TTL to Detect Routing Loops

```bash
# If traceroute shows the same IP repeating across adjacent hops, it can indicate a routing loop
traceroute -n 10.20.0.5

# Example loop:
# 3  10.0.0.1  2.3 ms
# 4  10.0.1.1  2.8 ms
# 5  10.0.0.1  2.4 ms   <- loop!
# 6  10.0.1.1  2.9 ms
# ...

# Detect repeated hop IPs in traceroute output
traceroute -n 10.20.0.5 | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort | uniq -d
# Repeated IPs are a clue to investigate, but load balancing can also cause duplicates
```

## Fragment Reassembly Timeout (Code 1)

Code 1 is generated when a destination receives some fragments of a packet but not all, and the reassembly timer expires (RFC 1122 recommends a fixed timeout between 60 and 120 seconds):

```bash
# Monitor for fragment reassembly failures
tcpdump -i eth0 -n 'icmp[0] = 11 and icmp[1] = 1'

# This often appears in VPN tunnels or networks with inconsistent MTU
# Fix: reduce MTU or fix PMTUD so fragmentation is avoided
```

## TTL Values and Network Distance

```bash
# Common starting TTLs include 64, 128, and 255, depending on the OS or device
# The received TTL estimates hops on the return path only if you know the sender's initial TTL

ping -c 4 8.8.8.8 | grep ttl
# ttl=118 -> 128 - 118 = 10 hops away (Windows starting TTL)
# ttl=54  -> 64 - 54 = 10 hops away (Linux starting TTL)

# Set custom TTL to trace a specific hop
ping -c 1 -t 3 8.8.8.8
# If the packet expires there, you'll get ICMP Time Exceeded from the router at that hop
```

## Conclusion

ICMP Time Exceeded messages are the backbone of traceroute functionality and a signal of routing problems. Code 0 (TTL in transit) is expected during traceroute and can indicate a routing loop when the same router appears repeatedly. Code 1 (fragment reassembly) signals MTU or fragmentation problems. Both types deserve attention in packet captures as they point directly to infrastructure issues.
