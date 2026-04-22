# How to Set Up UDP Multicast Streaming on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Multicast, Streaming, Linux, IGMP, Networking

Description: Configure UDP multicast streaming on Linux to send video or audio to multiple receivers simultaneously using a single multicast group address.

## Introduction

UDP multicast allows a single sender to reach multiple receivers simultaneously without sending separate copies. The sender transmits one stream to a multicast group address (224.0.0.0 - 239.255.255.255); switches with IGMP snooping and multicast routers can forward it only toward receivers that have subscribed, while unmanaged or unsnooped LANs may flood it like broadcast traffic. This is far more efficient than unicast for distributing the same data to many consumers.

## Sender Setup

```python
#!/usr/bin/env python3
# multicast_sender.py

import socket
import struct
import time

MULTICAST_GROUP = '239.1.2.3'  # Administratively scoped multicast range
PORT = 5004
TTL = 32  # How many router hops multicast can traverse

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Set multicast TTL (how far it travels):

sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, TTL)

# Optional: set source interface for multicast:
# sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF,
#                 socket.inet_aton('192.168.1.10'))

# Optional: disable loopback (don't receive your own multicast):
sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_LOOP, 0)

seq = 0
while True:
    msg = f"multicast packet {seq} timestamp={time.time():.3f}"
    sock.sendto(msg.encode(), (MULTICAST_GROUP, PORT))
    print(f"Sent: {msg}")
    seq += 1
    time.sleep(0.1)
```

## Receiver Setup

```python
#!/usr/bin/env python3
# multicast_receiver.py

import socket
import struct

MULTICAST_GROUP = '239.1.2.3'
PORT = 5004
INTERFACE = '0.0.0.0'  # Bind all local addresses; kernel chooses multicast interface

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# Allow multiple listeners on the same port:
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Bind to the multicast port:
sock.bind((INTERFACE, PORT))

# Join the multicast group:
mreq = struct.pack('4s4s',
    socket.inet_aton(MULTICAST_GROUP),
    socket.inet_aton(INTERFACE))  # Local interface; 0.0.0.0 lets the kernel choose
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)

print(f"Joined multicast group {MULTICAST_GROUP}:{PORT}")

while True:
    data, addr = sock.recvfrom(65535)
    print(f"Received from {addr}: {data.decode()}")
```

## GStreamer Multicast Streaming

```bash
# Sender: stream a video test pattern to multicast address
gst-launch-1.0 videotestsrc ! x264enc ! rtph264pay ! \
  udpsink host=239.1.2.3 port=5004 auto-multicast=true multicast-iface=eth0

# Receiver: receive and display the multicast stream
gst-launch-1.0 udpsrc uri=udp://239.1.2.3:5004 multicast-iface=eth0 ! \
  caps="application/x-rtp,media=video,encoding-name=H264" ! \
  rtpjitterbuffer ! rtph264depay ! avdec_h264 ! autovideosink

# VLC multicast sender:
vlc -vvv input.mp4 --sout '#rtp{dst=239.1.2.3,port=5004,mux=ts}' --loop

# VLC multicast receiver:
vlc rtp://@239.1.2.3:5004
```

## Verify Multicast Group Membership

```bash
# Check which multicast groups this host has joined:
ip maddr show
# Or:
cat /proc/net/igmp

# Check multicast routing (if configured):
ip mroute show

# Limited multicast ping test (many Linux hosts ignore multicast ICMP by default):
ping -I eth0 239.1.2.3

# Monitor multicast traffic:
tcpdump -i eth0 -n 'multicast'
# Or specifically for the group:
tcpdump -i eth0 -n 'dst 239.1.2.3'
```

## Firewall Configuration for Multicast

```bash
# Allow multicast traffic through iptables:
iptables -A INPUT -d 224.0.0.0/4 -j ACCEPT    # All multicast
iptables -A OUTPUT -d 224.0.0.0/4 -j ACCEPT

# For IGMP (multicast group management):
iptables -A INPUT -p igmp -j ACCEPT
iptables -A OUTPUT -p igmp -j ACCEPT

# Allow specific multicast group:
iptables -A INPUT -d 239.1.2.3 -p udp --dport 5004 -j ACCEPT
```

## Conclusion

UDP multicast streaming sends a single packet stream that all subscribed receivers receive, making it ideal for live video/audio distribution on a LAN or IPTV systems. Use addresses in the 239.0.0.0/8 range (administratively scoped for local or organizational domains). Set TTL appropriately - use 1 for LAN only, higher for routed networks with multicast routing and scope boundaries configured. Verify group membership with `ip maddr show` and multicast traffic flow with `tcpdump -n 'multicast'`. For public internet delivery, multicast is generally not available end-to-end; use CDN or unicast replication instead.
