# How to Avoid IPv6 Fragmentation in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Fragmentation, Application Design, PMTUD, Socket Options

Description: Design IPv6 applications to avoid fragmentation by using PMTU Discovery, setting appropriate socket options, and keeping packets within the path MTU.

## Introduction

IPv6 fragmentation should be a last resort. Fragmented packets are more likely to be dropped by middleboxes, add reassembly overhead at the destination, and can fail silently if reassembly buffers are exhausted. Well-designed IPv6 applications use Path MTU Discovery or conservative packet sizing to avoid fragmentation entirely.

## Strategies to Avoid Fragmentation

```text
Anti-fragmentation strategies ranked by preference:

1. Use TCP (handles PMTUD and MSS automatically)
   → TCP negotiates MSS, adjusts to path MTU dynamically
   → No application-level effort needed

2. Keep the full IPv6 packet below minimum IPv6 MTU (1280 bytes)
   → Guaranteed to work on all IPv6 paths
   → For UDP over IPv6, that means payload ≤ 1232 bytes before extension headers
   → Limits throughput on high-MTU paths
   → Appropriate for DNS queries, NDP, ICMPv6

3. Use PMTU Discovery / DPLPMTUD with UDP-based protocols
   → Application or transport handles Packet Too Big and reduces packet size
   → More complex but allows full path MTU utilization

4. Set IPV6_DONTFRAG (or platform equivalent) socket option
   → Disable local IPv6 fragmentation and get explicit errors
   → Allows application to handle MTU feedback

5. Fragment at application layer (not IPv6 level)
   → Application splits messages into MTU-sized chunks
   → No IPv6 Fragment Headers needed
```

## Socket Options for Controlling Fragmentation

```python
import errno
import socket

def create_udp6_no_fragment_socket() -> socket.socket:
    """
    Create an IPv6 UDP socket that disables fragmentation
    and returns errors when packets exceed the path MTU.
    """
    s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

    # IPV6_DONTFRAG: If set, send returns EMSGSIZE for over-MTU packets
    # instead of inserting an IPv6 Fragment Header
    s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_DONTFRAG, 1)

    # Optional on Linux: request PMTU change notifications via recvmsg()
    # with IPV6_PATHMTU ancillary data. Handling that control message is
    # not shown in this example.
    # s.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_RECVPATHMTU, 1)

    # IPV6_USE_MIN_MTU: Set to 1 to use the IPv6 minimum MTU (1280 bytes)
    # for the full packet size on all sends
    # IPV6_USE_MIN_MTU = 63  # Linux constant; not exposed by Python everywhere
    # s.setsockopt(socket.IPPROTO_IPV6, IPV6_USE_MIN_MTU, 1)

    return s

def send_with_mtu_awareness(s: socket.socket, data: bytes,
                             dest: tuple, current_pmtu: int = 1500) -> int:
    """
    Send data, handling EMSGSIZE errors by reducing packet size.
    dest: (address, port)
    Returns actual bytes sent.
    """
    max_payload = current_pmtu - 40 - 8  # IPv6 header + UDP header

    if len(data) <= max_payload:
        try:
            return s.sendto(data, dest)
        except OSError as e:
            if e.errno == errno.EMSGSIZE:
                print(f"Packet too large for current PMTU={current_pmtu}")
                return -1
            raise
    else:
        # Application-layer chunking (preferred over IPv6 fragmentation)
        sent = 0
        for i in range(0, len(data), max_payload):
            chunk = data[i:i + max_payload]
            s.sendto(chunk, dest)
            sent += len(chunk)
        return sent
```

## DNS as a Case Study

DNS is a real-world example of fragmentation avoidance strategy:

```bash
# DNS uses UDP with max 512 bytes traditionally (fits in any MTU)

# EDNS0 extends to 4096 bytes with fragmentation risk

# Send an IPv6 DNSSEC query with a conservative EDNS buffer size
# If the answer does not fit, the server can truncate and the client can retry over TCP
dig -6 @2001:4860:4860::8888 cloudflare.com DNSKEY +dnssec +bufsize=1232

# 1232 = 1280 (min IPv6 MTU) - 40 (IPv6) - 8 (UDP)
# Setting bufsize=1232 avoids fragmentation on all IPv6 paths

# Conservative DNS practice: keep DNS UDP responses ≤ 1232 bytes
# when you need to avoid IPv6 fragmentation on all paths
# If response is larger, truncate and let client retry over TCP

# Configure BIND to limit UDP response size
# In named.conf options:
# edns-udp-size 1232;
# max-udp-size 1232;
```

## QUIC and Modern Protocols

```text
Modern protocol approaches to avoid fragmentation:

QUIC (RFC 9000):
  - Runs over UDP
  - Uses PMTUD or DPLPMTUD (RFC 9000 Section 14, RFC 8899)
  - Uses PADDING frames to probe MTU
  - Uses a 1200-byte minimum UDP payload size until larger sizes are validated
  - No application-level fragmentation needed

DTLS (Datagram TLS; RFC 9147, RFC 6347 for DTLS 1.2):
  - Leaves PMTU discovery primarily to the application/underlying transport
  - Handshake messages may be fragmented to fit the PMTU

WireGuard:
  - Encapsulates packets in UDP and depends on a correct interface MTU
  - `wg-quick` auto-detects MTU from the endpoint route unless overridden
  - With a correct MTU, outer IP fragmentation is avoided
```

## Conclusion

The best way to avoid IPv6 fragmentation is to use TCP for connections that need it (TCP handles PMTUD automatically through MSS negotiation) and to keep UDP payloads conservative (for example, 1232 bytes over IPv6 when you need every packet to fit within the 1280-byte minimum MTU, or implementing application-level PMTUD for higher efficiency). On platforms that expose it, the `IPV6_DONTFRAG` socket option is invaluable during development - it surfaces MTU problems as explicit errors rather than silent fragmentation failures. For DNS specifically, 1232 bytes is the conservative UDP payload size derived from IPv6's 1280-byte minimum MTU.
