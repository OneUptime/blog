# How to Identify and Fix TCP MSS (Maximum Segment Size) Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, MSS, MTU, Networking, Linux, Troubleshooting

Description: Identify TCP MSS mismatches that cause fragmentation and connection problems, and fix them using MSS clamping or MTU adjustment.

## Introduction

TCP MSS (Maximum Segment Size) is the largest amount of data that can be carried in a single TCP segment. It is negotiated during the handshake based on the interface MTU (for IPv4, MSS = MTU - 40 bytes for the fixed IP+TCP headers). MSS mismatches occur in VPN tunnels, GRE tunnels, and VXLAN overlays where the tunnel adds overhead that reduces the effective MTU.

## How MSS is Negotiated

```text
Default Ethernet MTU = 1500 bytes
MSS = 1500 - 20 (IP header) - 20 (TCP header) = 1460 bytes

VPN Tunnel MTU = 1420 bytes (this example assumes 80 bytes of IPsec overhead)
MSS = 1420 - 20 - 20 = 1380 bytes

Mismatch scenario:
Client advertises MSS 1460 (doesn't know about VPN)
Server sends 1460-byte segments
VPN router receives 1500-byte packet: too large to encapsulate!
If DF bit set: ICMP Frag Needed sent back (PMTUD)
If ICMP blocked: Black hole (connection hangs)
```

## Checking MSS in Packet Captures

```bash
# Check MSS negotiated in the handshake

tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' -c 5 2>/dev/null | grep mss

# Example output:
# options [mss 1460,sackOK,TS val 1234 ecr 0,nop,wscale 7]
#          ^^^^^^^^^^^^ MSS = 1460 bytes
```

## Diagnosing MSS Mismatch

```bash
# Symptom: connections work for small data but fail for large
# Test: ping with various sizes and DF bit
ping -s 1472 -M do -c 3 10.20.0.5   # 1472 + 28 header = 1500 bytes (full Ethernet MTU)
ping -s 1392 -M do -c 3 10.20.0.5   # 1392 + 28 header = 1420 bytes (fits this VPN MTU example)

# Check the path MTU
tracepath 10.20.0.5
# Look for MTU reduction at the VPN hop

# Check current MSS for an active connection
ss -tin state established | grep mss
# mss:1460  <- current MSS for this connection
```

## Fix 1: TCP MSS Clamping (Recommended)

MSS clamping modifies the MSS advertised in SYN packets to match the available path MTU:

```bash
# Clamp MSS on all forwarded traffic to match PMTU (automatic)
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Or set an explicit MSS value (use 40 bytes less than VPN MTU)
# For IPsec VPN with MTU 1420:
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380

# Apply on a specific VPN/tunnel interface (replace tun0 as needed)
iptables -t mangle -A FORWARD -o tun0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380   # Example value for a 1420-byte MTU path

# Save rules (example for systems using iptables-persistent)
iptables-save > /etc/iptables/rules.v4
```

## Fix 2: Reduce Interface MTU

```bash
# For the tunnel interface: set MTU to match available space
ip link set tun0 mtu 1420

# For the physical interface (less desirable, affects all traffic):
ip link set eth0 mtu 1420

# Make persistent (systemd-networkd):
# /etc/systemd/network/10-vpn.network
# [Link]
# MTUBytes=1420
```

## Verifying the Fix

```bash
# After applying MSS clamping, verify in a new connection's SYN
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' -c 3 2>/dev/null | grep mss
# Should now show mss 1380 (or whatever you set) instead of 1460

# Test that large data transfers work
curl -v http://10.20.0.5/10mb.bin | wc -c   # Should complete without hanging

# Confirm no fragmentation
tcpdump -i eth0 -n 'ip[6:2] & 0x3fff != 0'  # Fragmented packets
# Should show zero or very few fragments
```

## Conclusion

TCP MSS mismatches are a common source of mysterious connection failures in VPN and tunnel environments. The problem is always the same: the advertised MSS is too large for the actual path. MSS clamping with iptables is the most robust fix - it automatically adjusts MSS in SYN packets passing through the router without requiring changes to endpoints. Always apply clamping on the VPN gateway that introduces the overhead.
