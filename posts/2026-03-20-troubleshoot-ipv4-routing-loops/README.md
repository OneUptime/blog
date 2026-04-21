# How to Troubleshoot IPv4 Routing Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Routing Loop, TTL, Traceroute, BGP, OSPF, Troubleshooting

Description: Learn how to detect and fix IPv4 routing loops where packets cycle between routers indefinitely until their TTL expires, causing connectivity failures and high CPU on routing devices.

## What Is a Routing Loop?

A routing loop occurs when Router A sends packets to Router B, which sends them back to Router A, and so on. The loop continues until the IP TTL reaches zero, at which point the packet is dropped and the source may receive an ICMP "Time Exceeded" message.

Symptoms:
- Packets never reach their destination
- Traceroute shows the same IP addresses repeating
- Routers show high CPU from processing looping packets
- `traceroute` hits 30 hops without reaching the destination

## Step 1: Detect a Routing Loop with Traceroute

```bash
# Linux

traceroute 10.20.30.1

# Windows
tracert 10.20.30.1

# If you see IPs repeating, that usually indicates a loop:
# 1  192.168.1.1   1ms
# 2  10.0.0.1      2ms
# 3  10.0.0.2      2ms
# 4  10.0.0.1      2ms   <- LOOP: back to hop 2
# 5  10.0.0.2      2ms
# ...
```

```bash
# mtr --report prints a summary of packet paths
mtr --report 10.20.30.1

# Paris-traceroute avoids ECMP path issues
paris-traceroute 10.20.30.1
```

## Step 2: Check Routing Tables on Each Router

```bash
# Cisco IOS
show ip route 10.20.30.0 255.255.255.0

# Check for static routes, floating static routes, or unexpected entries:
# S   10.20.30.0/24 [1/0] via 10.0.0.2  <- static route
# O   10.20.30.0/24 [110/20] via 10.0.0.1  <- OSPF route

# If one router forwards 10.20.30.0/24 to 10.0.0.2 and the next forwards it back to 10.0.0.1, that's a loop

# FRR/Quagga
vtysh -c "show ip route 10.20.30.0/24"
vtysh -c "show ip route 10.20.30.0/24 longer-prefixes"
```

## Step 3: Identify OSPF Routing Loop Causes

```bash
# Cisco IOS - check OSPF routes vs static routes
show ip route ospf
show ip route static

# Loop can occur when:
# - A summary route points toward a router that has no more-specific route
# - Mutual redistribution or summarization feeds a prefix back toward its origin

# Discard route fixes summary loop (Null0 route)
ip route 10.20.0.0 255.255.0.0 Null0
# This prevents the summary from looping if no specific route exists
```

## Step 4: Identify BGP Routing Loop Causes

```bash
# BGP AS-path loop prevention rejects routes that contain your local ASN
# iBGP route reflection uses ORIGINATOR_ID and CLUSTER_LIST for loop prevention

# Cisco IOS - check BGP table
show bgp ipv4 unicast 10.20.30.0/24

# Check AS path for your local ASN
show bgp ipv4 unicast regexp _65001_   # Any route containing your own ASN

# BGP loop prevention: router won't accept routes with its own ASN in path
# Exception: allowas-in command can break this protection
show run | include allowas-in   # Remove if not needed
```

## Step 5: Fix Static Route Loops

```bash
# Common cause: two default routes pointing at each other
# Router A: ip route 0.0.0.0 0.0.0.0 10.0.0.2
# Router B: ip route 0.0.0.0 0.0.0.0 10.0.0.1  <- These two create a loop

# Fix: do not point the two default routes at each other
# Router B should learn the default from Router A via OSPF/BGP, or use a real upstream next hop

# Add Null0 aggregate route to prevent summary loops
ip route 10.0.0.0 255.0.0.0 Null0 254  # Higher admin distance than OSPF; less preferred
```

## Step 6: Monitor with Packet Capture

```bash
# Capture packets and watch TTL values decreasing
sudo tcpdump -l -i eth0 -n 'ip and dst 10.20.30.1' -v | grep ttl

# If you see the same src/dst pair with decreasing TTL:
# IP (ttl 64) 192.168.1.10 > 10.20.30.1
# IP (ttl 63) 192.168.1.10 > 10.20.30.1  <- same packet returning
# IP (ttl 62) 192.168.1.10 > 10.20.30.1  <- looping

# Watch ICMP Time Exceeded messages (loop evidence)
sudo tcpdump -i eth0 'icmp[icmptype] = icmp-timxceed'
```

## Step 7: Emergency Null Route

```bash
# Immediately stop a loop by black-holing the problematic prefix
# This drops traffic but stops the CPU overload

# Cisco IOS
ip route 10.20.30.0 255.255.255.0 Null0

# Linux
sudo ip route add blackhole 10.20.30.0/24

# Then investigate the correct routing fix before removing the null route
```

## Conclusion

Routing loops are often detected by `traceroute` showing repeating IP addresses and confirmed by checking routing tables on each router for conflicting entries. Fix OSPF summary loops with discard/Null0 routes, fix static route loops by removing mutual default routes, and fix BGP loop risks by verifying AS-path handling and route reflector topology. Use an emergency null route (`ip route X.X.X.X MASK Null0`) to immediately stop loop traffic while investigating the root cause.
