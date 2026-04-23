# How to Troubleshoot 'Request Timed Out' vs 'Destination Unreachable'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ping, ICMP, Networking, Troubleshooting, IPv4, Firewall

Description: Understand the key differences between 'Request Timed Out' and 'Destination Unreachable' ping errors, and follow the right diagnostic path for each.

These two errors look similar but point to completely different problems. Confusing them leads to hours of wasted troubleshooting. Understanding the distinction immediately narrows your investigation.

## Key Differences

```text
Error Type                         What It Means
---------------------------------  ------------------------------------------
"Destination Host Unreachable"     ICMP error returned by your host or a router
                                   A route or next-hop problem was detected

"Request Timed Out" (Windows)      No response received within timeout
"No response" / silence (Linux)    Could be: host down, ICMP Echo filtered,
                                   larger packets hitting an MTU black hole,
                                   or the reply never makes it back
```

## Destination Host Unreachable: Route or Next-Hop Problem

```bash
# Linux ping output showing unreachable:

ping -c 4 10.50.0.1
# From 192.168.1.1 icmp_seq=1 Destination Host Unreachable
# ^--- ICMP error came back quickly, from 192.168.1.1

# Diagnose: note who sent the ICMP error and check your selected route
# If ping says "From 192.168.1.1", that device sent the error
ip route get 10.50.0.1
# Shows which next hop/interface your host will use

# Fix options:
sudo ip route add 10.50.0.0/24 via 192.168.1.254  # Example: if your host should use a different gateway
# Or fix routing on the device that sent the ICMP error
```

## Request Timed Out: Silent Drop or Return Path Issue

```bash
# Linux ping output showing timeout (silence):
ping -c 4 10.50.0.1
# Request probes were sent, but no Echo Reply came back
# 4 packets transmitted, 0 received, 100% packet loss

# Could be caused by:
# 1. Host is powered off
# 2. ICMP Echo is being filtered or ignored
# 3. Return path broken (host can receive but can't reply to you)
# 4. MTU black hole (more common with larger packets / DF testing)

# Test with traceroute:
traceroute 10.50.0.1
# If standard UDP traceroute reaches the destination hop but ping times out:
# → destination is up and answering traceroute probes
# → ICMP Echo may be filtered/ignored, or ping and traceroute are handled differently
```

## Distinguishing Firewall Block from Host Down

```bash
# Method 1: Try a TCP connection (firewalls may allow TCP but block ICMP)
nc -zv 10.50.0.1 22    # Test SSH port
nc -zv 10.50.0.1 80    # Test HTTP port
# If TCP connects but ping times out → host is up; ICMP Echo is being filtered or ignored

# Method 2: Check with traceroute --no-dns
traceroute -n 10.50.0.1
# If last successful hop is one before target → target may be down, or final responses are filtered
# If last hop IS the target → host is up and responding to traceroute probes;
#                              ping's ICMP Echo may still be filtered/ignored

# Method 3: Use TCP traceroute
sudo traceroute -T -p 80 10.50.0.1
# TCP SYN probes can help when default UDP or ICMP traceroute is filtered
```

## Asymmetric Routing (Request Timed Out Despite Host Being Up)

```bash
# Symptom: Traceroute reaches the host, but ping times out
# Cause: Host can receive your packets, but replies may leave via a different path,
#        the wrong source interface, or a filtered path

# Test from target host back to you:
# On target: ping <your-ip>
# If that also times out → reverse-path routing or filtering is likely involved
# If that works → reverse reachability exists; compare source IP/interface
#                 selection and routing policy for the ping replies

# On target machine:
ip route get <your-ip>
# Shows which next hop and source address the target will use to reply

# Fix: add a route back to your source subnet
# On target machine:
sudo ip route add 192.168.1.0/24 via 10.50.0.254
```

## Quick Diagnostic Decision Tree

```text
Ping fails
    |
    ├─ "Destination Host Unreachable" received?
    │       → YES: Explicit ICMP error. Check route and gateway/next hop.
    │
    └─ Silence / 100% loss?
            |
            ├─ traceroute reaches destination?
            │       → YES: Host is up; ping's ICMP Echo is being filtered or handled differently
            │       → Try TCP connections to confirm
            │
            └─ traceroute also fails?
                    → Routing/filtering issue, or host is down
                    → Check physical connectivity, power, interface
```

The critical takeaway: "Destination Host Unreachable" with a quick response means you got explicit ICMP feedback; silence with 100% loss means you must investigate further.
