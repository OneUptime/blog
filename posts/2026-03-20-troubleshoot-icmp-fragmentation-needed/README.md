# How to Troubleshoot ICMP Fragmentation Needed Messages - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMP, Fragmentation, MTU, PMTUD, Linux, Networking, Troubleshooting

Description: Capture and analyze ICMP type 3 code 4 Fragmentation Needed messages to diagnose MTU problems and verify PMTUD is functioning correctly.

## Introduction

ICMP type 3 code 4 "Fragmentation Needed" is the critical control message for PMTUD. When a router must discard a packet with the DF bit set because it's too large for the next hop, it sends this message to the original sender with the MTU of the bottleneck link. Understanding, capturing, and interpreting these messages is essential for diagnosing MTU black holes and fragmentation issues.

## Capture Fragmentation Needed Messages

```bash
# Capture ICMP Fragmentation Needed (type 3, code 4):

tcpdump -i eth0 -n 'icmp[0] = 3 and icmp[1] = 4'
# icmp[0] = type 3 = Destination Unreachable
# icmp[1] = code 4 = Fragmentation Needed

# Verbose output showing MTU value:
tcpdump -i eth0 -n -v 'icmp[0] = 3 and icmp[1] = 4'
# Shows: next-hop MTU value (the bottleneck link's MTU)

# Generate test Fragmentation Needed message:
# On another terminal, send oversized packet:
# For a 1400-byte bottleneck and a 1500-byte local MTU:
ping -M do -s 1373 -c 1 10.20.0.5
# tcpdump should capture the resulting ICMP type 3 code 4 if ICMP is allowed
```

## Understand the Message Structure

```text
ICMP Fragmentation Needed message structure:
  IP Header (from router):
    Source:      Router IP
    Destination: Original sender IP

  ICMP Header:
    Type: 3 (Destination Unreachable)
    Code: 4 (Fragmentation Needed and DF set)
    Next-Hop MTU: Size of the next link (KEY FIELD!)

  Original IP Header (first 8+ bytes of dropped packet):
    Identifies which packet was dropped

Critical fields:
  "next-hop MTU" = the MTU of the link that would have needed to fragment
  Original sender uses this to reduce packet size
```

## Wireshark Display Filters

```text
# Show ICMP Fragmentation Needed:
icmp.type == 3 and icmp.code == 4

# Show with next-hop MTU value:
icmp.type == 3 and icmp.code == 4 and icmp.mtu != 0

# Find all ICMP unreachable messages:
icmp.type == 3

# Check if router provided MTU value:
icmp.mtu > 0
# (Some old routers send 0 for next-hop MTU = no info about target MTU)
```

## Verify PMTUD is Working

```bash
# PMTUD should work like this:
# 1. Send large packet with DF bit
# 2. Router sends ICMP Fragmentation Needed
# 3. Kernel reduces PMTU estimate
# 4. Subsequent packets use smaller size

# Test PMTUD:
# Query the kernel PMTU entry:
ip route get 10.20.0.5
# If PMTU has been discovered: shows "cache expires XX sec mtu XXXX"

# Simulate PMTUD:
# Start a TCP connection:
iperf3 -c 10.20.0.5 -t 30 &

# Reduce MTU on the path (simulated bottleneck):
# On an intermediate router: ip link set eth1 mtu 1400

# Watch PMTUD reduce MSS:
watch -n 1 "ss -tin state established dst 10.20.0.5 | grep mss"
# MSS should decrease as PMTUD discovers smaller MTU
```

## ICMP Blocked Diagnosis (Black Hole)

```bash
# If ICMP type 3 code 4 is blocked:
# 1. Sender uses full MTU (e.g., 1500)
# 2. Router drops oversized packets with DF bit
# 3. Router sends Fragmentation Needed ICMP
# 4. ICMP is blocked by firewall
# 5. Sender never reduces packet size → black hole

# Test: send oversized DF packets and watch for ICMP:
tcpdump -i eth0 -n 'icmp' &
ping -M do -s 1373 -c 3 -W 3 10.20.0.5

# If oversized packets leave but NO ICMP returns: likely black hole (ICMP being dropped somewhere)
# If ICMP returns to the sender: PMTUD signaling is flowing

# Check firewall rules blocking ICMP:
iptables -L INPUT -n | grep -E "ICMP|icmp" | grep -i "DROP\|REJECT"
iptables -L FORWARD -n | grep -E "ICMP|icmp" | grep -i "DROP\|REJECT"
```

## Allow ICMP Fragmentation Needed Through Firewalls

```bash
# If firewall is blocking ICMP type 3:
# Allow specifically ICMP Fragmentation Needed (type 3):
iptables -I INPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I OUTPUT -p icmp --icmp-type fragmentation-needed -j ACCEPT
iptables -I FORWARD -p icmp --icmp-type fragmentation-needed -j ACCEPT

# For nftables:
nft add rule inet filter input icmp type destination-unreachable icmp code frag-needed accept
nft add rule inet filter output icmp type destination-unreachable icmp code frag-needed accept
nft add rule inet filter forward icmp type destination-unreachable icmp code frag-needed accept

# This is the minimum ICMP that should NEVER be blocked
# Per RFC 1191/RFC 1812: ICMP fragmentation needed is required for IPv4 PMTUD
```

## Conclusion

ICMP type 3 code 4 is the mechanism that makes PMTUD work. Capture with `tcpdump -n 'icmp[0] = 3 and icmp[1] = 4'` to verify it is flowing. If ICMP is blocked, TCP connections hang when sending large data (MTU black hole). Always allow ICMP type 3 code 4 through firewalls - per RFC 1191/RFC 1812, blocking fragmentation needed messages breaks standards-based PMTUD. The next-hop MTU field in the ICMP message tells the sender exactly what size to use, making PMTUD fast and efficient when ICMP is not filtered.
