# How to Configure Multicast Streaming with VLC on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLC, Multicast, Streaming, Linux, UDP, IPTV, Networking

Description: Set up multicast video streaming on Linux using VLC as both sender and receiver, configure multicast parameters, and troubleshoot common streaming issues.

## Introduction

VLC Media Player supports multicast streaming using RTP/UDP over IPv4 multicast addresses. This allows one source to stream video to multiple receivers simultaneously without the bandwidth multiplying for each viewer. VLC can act as both a multicast streaming server (using the stream output module) and a multicast receiver (using the `udp://` or `rtp://` network input). This is commonly used for IPTV, conference streaming, and LAN video distribution.

## Stream Multicast with VLC Command Line

```bash
# Stream a file as multicast UDP:

vlc /path/to/video.mp4 \
  --sout '#rtp{dst=239.255.0.1,port=5004,mux=ts}' \
  --sout-rtp-ttl 16 \
  --loop

# Stream as raw UDP (no RTP wrapper):
vlc /path/to/video.mp4 \
  --sout '#udp{dst=239.255.0.1,port=5004}' \
  --sout-mux-caching=1000 \
  --loop

# Stream with transcoding (adapt to network bandwidth):
vlc /path/to/video.mp4 \
  --sout '#transcode{vcodec=h264,vb=1000,acodec=mp3,ab=128}:rtp{dst=239.255.0.1,port=5004,mux=ts}' \
  --loop

# Stream screen capture as multicast:
vlc screen:// \
  --screen-fps=25 \
  --sout '#transcode{vcodec=h264,vb=800}:rtp{dst=239.255.0.1,port=5004,mux=ts}'
```

## Receive Multicast Stream with VLC

```bash
# Receive UDP multicast stream:
vlc udp://@239.255.0.1:5004

# Receive RTP multicast stream:
vlc rtp://@239.255.0.1:5004

# The '@' symbol means "listen on local address for group"
# Without '@': connects to specific host (unicast)
# With '@': joins multicast group

# Receive from specific interface:
vlc --miface eth0 udp://@239.255.0.1:5004

# Headless/no-GUI receive (save to file):
vlc udp://@239.255.0.1:5004 \
  --sout file/ts:/tmp/recorded.ts \
  --run-time=60 \
  vlc://quit

# With buffering to handle network jitter:
vlc --network-caching=2000 udp://@239.255.0.1:5004
```

## Create VLC Streaming .xspf Playlist

```xml
<!-- Save as multicast-stream.xspf -->
<?xml version="1.0" encoding="UTF-8"?>
<playlist version="1" xmlns="http://xspf.org/ns/0/">
  <trackList>
    <track>
      <title>Multicast Stream</title>
      <location>rtp://@239.255.0.1:5004</location>
    </track>
  </trackList>
</playlist>
```

```bash
# Open playlist:
vlc multicast-stream.xspf

# Multiple multicast channels:
cat > channels.m3u << 'EOF'
#EXTM3U
#EXTINF:-1,Channel 1
udp://@239.255.1.1:5004
#EXTINF:-1,Channel 2
udp://@239.255.1.2:5004
#EXTINF:-1,Channel 3
udp://@239.255.1.3:5004
EOF

vlc channels.m3u
```

## Configure Multicast TTL and Interface

```bash
# Set multicast TTL (how many router hops to cross):
# TTL=1: local subnet only (default for most implementations)
# TTL=16: up to 16 router hops

# Sender side - set TTL:
vlc /path/to/video.mp4 \
  --sout '#rtp{dst=239.255.0.1,port=5004,mux=ts,ttl=16}' \
  --loop

# Bind sender to a specific multicast output interface:
vlc --miface eth0 /path/to/video.mp4 \
  --sout '#rtp{dst=239.255.0.1,port=5004,mux=ts}' \
  --loop

# Receiver on specific interface:
vlc --miface eth0 udp://@239.255.0.1:5004

# Verify multicast packets are being sent:
tcpdump -i eth0 -n 'dst net 239.255.0.0/16 and udp port 5004'

# Check TTL of received packets:
tcpdump -i eth0 -n -v 'dst 239.255.0.1 and udp port 5004' | grep "ttl"
```

## Troubleshoot VLC Multicast Issues

```bash
# Problem 1: Receiver gets no video

# Check if multicast packets arrive at receiver:
tcpdump -i eth0 -n 'dst 239.255.0.1 and udp port 5004'
# If no packets: network routing or IGMP issue

# Verify receiver joined the group:
ip maddr show eth0 | grep 239.255.0.1
# Should appear after VLC opens the stream

# Problem 2: Video stutters/freezes

# Increase VLC network buffer:
vlc --network-caching=3000 udp://@239.255.0.1:5004
# network-caching in milliseconds

# Check for packet loss:
tcpdump -i eth0 -n 'dst 239.255.0.1' 2>/dev/null | \
  awk '{count++} END {print count " packets in 10s"}'

# Problem 3: Stream works on LAN but not across router

# TTL might be 1 (doesn't cross routers):
# On sender, increase TTL:
vlc video.mp4 --sout '#rtp{dst=239.255.0.1,port=5004,ttl=16}'

# Check IGMP routing on the router:
# Cisco: show ip igmp groups
# Linux router: cat /proc/net/igmp

# Verify no firewall blocking UDP port 5004:
iptables -L -n | grep 5004
# Add if needed:
iptables -I INPUT -p udp --dport 5004 -j ACCEPT
```

## VLC Streaming with MPEG-TS over Multicast

```bash
# Professional IPTV-style streaming with MPEG-TS:
# MPEG-TS is the standard container for multicast video

# Stream with explicit MPEG-TS mux:
vlc input.mp4 \
  --sout '#transcode{vcodec=mp2v,vb=2000,acodec=mpga,ab=128}:rtp{dst=239.255.0.1,port=5004,mux=ts}' \
  --sout-ts-pid-video=256 \
  --sout-ts-pid-audio=257 \
  --loop

# Receive with mpegts:
vlc udp://@239.255.0.1:5004

# Test with ffmpeg instead (for comparison):
# Sender:
ffmpeg -re -i input.mp4 \
  -c:v libx264 -b:v 1M \
  -f mpegts \
  "udp://239.255.0.1:5004?ttl=16&pkt_size=1316"

# Receiver:
ffplay "udp://@239.255.0.1:5004"
```

## Conclusion

VLC multicast streaming uses `--sout '#rtp{dst=<group>,port=<port>}'` for sending and `vlc udp://@<group>:<port>` for receiving. Set TTL to `16` or higher for cross-router streaming - the default TTL of 1 restricts multicast to the local subnet. For production streaming, use MPEG-TS mux (`mux=ts`) which is designed for lossy networks. Troubleshoot reception issues by capturing with `tcpdump 'dst 239.x.x.x and udp port <port>'` and verifying the receiver joined the group with `ip maddr show`. For jitter and buffering issues, increase `--network-caching` on the receiver.
