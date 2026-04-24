# How to Set Up Portainer for Media and Content Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Media, Content Delivery, Docker, Streaming, CDN

Description: Configure Portainer to manage containerized media processing, transcoding, and content delivery workloads - from ingest pipelines to origin servers and streaming endpoints.

---

Media companies run containerized workloads for video transcoding, content ingest, metadata management, and origin serving. Portainer provides a unified management layer across these services, making it easier to deploy, scale, and monitor media infrastructure without writing complex orchestration code.

## Media Infrastructure Container Architecture

```mermaid
graph LR
    Ingest[Ingest Container] --> Transcode[FFmpeg Transcoder]
    Transcode --> Storage[(Object Storage)]
    Storage --> Origin[Origin Server Container]
    Origin --> CDN[CDN Edge Cache]
    CDN --> Viewer[Viewer]
```

## Step 1: Deploy a Video Transcoding Stack

Use Portainer to deploy an FFmpeg-based transcoding pipeline:

```yaml
# media-transcode-stack.yml

services:
  transcode-worker:
    image: jrottenberg/ffmpeg:7.1-alpine320
    entrypoint: ["/bin/sh", "-c"]
    command: >
      while true; do
        mkdir -p /input/processing /input/processed /input/failed;
        for input_file in /input/*.mp4; do
          [ -e "$input_file" ] || break;
          filename="$(basename "$input_file")";
          mv "$input_file" "/input/processing/$filename" || continue;
          if ffmpeg -y -i "/input/processing/$filename"
            -c:v libx264 -preset fast -crf 22
            -c:a aac -b:a 128k
            "/output/${filename%.*}_720p.mp4"; then
            mv "/input/processing/$filename" /input/processed/;
          else
            mv "/input/processing/$filename" /input/failed/;
          fi;
        done;
        sleep 5;
      done
    volumes:
      - media-input:/input
      - media-output:/output
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2g

  nginx-origin:
    image: nginx:alpine
    volumes:
      - media-output:/usr/share/nginx/html/media:ro
      - /opt/media-stack/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "8080:80"
    restart: unless-stopped

volumes:
  media-input:
  media-output:
```

## Step 2: Configure Origin Server

Create an Nginx configuration optimized for media serving and save it as `/opt/media-stack/nginx.conf` on the Docker host:

```nginx
# nginx.conf for media origin
server {
    listen 80;
    
    location /media/ {
        root /usr/share/nginx/html;
        
        # Enable sendfile for large media files
        sendfile on;
        sendfile_max_chunk 1m;
        tcp_nopush on;
        
        # Set cache headers for CDN caching
        add_header Cache-Control "public, max-age=86400";
        add_header Access-Control-Allow-Origin "*";
        
        # Expose byte-range capability for media clients
        add_header Accept-Ranges bytes;
    }
}
```

## Step 3: Deploy HLS Streaming with Portainer

For live streaming using nginx-rtmp, save the following `rtmp.conf` as `/opt/media-stack/rtmp.conf` on the Docker host:

```nginx
worker_processes auto;
rtmp_auto_push on;

events {}

rtmp {
    server {
        listen 1935;

        application live {
            live on;
            record off;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 5s;
        }
    }
}

http {
    server {
        listen 80;

        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
    }
}
```

Then deploy the streaming container:

```yaml
services:
  rtmp-ingest:
    image: tiangolo/nginx-rtmp:latest
    ports:
      - "1935:1935"   # RTMP ingest
      - "8081:80"     # HLS output
    volumes:
      - /opt/media-stack/rtmp.conf:/etc/nginx/nginx.conf:ro
      - hls-segments:/tmp/hls
    restart: unless-stopped

volumes:
  hls-segments:
```

## Step 4: Scale Transcoding Workers

On Docker Swarm endpoints, Portainer makes it easy to scale transcoding capacity for peak demand:

1. Open **Services** in Portainer
2. Select the scale control next to `transcode-worker`
3. Set the desired replica count and apply the change

For Swarm-based scaling, use replicated services with Docker Swarm:

```yaml
deploy:
  mode: replicated
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
```

When you scale across multiple Swarm nodes, replace the default local volumes with shared storage or object storage that every replica can access.

## Step 5: Monitor Transcoding Queue

Use Portainer's container stats view to monitor CPU, memory, network, and I/O on transcoding workers. If you need automated alerting, configure it separately through Portainer Business Edition observability or an external monitoring system.

## Summary

Portainer simplifies media infrastructure management by providing a single control plane for ingest, transcoding, origin serving, and streaming containers. The visual interface makes it easier to scale Swarm services for live events, inspect processing workloads, and manage media storage volumes without complex orchestration tooling.
