# How to Handle ICMPv6 Packet Too Big in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Packet Too Big, PMTUD, IPv6, Socket Programming

Description: Handle ICMPv6 Packet Too Big messages in socket applications, update PMTU caches, and implement application-level PMTU Discovery for UDP applications.

## Introduction

ICMPv6 Packet Too Big (Type 2) messages notify a sending application that a packet exceeded the path MTU. For TCP, the kernel handles this automatically. For UDP applications, the application may need to handle these messages explicitly by reducing the packet size and retransmitting. Understanding how to receive and process PTB messages enables building reliable UDP-based protocols on IPv6.

## How the Kernel Delivers PTB to Applications

```text
ICMPv6 PTB delivery to applications:

TCP:
  Kernel handles PTB automatically
  Updates the PMTU cache
  Adjusts TCP MSS for the connection
  Application is unaware (transparent)

UDP (without IPV6_RECVPATHMTU):
  Kernel updates PMTU cache
  Subsequent sends may fail with EMSGSIZE
  Application receives send error on next oversized packet

UDP (with IPV6_RECVPATHMTU enabled):
  Kernel delivers a separate empty recvmsg() notification
  The notification carries IPV6_PATHMTU ancillary data
  Application can retrieve PTB information
  Application must reduce packet size explicitly
```

## Receiving PTB Notifications in Python

```python
import errno
import socket

def create_pmtu_aware_udp6_socket(bind_port: int) -> socket.socket:
    """
    Create a UDP/IPv6 socket that receives PMTU change notifications.
    """
    s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    s.bind(('::', bind_port))

    # Enable PMTU discovery notifications.
    IPV6_RECVPATHMTU = getattr(socket, "IPV6_RECVPATHMTU", 60)
    s.setsockopt(socket.IPPROTO_IPV6, IPV6_RECVPATHMTU, 1)

    # Set IPV6_DONTFRAG: fail with EMSGSIZE instead of fragmenting in the sender.
    IPV6_DONTFRAG = getattr(socket, "IPV6_DONTFRAG", 62)
    s.setsockopt(socket.IPPROTO_IPV6, IPV6_DONTFRAG, 1)

    return s

def send_with_pmtu_retry(s: socket.socket, data: bytes,
                          dest: tuple, pmtu: int = 1500) -> int:
    """
    Send UDP data with PMTU-aware retry.
    For a single destination, connect the socket so the current PMTU can
    be queried after EMSGSIZE.
    """
    MAX_RETRIES = 5
    current_pmtu = pmtu
    IPV6_HEADER = 40
    UDP_HEADER = 8
    IPV6_MTU = getattr(socket, "IPV6_MTU", 24)

    s.connect(dest)

    for attempt in range(MAX_RETRIES):
        max_payload = current_pmtu - IPV6_HEADER - UDP_HEADER
        if len(data) > max_payload:
            print(f"Payload {len(data)} bytes exceeds MTU {current_pmtu}, reducing")
            # For a real application, you'd need to chunk or wait
            payload = data[:max_payload]
        else:
            payload = data

        try:
            return s.send(payload)
        except OSError as e:
            if e.errno == errno.EMSGSIZE:
                # On a connected UDP socket, Linux exposes the updated PMTU here.
                current_pmtu = max(1280, s.getsockopt(socket.IPPROTO_IPV6, IPV6_MTU))
                print(f"EMSGSIZE: kernel reports new PMTU {current_pmtu}")
            else:
                raise
    raise OSError("Max PMTU retries exceeded")
```

## Reading PTB MTU from Ancillary Data

```python
import socket
import struct

def receive_with_pmtu(s: socket.socket, bufsize: int = 4096):
    """
    Receive a UDP message or a PMTU change notification.
    On Linux, IPV6_PATHMTU is delivered as a separate empty recvmsg().
    Returns (data, addr, new_pmtu_or_None)
    """
    ancbufsize = socket.CMSG_SPACE(32)  # sizeof(struct ip6_mtuinfo) on Linux
    data, ancdata, flags, addr = s.recvmsg(bufsize, ancbufsize)

    new_pmtu = None
    IPV6_PATHMTU = getattr(socket, "IPV6_PATHMTU", 61)
    for cmsg_level, cmsg_type, cmsg_data in ancdata:
        if cmsg_level == socket.IPPROTO_IPV6 and cmsg_type == IPV6_PATHMTU:
            # IPV6_PATHMTU ancillary data structure:
            # struct ip6_mtuinfo { struct sockaddr_in6 ip6m_addr; uint32_t ip6m_mtu; }
            # sockaddr_in6 is 28 bytes on Linux, and ip6m_mtu is host byte order.
            if len(cmsg_data) >= 32:
                mtu = struct.unpack_from("=I", cmsg_data, 28)[0]
                new_pmtu = mtu
                print(f"PMTU change notification: new MTU = {mtu}")

    return data, addr, new_pmtu
```

## Checking PMTU Before Sending

```bash
# Check the route the kernel would use for a destination

ip -6 route get 2001:db8::2

# If the kernel has learned a path-specific MTU, the route output may include mtu
# Example output:
# 2001:db8::2 from 2001:db8::100 via fe80::1 dev eth0 src 2001:db8::100
#   expires 594sec mtu 1480 pref medium

# Re-run the lookup to watch for PMTU changes on that destination
watch -n 1 'ip -6 route get 2001:db8::2'
```

## PTB and TCP Behavior

```bash
# TCP connections automatically handle PTB
# Verify TCP is respecting PMTU by watching for segment size reduction
sudo tcpdump -i eth0 -v "tcp and host 2001:db8::2" 2>&1 | \
    grep "length" | awk '{print $NF}' | sort -u
# Segment sizes should cluster at the PMTU-derived MSS

# If PTB arrives after connection established:
# Linux updates PMTU cache and reduces MSS for the connection
# No application action needed
```

## Conclusion

ICMPv6 Packet Too Big handling differs between TCP and UDP. TCP connections benefit from automatic kernel handling with no application involvement. UDP applications need to either tolerate EMSGSIZE errors when `IPV6_DONTFRAG` is set, or enable `IPV6_RECVPATHMTU` to receive explicit PTB notifications through ancillary data. For connected UDP sockets, you can query the current PMTU with `IPV6_MTU`; otherwise, handle EMSGSIZE and `IPV6_PATHMTU` notifications gracefully by reducing packet size and retransmitting.
