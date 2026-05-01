# How to Configure FFmpeg for IPv6 Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FFmpeg, IPv6, Streaming, Transcoding, Media, RTMP, HLS

Description: Use FFmpeg to stream, transcode, and relay media over IPv6 networks, covering input/output URLs with IPv6 addresses and network streaming options.

---

FFmpeg is the Swiss Army knife of media processing. It supports IPv6 across common network protocols, using bracket notation for literal IPv6 addresses in URLs. This enables streaming, transcoding, and relay tasks over IPv6-capable networks.

## FFmpeg IPv6 URL Syntax

```bash
# IPv6 addresses in FFmpeg URLs use bracket notation

# Protocol://[ipv6address]:port/path

# Examples:
# RTMP:     rtmp://[2001:db8::10]/live/stream
# HTTP HLS: http://[2001:db8::20]/hls/stream.m3u8
# SRT:      srt://[2001:db8::30]:9000
# RTSP:     rtsp://[2001:db8::40]:554/stream
# UDP:      udp://[2001:db8::50]:1234
# TCP:      tcp://[2001:db8::60]:9999
```

## Streaming to IPv6 RTMP Server

```bash
# Encode from file and stream to IPv6 RTMP
ffmpeg -re \
  -i input.mp4 \
  -c:v libx264 -preset veryfast -b:v 2000k \
  -c:a aac -b:a 128k \
  -f flv \
  "rtmp://[2001:db8::10]/live/mystream"

# Stream from webcam to IPv6 RTMP
ffmpeg \
  -f v4l2 -i /dev/video0 \
  -f alsa -i default \
  -c:v libx264 -preset ultrafast \
  -c:a aac \
  -f flv \
  "rtmp://[2001:db8::10]/live/webcam"

# Multi-bitrate output to IPv6 RTMP
ffmpeg -re -i input.mp4 \
  -filter_complex "[0:v]split=2[v1][v2]" \
  -map "[v1]" -c:v libx264 -b:v 3000k -f flv "rtmp://[2001:db8::10]/live/high" \
  -map "[v2]" -c:v libx264 -b:v 1000k -f flv "rtmp://[2001:db8::10]/live/low"
```

## Receiving Streams from IPv6 Sources

```bash
# Pull RTSP stream from IPv6 camera
ffmpeg -i "rtsp://[2001:db8::40]:554/stream" \
  -c:v copy \
  -c:a copy \
  output.mp4

# Receive UDP multicast over IPv6
ffmpeg -i "udp://[ff3e::1]:1234" \
  -c copy output.ts

# Receive SRT from IPv6 sender
ffmpeg -i "srt://[2001:db8::30]:9000?mode=caller" \
  -c copy output.ts

# Listen for SRT on IPv6 (listener mode)
ffmpeg -i "srt://[::]:9000?mode=listener" \
  -c copy output.ts
```

## HLS Generation from IPv6 Source

```bash
# Pull stream from IPv6 RTMP and create HLS
ffmpeg -i "rtmp://[2001:db8::10]/live/stream" \
  -c:v libx264 -b:v 3000k \
  -c:a aac -b:a 128k \
  -f hls \
  -hls_time 6 \
  -hls_list_size 5 \
  -hls_segment_filename "/var/www/html/hls/seg_%03d.ts" \
  /var/www/html/hls/playlist.m3u8

# Multi-bitrate HLS from IPv6 source
ffmpeg -i "rtmp://[2001:db8::10]/live/stream" \
  -map 0:v -map 0:a -map 0:v -map 0:a -map 0:v -map 0:a \
  -c:v libx264 -c:a aac \
  -b:v:0 4000k -s:v:0 1920x1080 \
  -b:v:1 2000k -s:v:1 1280x720 \
  -b:v:2 800k -s:v:2 854x480 \
  -b:a:0 128k -b:a:1 128k -b:a:2 96k \
  -f hls -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  -master_pl_name master.m3u8 \
  -hls_segment_filename "/var/www/html/hls/stream_%v_%03d.ts" \
  /var/www/html/hls/stream_%v.m3u8
```

## FFmpeg Network Relay over IPv6

```bash
# Relay RTMP from IPv4 to IPv6 destination
ffmpeg -i "rtmp://source-server/live/stream" \
  -c:v copy -c:a copy \
  -f flv \
  "rtmp://[2001:db8::20]/live/stream"

# Relay UDP multicast to IPv6 unicast
ffmpeg -i "udp://239.0.0.1:1234" \
  -c copy \
  -f mpegts \
  "udp://[2001:db8::50]:1234"
```

## FFmpeg IPv6 Network Options

```bash
# Use a literal IPv6 address to ensure the connection uses IPv6
ffmpeg -i "rtmp://[2001:db8::10]/live/key" \
  -c copy output.ts

# Bind UDP multicast reception to a specific local IPv6 address
ffmpeg -i "udp://[ff3e::1]:1234?localaddr=2001:db8:1::2" \
  -c copy \
  output.ts

# Check FFmpeg network support
ffmpeg -protocols | grep -E "rtmp|srt|udp|tcp|http"
```

FFmpeg's native support for bracketed IPv6 literals (`[2001:db8::address]`) lets the same streaming and transcoding workflows work over IPv6. In most cases the main change is the URL host syntax, though protocol-specific options such as `localaddr` or `local_addr` can be useful when binding a local IPv6 address.
