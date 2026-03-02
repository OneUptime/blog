# How to Set Up SRS (Simple Real-Time Server) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Streaming, SRS, RTMP, HLS

Description: Complete guide to installing and configuring SRS (Simple Real-Time Server) on Ubuntu for scalable live streaming with RTMP, HLS, and WebRTC support.

---

SRS (Simple Real-Time Server) is a high-performance, open-source streaming server written in C++. It handles RTMP, HLS, HTTP-FLV, SRT, and WebRTC delivery from a single binary with a clean configuration format. SRS is used in production by companies that need a lightweight but capable media server without the overhead of Java-based alternatives like Wowza.

## Overview of SRS Capabilities

- RTMP ingest from OBS, FFmpeg, or hardware encoders
- HLS output for broad device compatibility
- HTTP-FLV for low-latency browser playback
- WebRTC support for sub-second streaming
- SRT ingest for contribution-quality feeds
- Cluster mode for horizontal scaling
- Built-in HTTP API for monitoring and control

## Installing SRS

SRS provides pre-built Docker images and release binaries. For a bare-metal Ubuntu install, the binary approach works well.

```bash
# Install prerequisites
sudo apt update
sudo apt install -y wget tar

# Download SRS 6.x stable release (check GitHub for latest version)
SRS_VERSION="6.0.50"
wget "https://github.com/ossrs/srs/releases/download/v${SRS_VERSION}/SRS-CentOS7-x86_64-${SRS_VERSION}.tar.gz"

# If the binary format doesn't match Ubuntu, build from source instead
sudo apt install -y gcc g++ make cmake git libssl-dev libst-dev
git clone -b develop https://github.com/ossrs/srs.git
cd srs/trunk
./configure
make -j$(nproc)
```

For Ubuntu, building from source is the most reliable method:

```bash
# Clone the SRS repository
git clone https://github.com/ossrs/srs.git
cd srs/trunk

# Configure the build - enable all common features
./configure --with-ssl --with-hls --with-http-callback --with-http-server --with-http-api --with-ffmpeg --with-transcode

# Build using all available CPU cores
make -j$(nproc)

# The binary will be at: ./objs/srs
ls -la objs/srs
```

## Creating the Configuration File

SRS uses a simple custom configuration language. Create a configuration file:

```bash
sudo mkdir -p /etc/srs
sudo nano /etc/srs/srs.conf
```

Paste in this complete configuration:

```conf
# SRS configuration file
# Bind to all interfaces on standard RTMP port
listen              1935;
max_connections     1000;

# Enable HTTP API on port 1985
http_api {
    enabled         on;
    listen          1985;
}

# Built-in HTTP server for HLS delivery
http_server {
    enabled         on;
    listen          8080;
    dir             ./objs/nginx/html;
}

# Statistics and monitoring
stats {
    network         0;
    disk            sda sdb xvda xvdb;
}

# Virtual host definition
vhost __defaultVhost__ {
    # HLS output configuration
    hls {
        enabled         on;
        hls_path        ./objs/nginx/html;
        hls_fragment    10;
        hls_window      60;
    }

    # HTTP-FLV for low-latency browser playback
    http_remux {
        enabled     on;
        mount       [vhost]/[app]/[stream].flv;
    }

    # DVR - save streams to disk (disabled by default)
    dvr {
        enabled         off;
        dvr_path        ./objs/nginx/html/[app]/[stream]/[2006][01][02]-[15][04][05]-[timestamp].flv;
        dvr_plan        session;
    }

    # Transcode using FFmpeg (disabled - enable if you need multi-bitrate)
    # transcode {
    #     enabled     on;
    #     ffmpeg      /usr/bin/ffmpeg;
    #     engine {
    #         enabled on;
    #         vcodec  libx264;
    #         vbitrate 500;
    #         vfps    25;
    #         vwidth  768;
    #         vheight 320;
    #         acodec  aac;
    #         abitrate 128;
    #         asample_rate 44100;
    #         output  rtmp://127.0.0.1:[port]/[app]?vhost=[vhost]/[stream]_ld;
    #     }
    # }
}
```

## Setting Up a Systemd Service

Create a service file so SRS starts automatically:

```bash
sudo nano /etc/systemd/system/srs.service
```

```ini
[Unit]
Description=SRS Simple Real-Time Server
After=network.target
Documentation=https://github.com/ossrs/srs

[Service]
Type=forking
# Adjust the path to match where you built SRS
WorkingDirectory=/home/ubuntu/srs/trunk
ExecStart=/home/ubuntu/srs/trunk/objs/srs -c /etc/srs/srs.conf
ExecStop=/bin/kill -s QUIT $MAINPID
ExecReload=/bin/kill -s HUP $MAINPID
PIDFile=/home/ubuntu/srs/trunk/objs/srs.pid
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd, enable and start SRS
sudo systemctl daemon-reload
sudo systemctl enable srs
sudo systemctl start srs
sudo systemctl status srs
```

## Configuring Firewall Rules

```bash
# RTMP ingest
sudo ufw allow 1935/tcp

# HTTP server for HLS delivery
sudo ufw allow 8080/tcp

# HTTP API for monitoring
sudo ufw allow 1985/tcp

sudo ufw reload
```

## Pushing and Playing Streams

Push an RTMP stream from OBS or FFmpeg:

```bash
# Generate a test stream with FFmpeg and push to SRS
ffmpeg \
    -re \
    -f lavfi -i testsrc=size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=440 \
    -c:v libx264 -preset veryfast -b:v 1500k \
    -c:a aac -b:a 128k \
    -f flv "rtmp://YOUR_SERVER_IP/live/stream1"
```

Playback URLs:

```
# RTMP playback (VLC, FFmpeg)
rtmp://YOUR_SERVER_IP/live/stream1

# HLS playback (any browser or media player)
http://YOUR_SERVER_IP:8080/live/stream1.m3u8

# HTTP-FLV (low latency, requires FLV-capable player)
http://YOUR_SERVER_IP:8080/live/stream1.flv
```

Test HLS playback:

```bash
# Play HLS stream with FFplay
ffplay http://YOUR_SERVER_IP:8080/live/stream1.m3u8
```

## Using the HTTP API

SRS exposes a REST API for monitoring and control:

```bash
# Check server version and health
curl http://YOUR_SERVER_IP:1985/api/v1/versions

# List all active streams
curl http://YOUR_SERVER_IP:1985/api/v1/streams

# List active clients
curl http://YOUR_SERVER_IP:1985/api/v1/clients

# Get server summary (bandwidth, connections)
curl http://YOUR_SERVER_IP:1985/api/v1/summaries
```

The API response is JSON, making it easy to integrate with monitoring tools:

```bash
# Pretty-print the streams list
curl -s http://YOUR_SERVER_IP:1985/api/v1/streams | python3 -m json.tool
```

## Enabling On-Publish and On-Play Callbacks

SRS can notify your application when streams start or stop. This is useful for authentication or logging:

```conf
vhost __defaultVhost__ {
    http_hooks {
        enabled         on;
        # Called when a publisher connects
        on_publish      http://your-app:8080/srs/publish;
        # Called when a publisher disconnects
        on_unpublish    http://your-app:8080/srs/unpublish;
        # Called when a viewer starts playing
        on_play         http://your-app:8080/srs/play;
        # Called when a viewer stops
        on_stop         http://your-app:8080/srs/stop;
    }
}
```

SRS sends a POST request with stream info (app, stream name, client IP, etc.) to your endpoint. Return HTTP 200 to allow the connection or anything else to reject it.

## Cluster Mode for Scale

SRS supports an origin-edge cluster model. The origin server ingests streams, and edge servers pull and deliver to viewers:

```conf
# Edge server configuration - pulls from origin on demand
vhost __defaultVhost__ {
    cluster {
        mode        remote;
        origin      ORIGIN_SERVER_IP:1935;
    }
}
```

Edges only pull the stream when a viewer requests it, which reduces load on the origin.

## Enabling WebRTC

SRS 5.x and later include WebRTC support:

```conf
# Add to srs.conf for WebRTC support
rtc_server {
    enabled on;
    listen  8000;      # UDP port for WebRTC media
    candidate YOUR_PUBLIC_IP;
}

vhost __defaultVhost__ {
    rtc {
        enabled     on;
        # Forward RTMP streams to WebRTC for ultra-low latency
        rtmp_to_rtc on;
    }
}
```

WebRTC playback URL:

```
webrtc://YOUR_PUBLIC_IP/live/stream1
```

## Checking Logs

SRS logs to its working directory by default:

```bash
# Follow live log output
tail -f /home/ubuntu/srs/trunk/objs/srs.log

# Search for errors
grep -i error /home/ubuntu/srs/trunk/objs/srs.log
```

## Troubleshooting

**Stream published but HLS returns 404**: Check that the hls_path directory exists and SRS has write permissions to it. The m3u8 file appears only after the first HLS fragment is written.

**API returns connection refused on port 1985**: The `http_api` block might be missing from the config or SRS failed to bind. Check logs for "listen at port 1985" confirmation.

**FFmpeg connection refused on port 1935**: Verify SRS is running and port 1935 is not blocked. Try `nc -zv YOUR_SERVER_IP 1935` to test connectivity.

SRS is a compact, well-documented streaming server that covers the major streaming protocols without requiring complex dependencies. Its configuration format is readable, and the built-in HTTP API makes integration with existing infrastructure straightforward.
