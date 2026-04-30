# How to Understand ICMP Network Unreachable vs Host Unreachable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Networking, Routing, Troubleshooting, IPv4

Description: Distinguish between ICMP Network Unreachable (Code 0) and Host Unreachable (Code 1) messages to quickly identify whether a routing or host-level problem is causing connectivity failures.

## Introduction

ICMP Destination Unreachable Type 3 has two closely related codes that are often confused: Code 0 (Network Unreachable) and Code 1 (Host Unreachable). While both indicate that a destination cannot be reached, they originate at different points and diagnose different problems. Getting them right saves troubleshooting time.

## Key Differences

| | Network Unreachable (Code 0) | Host Unreachable (Code 1) |
|---|---|---|
| Sent by | Router with no route | Last-hop router |
| Meaning | No route to the destination network exists | The destination network is reachable, but the final hop cannot deliver to the host |
| Location | Anywhere along the path | The router directly connected to the target |
| Fix | Add/fix routing | Fix final-hop reachability (host down, ARP, Layer 2, etc.) |

## Generating and Capturing Both

```bash
# Watch for both codes simultaneously

tcpdump -i eth0 -n -v 'icmp[0]=3 and (icmp[1]=0 or icmp[1]=1)'

# Network Unreachable example output:
# 10.0.0.1 > 192.168.1.10: ICMP 10.20.0.0 net unreachable, length 36
# -> Router 10.0.0.1 has no route to 10.20.0.0/24

# Host Unreachable example output:
# 10.0.0.1 > 192.168.1.10: ICMP 10.20.0.5 host unreachable, length 36
# -> Router 10.0.0.1 knows the network but can't reach the specific host
```

## Diagnosing Network Unreachable

```bash
# Network Unreachable: the reporting router has no route
# Step 1: identify which router sent the ICMP (source of ICMP message)
traceroute -n 10.20.0.5

# Step 2: check that router's routing table
# (requires access to the router)
ip route show | grep "10.20.0"   # On the reporting router

# If route is missing on the reporting router:
ip route add 10.20.0.0/24 via 192.168.1.254

# Network Unreachable from the LOCAL host usually means:
# no matching route (no default route and no specific route for this destination)
ip route get 10.20.0.5
ip route show default   # Check if default route exists
```

## Diagnosing Host Unreachable

```bash
# Host Unreachable: the last-hop router has the network route but can't deliver on the final link
# Cause 1: Host is down or not reachable on the local segment
ping -c 3 10.20.0.5
ip neigh show 10.20.0.5   # On the last-hop router or a host on the same subnet

# Cause 2: neighbour/ARP entry incomplete or failed on the router
# (router knows the network but can't resolve the host's MAC)
ip neigh show 10.20.0.5
# "INCOMPLETE" or "FAILED" means neighbour resolution did not succeed
```

## Triggering Host Unreachable

```bash
# You can generate Host Unreachable from iptables REJECT
iptables -A INPUT -s 10.50.0.0/24 -j REJECT --reject-with icmp-host-unreachable

# Or generate Network Unreachable
iptables -A INPUT -s 10.50.0.0/24 -j REJECT --reject-with icmp-net-unreachable

# Test by pinging from 10.50.0.0/24
ping -c 3 <your-server-ip>
# ICMP error type varies by the --reject-with option used
```

## Quick Diagnostic Decision Tree

```text
Receiving ICMP Unreachable?
  ├── Code 0 (Network Unreachable)
  │   └── Check routing table on the router that sent the ICMP
  │       └── Add missing route to the destination network
  └── Code 1 (Host Unreachable)
      └── Check host reachability on the final hop
          ├── If host is down: fix the host
          └── If host is up: check ARP/Layer2 connectivity to the host
```

## Conclusion

Network Unreachable (Code 0) and Host Unreachable (Code 1) point to different failure points. Code 0 means the reporting router lacks a route - fix the routing configuration. Code 1 means the destination network is reachable but the final hop cannot deliver to the specific host - usually a host down, ARP failure, or Layer 2 problem on the directly connected network. The ICMP source IP tells you which device identified the problem, giving you a precise location to investigate.
