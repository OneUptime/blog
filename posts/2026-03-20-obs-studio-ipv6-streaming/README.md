# How to Configure OBS Studio for IPv6 Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OBS Studio, IPv6, Streaming, Live Streaming, RTMP, SRT, Broadcasting

Description: Configure OBS Studio to stream live content to IPv6 RTMP or SRT servers, enabling content creators to reach streaming infrastructure on IPv6 networks.

---

OBS Studio (Open Broadcaster Software) is the leading open-source streaming and recording software. It supports IPv6 streaming destinations through custom RTMP server URLs and SRT stream settings.

## Configuring OBS for IPv6 RTMP Streaming

```text
OBS Studio > Settings > Stream

Service: Custom...
Server: rtmp://[2001:db8::rtmp-server]/live
Stream Key: mystream

Click OK and start streaming

Note: OBS uses bracket notation for IPv6 addresses in RTMP URLs
The format is: rtmp://[IPv6address]/application/stream-key
```

## OBS IPv6 Custom RTMP Configuration

```text
For fine-grained control:

Settings > Stream > Service: Custom...
Server: rtmp://[2001:db8::server]:1935/live
Stream Key: your-stream-key

Advanced > Network:
- Enable network optimizations: Yes
- Use TCP optimizations: Yes
```

## OBS SRT Streaming to IPv6

```text
OBS supports SRT as an output protocol:

Settings > Stream > Service: Custom...

For SRT over IPv6:
Server: srt://[2001:db8::srt-server]:9000
Stream Key: (leave empty for SRT)

SRT Parameters can be appended:
Server: srt://[2001:db8::srt-server]:9000?latency=200&encryption=1

Note: OBS 27+ has native SRT support
```

## Command-Line OBS with IPv6

```bash
# OBS can be controlled via obs-websocket and scripts

# For headless/server OBS:

# Start OBS with replay buffer enabled (Linux)
obs --startreplaybuffer --minimize-to-tray

# Script to change stream URL dynamically
obs-cmd --websocket localhost:4455 \
  config stream server "rtmp://[2001:db8::server]/live"
```

## FFmpeg as OBS Virtual Camera Source

```bash
# Send FFmpeg output to OBS virtual camera
# First, install v4l2loopback for virtual camera
sudo apt install v4l2loopback-dkms v4l2loopback-utils -y
sudo modprobe v4l2loopback video_nr=10 card_label="OBS Virtual Camera"

# Pipe IPv6 RTMP stream into virtual camera
ffmpeg -i "rtmp://[2001:db8::source]/live/stream" \
  -f v4l2 /dev/video10

# OBS can then use /dev/video10 as a video source
```

## OBS Recording and Streaming Simultaneously

```text
Settings > Output > Mode: Advanced

Recording:
- Path: /home/user/recordings/
- Format: MKV

Streaming:
- Service: Custom
- Server: rtmp://[2001:db8::server]/live
- Key: stream_key

Enable: "Start Recording" and "Start Streaming" simultaneously
```

## Testing IPv6 Stream from OBS

```bash
# Verify your streaming server accepts IPv6 connections
# Check RTMP server logs when OBS connects

# On RTMP server, watch for IPv6 connection
sudo tail -f /var/log/nginx/access.log | grep "2001:\|::1"

# Monitor RTMP stats
curl http://localhost/stat 2>/dev/null | grep "2001:\|ipv6"

# Test the stream is playing correctly
ffplay "rtmp://[2001:db8::server]/live/mystream"
```

## OBS Browser Source with IPv6 URLs

```text
Add Browser Source in OBS:
URL: http://[2001:db8::web-server]/overlay.html

This enables web overlays served from IPv6 hosts
The built-in CEF browser handles IPv6 URLs natively
```

## Troubleshooting OBS IPv6 Connectivity

```text
Common Issues:

1. OBS fails to connect to IPv6 RTMP:
   - Verify server is listening: ss -6 -tlnp | grep 1935
   - Test RTMP URL with FFmpeg first:
     ffmpeg -i test.mp4 -f flv "rtmp://[2001:db8::server]/live/test"
   - Check Windows Firewall / ip6tables

2. High latency or packet loss:
   - Try SRT instead of RTMP for IPv6 (better loss recovery)
   - Check IPv6 path quality: mtr -6 2001:db8::server

3. OBS shows "Invalid Path/Connection URL":
   - Ensure brackets around IPv6: rtmp://[2001:db8::srv]/live
   - Verify port is correct (default RTMP: 1935)
```

OBS Studio's support for bracket-notation IPv6 URLs in the Server field enables direct streaming to IPv6 RTMP and SRT destinations, making it straightforward for content creators to use IPv6 streaming infrastructure without any special plugins or modifications.
