# How to Set Up Nginx RTMP Server for Live Streaming on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Nginx, Streaming, RTMP, Video

Description: Learn how to install and configure the Nginx RTMP module on Ubuntu to host your own live streaming server with HLS and DASH output.

---

Self-hosting a live streaming server gives you full control over your stream quality, latency, and data. The Nginx RTMP module turns your Ubuntu server into a capable streaming endpoint that can accept RTMP pushes from OBS or any encoder and relay them to viewers as HLS or DASH. This tutorial walks through the full setup process.

## Prerequisites

Before starting, you need:

- Ubuntu 20.04 or 22.04 server
- Root or sudo access
- A domain name pointing to your server (optional but recommended for production)
- At least 2 CPU cores and 2GB RAM for modest streaming loads

## Installing Nginx with the RTMP Module

Ubuntu's default Nginx package does not include the RTMP module, so you have two options: build from source or install a pre-packaged version. The `libnginx-mod-rtmp` package available in the Ubuntu repos is the easiest path.

```bash
# Update package lists and install Nginx along with the RTMP module
sudo apt update
sudo apt install nginx libnginx-mod-rtmp -y

# Verify the module is present
nginx -V 2>&1 | grep rtmp
```

If the module does not show up, you may need to install from the `nginx-extras` package instead:

```bash
sudo apt install nginx-extras -y
```

## Configuring the RTMP Block

Nginx's RTMP configuration sits outside the standard `http` block. Open the main config file:

```bash
sudo nano /etc/nginx/nginx.conf
```

Append the following at the end of the file, after the closing brace of the `http` block:

```nginx
# RTMP server block - listens on standard RTMP port 1935
rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        # Application name - this becomes part of the stream URL
        application live {
            live on;
            # Disable recording to conserve disk space; enable if you need VOD
            record off;

            # Generate HLS output so browser clients can watch
            hls on;
            hls_path /var/www/html/hls;
            hls_fragment 3;
            hls_playlist_length 60;

            # Generate DASH output as an alternative
            dash on;
            dash_path /var/www/html/dash;
        }
    }
}
```

## Setting Up HLS Delivery via HTTP

The HLS segments need to be served over HTTP. Add a location block inside the existing `server` block in `/etc/nginx/sites-available/default`:

```bash
sudo nano /etc/nginx/sites-available/default
```

Add these location blocks inside the `server { }` stanza:

```nginx
# Serve HLS segments with proper MIME types and CORS headers
location /hls {
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
    root /var/www/html;
    add_header Cache-Control no-cache;
    add_header Access-Control-Allow-Origin *;
}

# Serve DASH manifests and segments
location /dash {
    root /var/www/html;
    add_header Cache-Control no-cache;
    add_header Access-Control-Allow-Origin *;
}
```

## Creating Output Directories

The RTMP module writes HLS and DASH files to disk. Those directories must exist and be writable by the Nginx process:

```bash
# Create directories for HLS and DASH output
sudo mkdir -p /var/www/html/hls /var/www/html/dash

# Set ownership to the www-data user that Nginx runs as
sudo chown -R www-data:www-data /var/www/html/hls /var/www/html/dash
```

## Validating and Reloading Nginx

```bash
# Test configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes without dropping connections
sudo systemctl reload nginx

# Open RTMP port in the firewall
sudo ufw allow 1935/tcp
sudo ufw allow 80/tcp
```

## Pushing a Stream with OBS

In OBS Studio:

1. Go to Settings > Stream
2. Set Service to "Custom..."
3. Set Server to `rtmp://YOUR_SERVER_IP/live`
4. Set Stream Key to any string, such as `mystream`

Click "Start Streaming". Your stream key becomes part of the HLS URL:

```
http://YOUR_SERVER_IP/hls/mystream.m3u8
```

You can test playback immediately with VLC:

```bash
# Play back the stream using VLC from the command line
vlc http://YOUR_SERVER_IP/hls/mystream.m3u8
```

Or with ffplay:

```bash
ffplay http://YOUR_SERVER_IP/hls/mystream.m3u8
```

## Adding Stream Authentication

Allowing any key to push streams is a security risk. The Nginx RTMP module supports a simple on_publish callback that lets you validate keys against an external service.

Add this inside the `application live` block:

```nginx
# Validate stream keys before accepting a publish connection
on_publish http://localhost:8080/auth;
```

Then run a small HTTP service on port 8080 that returns 2xx for valid keys and 4xx for invalid ones. A minimal Python example:

```python
#!/usr/bin/env python3
# Simple stream key validator
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

VALID_KEYS = {"secret123", "anotherkey"}

class AuthHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = urllib.parse.parse_qs(self.rfile.read(length).decode())
        key = body.get("name", [""])[0]
        if key in VALID_KEYS:
            self.send_response(200)
        else:
            self.send_response(403)
        self.end_headers()

HTTPServer(("127.0.0.1", 8080), AuthHandler).serve_forever()
```

## Transcoding to Multiple Bitrates

For adaptive streaming, you can use FFmpeg to transcode the incoming stream into multiple quality levels. Add exec_push directives inside the application block:

```nginx
application live {
    live on;
    record off;

    # Transcode incoming stream to 720p and 480p using FFmpeg
    exec_push ffmpeg -i rtmp://localhost/live/$name
        -c:v libx264 -b:v 2500k -s 1280x720 -f flv rtmp://localhost/hls/$name_720p
        -c:v libx264 -b:v 800k  -s 854x480  -f flv rtmp://localhost/hls/$name_480p
        2>>/var/log/nginx/ffmpeg_$name.log;
}

# Separate application for HLS output of transcoded streams
application hls {
    live on;
    hls on;
    hls_path /var/www/html/hls;
    hls_fragment 3;
    hls_playlist_length 60;
    record off;
}
```

## Monitoring the RTMP Server

The RTMP module has a built-in statistics page. Add this location block to your Nginx HTTP server:

```nginx
# RTMP statistics page - restrict access to trusted IPs
location /stat {
    rtmp_stat all;
    rtmp_stat_stylesheet stat.xsl;
    allow 127.0.0.1;
    deny all;
}

location /stat.xsl {
    root /usr/share/doc/libnginx-mod-rtmp;
}
```

After reloading Nginx, visit `http://YOUR_SERVER_IP/stat` from localhost or through an SSH tunnel to see active connections and stream details.

## Cleaning Up Old HLS Segments

HLS segments accumulate over time. Set up a cron job to purge old files:

```bash
# Open crontab for editing
crontab -e
```

Add this line to delete HLS segments older than 1 hour every 15 minutes:

```cron
*/15 * * * * find /var/www/html/hls -name "*.ts" -mmin +60 -delete
```

## Troubleshooting

**Stream connects but no video appears**: Check that FFmpeg is installed if you have exec_push directives. Run `which ffmpeg` to confirm.

**HLS playlist returns 404**: Verify the hls_path directory exists and is owned by www-data. Check Nginx error logs at `/var/log/nginx/error.log`.

**High latency**: Reduce `hls_fragment` to 1 or 2 seconds. Lower values increase HTTP request frequency but cut latency significantly.

**Port 1935 blocked**: Many cloud providers block non-standard ports by default. Check both your OS firewall with `sudo ufw status` and any cloud security group rules.

The Nginx RTMP module is a practical choice for small to medium streaming deployments. It handles reliable ingest from encoders, converts to browser-friendly HLS, and scales reasonably well with enough CPU headroom for transcoding. For very large audiences, consider adding a CDN in front of the HLS endpoint.
