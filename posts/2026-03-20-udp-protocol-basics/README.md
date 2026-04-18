# How to Understand UDP Protocol Basics and When to Use It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Protocol, Networking, Basics, Linux, Transport

Description: Understand the UDP protocol structure, its properties compared to TCP, and identify the application scenarios where UDP is the right choice.

## Introduction

UDP (User Datagram Protocol) is the other major transport layer protocol alongside TCP. It provides a minimal, connectionless datagram service: no handshake, no guaranteed delivery, no ordering, no congestion control. This simplicity is both its limitation and its strength - what it lacks in reliability it gains in speed, low overhead, and flexibility for applications that implement their own reliability.

## UDP Header Structure

```yaml
UDP Header (8 bytes total):
+--------+--------+--------+--------+
| Source | Dest   | Length | Chksum |
| Port   | Port   |        |        |
| 2 bytes| 2 bytes| 2 bytes| 2 bytes|
+--------+--------+--------+--------+

- Source Port: sender's port (optional, can be 0)
- Destination Port: receiver's port
- Length: header + data in bytes (minimum 8)
- Checksum: optional in IPv4, mandatory in IPv6
```

## UDP Properties

```text
What UDP provides:
  ✓ Port-based multiplexing (like TCP)
  ✓ Error detection (checksum, when enabled)
  ✓ Optional checksum (can be disabled for performance)
  ✓ Broadcast and multicast support
  ✓ Minimal header overhead (8 bytes vs TCP's 20+)

What UDP does NOT provide:
  ✗ Connection setup or teardown
  ✗ Guaranteed delivery
  ✗ Ordered delivery
  ✗ Congestion control
  ✗ Flow control
  ✗ Retransmission
```

## When to Use UDP

```bash
# Use UDP when:

# 1. Latency matters more than reliability
#    Examples: DNS queries, VoIP, gaming, real-time video
#    Why: no handshake, no retransmit wait = lower latency

# 2. You handle reliability at the application layer
#    Examples: QUIC, custom game protocols, video streaming with FEC
#    Why: better control over retransmit behavior than TCP

# 3. You need broadcast or multicast
#    Examples: service discovery (mDNS), DHCP, streaming to multiple receivers
#    Why: TCP is point-to-point only

# 4. Short request/response (single packet)
#    Examples: DNS, NTP, SNMP
#    Why: TCP handshake overhead is 1.5 RTT; UDP is immediate

# 5. You tolerate or prefer loss over delay
#    Examples: live video, audio, game state updates
#    Why: a late packet is useless; losing it and moving on is better
```

## Basic UDP Test

```bash
# Send a UDP packet with netcat
echo "hello" | nc -u 10.20.0.5 5000

# Listen for UDP on port 5000
nc -ul 5000

# Check UDP socket statistics
ss -un   # UDP sockets
ss -unp  # With process info
ss -una  # All states including listen

# Check UDP port is open
ss -ulnp | grep 5000
```

## UDP vs TCP Comparison

```bash
# Latency: UDP wins for single-message exchanges
# Measure DNS via UDP (typical):
time dig +short @8.8.8.8 google.com
# Typically a few to tens of milliseconds against a public resolver;
# sub-millisecond against a local caching resolver

# Throughput: UDP can achieve higher throughput (no congestion control)
iperf3 -c 10.20.0.5 -u -b 1G -t 10   # UDP, target 1 Gbps
# But: network will drop if uncontrolled, making reliability lower

# Overhead:
# UDP: 8 bytes header
# TCP: 20 bytes header minimum + options
# For many small packets: UDP has noticeably less overhead
```

## Common UDP Applications

```text
Port 53  - DNS queries
Port 67/68 - DHCP
Port 123 - NTP (time synchronization)
Port 161 - SNMP monitoring
Port 514 - Syslog
Port 500 - IKE (IPsec key exchange)
Port 4500 - IPsec NAT traversal
Port 5353 - mDNS (multicast DNS)
Port 9 - Wake-on-LAN
```

## Conclusion

UDP is the right choice when you need raw performance, need to send to multiple receivers simultaneously, or when your application implements its own reliability semantics more appropriate than TCP's. DNS, NTP, VoIP, gaming, and modern protocols like QUIC all use UDP for these reasons. The key insight is that UDP's lack of reliability isn't a flaw - it's a design choice that gives applications full control over how (and whether) to handle retransmission and ordering.
