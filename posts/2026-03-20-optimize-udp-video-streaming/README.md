# How to Optimize UDP for Video Streaming Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Video Streaming, RTP, Performance, Linux, Media

Description: Optimize UDP for video streaming by tuning buffer sizes, configuring packet pacing, handling packet loss with FEC, and setting appropriate socket options.

## Introduction

Video streaming is one of the primary use cases for UDP. Unlike file transfer (where every byte must arrive), video streaming can tolerate some packet loss - a lost frame can be concealed or skipped. The challenge is maintaining smooth, low-latency delivery at a sustained bitrate without overwhelming network buffers. Proper UDP tuning for streaming involves buffer sizing, packet pacing, and forward error correction.

## Understanding Video Streaming Requirements

```text
Typical video bitrates:
- SD (480p):  1-3 Mbps
- HD (720p):  3-6 Mbps
- FHD (1080p): 6-15 Mbps
- 4K:         25-50 Mbps

Packet structure:
- Video is broken into RTP packets (typically 1316 bytes payload)
- At 5 Mbps: ~500 packets/second
- At 50 Mbps: ~5000 packets/second

Quality requirements:
- Packet loss < 0.1% for good quality (< 0.01% for professional)
- Jitter < 10ms (buffer smooths this at receiver)
- Latency: 100-3000ms acceptable for streaming, <100ms for interactive
```

## Socket Configuration for Streaming

```python
#!/usr/bin/env python3
# Video streaming socket configuration

import socket

def create_streaming_socket(multicast=False):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Large send buffer to absorb video encoder bursts:
    # 1 second at 50 Mbps = 6.25 MB
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 8388608)  # 8 MB

    # Set DSCP for media (CS4 or AF41):
    # AF41 = DSCP 34 = 0x88 TOS value
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_TOS, 0x88)

    # Receive buffer at receiver end:
    # Size = bitrate * jitter_buffer_duration
    # At 50 Mbps, 200ms jitter buffer: 50e6 * 0.2 / 8 = 1.25 MB
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4194304)  # 4 MB

    return sock
```

## Packet Pacing

```bash
# Without pacing: video encoder outputs bursts (many packets at once per frame)

# Bursts cause buffer overflow and loss at network equipment

# Enable packet pacing with Linux tc:
# This smooths out bursts before they hit the network
tc qdisc add dev eth0 root fq maxrate 100mbit
# FQ (Fair Queue) provides per-flow pacing

# For specific bitrate video stream (5 Mbps streaming):
tc qdisc add dev eth0 root handle 1: tbf rate 5mbit burst 32kbit latency 50ms
# TBF (Token Bucket Filter) limits to 5 Mbps with 50ms maximum latency

# Better: use FQ with per-flow rate limiting for multiple streams:
tc qdisc replace dev eth0 root fq flow_limit 100 maxrate 100mbit
```

## Forward Error Correction (FEC)

```bash
# FEC adds redundancy packets so receiver can reconstruct lost data
# Common: XOR-based FEC (XOR of N data packets = 1 repair packet)
# If any 1 of N+1 packets is lost, recover it from the others

# For 10% of packets as FEC overhead, you can recover 1 lost packet per group of 10
# This "costs" 10% bandwidth but dramatically improves quality on 1-3% loss links

# GStreamer example with ULP-FEC (RFC 5109):
# gst-launch-1.0 videotestsrc ! x264enc ! rtph264pay ! \
#   rtpulpfecenc percentage=20 ! udpsink host=10.20.0.5 port=5004

# Check for available GStreamer FEC plugins:
gst-inspect-1.0 | grep -i fec
```

## Jitter Buffer Configuration

```bash
# At the receiver: jitter buffer absorbs network jitter
# Adds latency but smooths playback

# GStreamer jitter buffer:
# gst-launch-1.0 udpsrc port=5004 caps="application/x-rtp,media=video,encoding-name=H264" ! \
#   rtpjitterbuffer latency=200 ! rtph264depay ! avdec_h264 ! autovideosink
# latency=200: 200ms jitter buffer (increase for higher jitter networks)

# VLC streaming with jitter buffer:
# --network-caching 1000  ← 1000ms jitter/network buffer (VLC default)
```

## Monitor Streaming Quality

```bash
# Check for UDP drops during streaming:
nstat | grep -E "UdpRcvbuf|UdpInErrors"

# Monitor interface queue drops:
watch -n 1 "tc -s qdisc show dev eth0"
# "dropped" counter increasing = packets dropped at qdisc

# Measure jitter with iperf3:
iperf3 -c 10.20.0.5 -u -b 5M -l 1316 -t 30
# Focus on jitter value (target < 5ms)
```

## Conclusion

Video streaming over UDP requires three optimizations: proper buffer sizing (8MB send, 4MB receive), packet pacing to smooth encoder bursts, and FEC to recover from isolated packet loss. Set DSCP AF41 to prioritize media traffic through QoS-aware network equipment. Monitor UDP buffer drops with `nstat` and qdisc drops with `tc -s`. A well-tuned streaming setup should achieve <0.1% loss at the target bitrate with jitter under 5ms.
