# How to Configure HLS Streaming with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HLS, IPv6, Streaming, Nginx, CDN, Live Streaming, HTTP Live Streaming

Description: Configure HTTP Live Streaming (HLS) to serve video content to viewers over IPv6, including Nginx HLS origin server setup, IPv6 listener configuration, and CDN delivery.

---

HTTP Live Streaming (HLS) is an adaptive streaming protocol that delivers video segments over HTTP. Since HLS is HTTP-based, configuring it for IPv6 primarily involves ensuring the HTTP delivery path listens on IPv6. Playlist URIs can remain relative; if you use literal IPv6 addresses in URLs, enclose them in brackets.

## Setting Up Nginx HLS Origin Server

```nginx
# /etc/nginx/nginx.conf

worker_processes auto;

events {
    worker_connections 4096;
}

rtmp {
    server {
        listen 1935;
        listen [::]:1935;

        application live {
            live on;

            # HLS output
            hls on;
            hls_path /var/www/html/hls;
            hls_fragment 4s;
            hls_playlist_length 24s;

            # Record for VOD
            # record all;
            # record_path /var/recordings;
        }
    }
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        listen [::]:80;
        server_name hls.example.com;

        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /var/www/html;

            # CORS for player access from any origin
            add_header Access-Control-Allow-Origin '*';
            add_header Cache-Control no-cache;

            # Disable cache for live stream playlists
            location ~ \.m3u8$ {
                add_header Access-Control-Allow-Origin '*';
                add_header Cache-Control 'no-cache, no-store, must-revalidate';
                expires -1;
            }
        }
    }
}
```

## Generating HLS with FFmpeg over IPv6

```bash
# Pull RTMP from IPv6 source and output HLS

ffmpeg -i "rtmp://[2001:db8::source]/live/stream" \
  -c:v libx264 -b:v 2000k \
  -c:a aac -b:a 128k \
  -f hls \
  -hls_time 4 \
  -hls_list_size 5 \
  -hls_segment_filename "/var/www/html/hls/seg_%03d.ts" \
  /var/www/html/hls/stream.m3u8

# Multi-bitrate HLS from IPv6 source
ffmpeg -i "rtmp://[2001:db8::source]/live/stream" \
  -filter_complex "[0:v]split=2[v0][v1];[v1]scale=w=640:h=-2[v1out]" \
  -map "[v0]" -map 0:a:0 -map "[v1out]" -map 0:a:0 \
  -c:v libx264 -c:a aac \
  -b:v:0 3000k -b:v:1 1500k \
  -b:a:0 128k -b:a:1 96k \
  -f hls \
  -hls_time 4 \
  -hls_list_size 5 \
  -var_stream_map "v:0,a:0 v:1,a:1" \
  -master_pl_name master.m3u8 \
  -hls_segment_filename "/var/www/html/hls/v%v/seg_%03d.ts" \
  /var/www/html/hls/v%v/stream.m3u8
```

## Firewall for HLS over IPv6

```bash
# Allow HTTP/HTTPS for HLS delivery
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow RTMP ingress from encoders
sudo ip6tables -A INPUT -p tcp --dport 1935 -j ACCEPT

# Save the current IPv6 ruleset; persistence on reboot depends on your distro
sudo ip6tables-save

# Verify Nginx listening on IPv6
ss -6 -tlnp | grep -E "80|443|1935"
```

## HLS Player Configuration for IPv6

```html
<!-- HTML5 HLS Player using hls.js -->
<!DOCTYPE html>
<html>
<head>
    <title>IPv6 HLS Stream</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
</head>
<body>
    <video id="video" controls width="800"></video>
    <script>
        var video = document.getElementById('video');
        var videoSrc = 'http://[2001:db8::hls-server]/hls/stream.m3u8';

        // Literal IPv6 addresses in URLs must be enclosed in brackets
        if (Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoSrc;
        }
    </script>
</body>
</html>
```

## CDN Configuration for IPv6 HLS

```text
Configure CDN origin over IPv6:
- Origin server: hls.example.com
- CDN fetches playlists and segments from the origin over IPv6 or dual-stack, depending on provider settings
- Viewers can still connect over IPv4 or IPv6 independently of origin connectivity

Cloudflare:
- Proxy an A, AAAA, or CNAME record for hls.example.com through Cloudflare
- Proxied hostnames return Cloudflare Anycast IPs, so allow Cloudflare IP ranges at the origin firewall

AWS CloudFront:
- Origin: hls.example.com
- Origin connectivity: IPv6 only or Dual-stack for a custom origin
- Enable viewer IPv6 if you want IPv6 clients to reach the distribution
```

## Testing HLS over IPv6

```bash
# Test HLS playlist is accessible over IPv6
curl -6 http://[2001:db8::hls-server]/hls/stream.m3u8

# Play HLS over IPv6 with FFplay
ffplay "http://[2001:db8::hls-server]/hls/stream.m3u8"

# Download HLS segment
curl -6 -O "http://[2001:db8::hls-server]/hls/seg_001.ts"

# Check HLS playback
vlc "http://[2001:db8::hls-server]/hls/stream.m3u8"
```

HLS over IPv6 requires the full delivery path to support IPv6: the HTTP listener, firewall, DNS/CDN origin settings, and any literal IPv6 URLs must all be configured correctly. Once that path is in place, HLS playlists and segments are served the same way as over IPv4.
