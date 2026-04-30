# How to Interpret ICMP Destination Unreachable Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Networking, IPv4, Troubleshooting, Firewall

Description: Understand the different ICMP Destination Unreachable codes and what each one tells you about why a network connection is failing.

## Introduction

ICMP Type 3 (Destination Unreachable) is sent by routers or destination hosts to indicate that a packet could not be delivered. The code field specifies the exact reason. Correctly interpreting these codes can save hours of troubleshooting by immediately pointing to the layer and type of failure.

## ICMP Type 3 Codes

| Code | Name | Sent By | Meaning |
|---|---|---|---|
| 0 | Net Unreachable | Router | No route to destination network |
| 1 | Host Unreachable | Router | Route exists but host not responding |
| 2 | Protocol Unreachable | Destination host | IP protocol not supported |
| 3 | Port Unreachable | Destination host | UDP port not listening |
| 4 | Fragmentation Needed | Router | Packet too big, DF bit set |
| 9 | Net Administratively Prohibited | Router | ACL/policy blocks network |
| 10 | Host Administratively Prohibited | Router | ACL/policy blocks host |
| 13 | Communication Administratively Prohibited | Router or firewall | Administrative filtering blocks traffic |

## Capturing and Interpreting

```bash
# Watch for all ICMP unreachable messages

tcpdump -i eth0 -n -v 'icmp[0] = 3'

# Example output:
# IP 10.0.0.1 > 192.168.1.10: ICMP 10.20.0.5 unreachable - host unreachable
# -> Router 10.0.0.1 says host 10.20.0.5 is unreachable (Code 1)

# Generate a Port Unreachable (Code 3) by sending UDP to a closed port
nc -u -z -w1 10.20.0.5 12345
# If port 12345 is not open on 10.20.0.5, it responds with Type 3 Code 3
```

## Diagnosing by Code

### Code 0 - Net Unreachable

```bash
# Symptom: router reports no route to the network
# Check the routing table on the reporting router
ip route show | grep "10.20.0"
# If nothing: add the missing route
ip route add 10.20.0.0/24 via 192.168.1.1
```

### Code 1 - Host Unreachable

```bash
# Symptom: router has a route but ARP/Layer2 resolution fails
# Check ARP table for the target host
arp -n 10.20.0.5
# If missing or incomplete, the host may be down or on a different VLAN
```

### Code 4 - Fragmentation Needed

```bash
# Symptom: PMTUD failure - packet too large, DF bit set
# The ICMP message includes the MTU of the bottleneck link
tcpdump -v 'icmp[0] = 3 and icmp[1] = 4'
# Look for: "next-hop MTU = XXXX" in verbose output
# Fix: clamp TCP MSS or reduce MTU
```

### Code 13 - Communication Prohibited

```bash
# Symptom: firewall is sending ICMP rejects rather than silently dropping
# The source of the ICMP message identifies the firewall
# Use traceroute to find which hop generates the Code 13
traceroute -I 10.20.0.5
```

## Generating Unreachables for Testing

```bash
# Generate a Code 13 (prohibited) with iptables REJECT
iptables -A INPUT -s 10.50.0.0/24 -j REJECT --reject-with icmp-admin-prohibited

# From a host in 10.50.0.0/24, trying to connect will receive Type 3 Code 13
ping -c 1 <your-server-ip>
```

## Conclusion

ICMP Destination Unreachable messages are error reports from the network itself. Each code pinpoints a specific failure: missing routes (code 0), dead hosts (code 1), wrong port/protocol (code 2/3), MTU problems (code 4), or firewall policy (code 9/10/13). Reading these messages rather than just seeing "connection failed" provides a direct path to the fix.
