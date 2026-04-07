# How to Use Ping to Test IPv4 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Ping, ICMP, IPv4, Troubleshooting, Linux

Description: Use the ping command effectively to test IPv4 connectivity, measure latency, detect packet loss, and diagnose network problems at Layer 3.

## Introduction

Ping is the most fundamental network diagnostic tool. It sends ICMP Echo Requests to a target and measures whether replies are received and how long they take. Despite its simplicity, ping can reveal routing failures, packet loss, latency issues, and MTU problems with the right options.

## Basic Ping Usage

```bash
# Ping a host (Linux - sends indefinitely until Ctrl+C)

ping 8.8.8.8

# Send exactly 4 packets
ping -c 4 8.8.8.8

# Ping by hostname
ping google.com

# Ping a local gateway
ping -c 4 192.168.1.1
```

## Reading Ping Output

```bash
ping -c 5 8.8.8.8
# PING 8.8.8.8 (8.8.8.8): 56 data bytes
# 64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.3 ms
# 64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.9 ms
# ...
# --- 8.8.8.8 ping statistics ---
# 5 packets transmitted, 5 received, 0% packet loss
# rtt min/avg/max/mdev = 11.9/12.1/12.3/0.2 ms

# Key fields:
# icmp_seq:  sequence number (gaps indicate loss)
# ttl:       Time to Live remaining (hints at hop count: 128-ttl or 64-ttl)
# time:      Round-trip time in milliseconds
# % packet loss: critical for reliability assessment
```

## Advanced Ping Options

```bash
# Set packet size (useful for MTU testing)
ping -s 1400 -c 4 8.8.8.8

# Set TTL (limit hops - useful to detect path segments)
ping -m 5 -c 4 8.8.8.8   # macOS
ping -t 5 -c 4 8.8.8.8   # Linux (iputils-ping)

# Set interval between packets (flood testing - needs root)
sudo ping -i 0.1 -c 100 192.168.1.1

# Flood ping (very fast, for stress testing)
sudo ping -f -c 1000 192.168.1.1

# Record route (shows IP addresses of up to 9 hops)
ping -R -c 1 8.8.8.8

# Use specific source interface
ping -I eth1 -c 4 10.20.0.1
```

## Connectivity Testing Strategy

```bash
#!/bin/bash
# Systematic connectivity test: check each hop layer by layer

TARGET="8.8.8.8"
GATEWAY="192.168.1.1"
DNS="8.8.8.8"

echo "=== Testing Layer 3 connectivity ==="

# Test 1: loopback (confirms IP stack works)
ping -c 1 127.0.0.1 &>/dev/null && echo "OK: Loopback" || echo "FAIL: Loopback"

# Test 2: local gateway (confirms local network)
ping -c 2 $GATEWAY &>/dev/null && echo "OK: Gateway $GATEWAY" || echo "FAIL: Gateway unreachable"

# Test 3: internet host by IP (confirms routing)
ping -c 2 $TARGET &>/dev/null && echo "OK: Internet ($TARGET)" || echo "FAIL: No internet routing"

# Test 4: internet host by name (confirms DNS)
ping -c 2 google.com &>/dev/null && echo "OK: DNS resolution" || echo "FAIL: DNS not working"
```

## Detecting Packet Loss Patterns

```bash
# Run a longer ping to detect intermittent loss
ping -c 100 -i 0.5 10.20.0.1 | tail -5

# Intermittent loss pattern - check for:
# - Duplex mismatch on the link
# - Queue overflow (high traffic bursts)
# - Wireless signal issues
# - Hardware CRC errors (check: ip -s link show eth0)
```

## Conclusion

Ping is the starting point for any network diagnosis. A successful ping confirms Layer 3 reachability and gives you baseline latency. Packet loss reveals link instability. Varying TTL values explore the path. Large packet sizes test MTU. Use ping's options to go beyond simple reachability testing and extract maximum diagnostic value.
