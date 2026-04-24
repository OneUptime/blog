# How to Use Portainer for Media and Content Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Media, CDN, Streaming, Content Delivery

Description: Deploy and manage video streaming, content delivery, and media processing applications using Portainer for scalable media infrastructure management.

## Introduction

Media and broadcasting organizations run some of the most demanding containerized workloads: live video transcoding, adaptive bitrate streaming, content delivery networks, and metadata management systems. Portainer provides the operational visibility and deployment automation that media teams need to manage high-throughput, latency-sensitive container infrastructure. This guide covers common media workloads and how to manage them effectively with Portainer. It assumes you are managing a Docker Swarm environment in Portainer, because Portainer's service management and scaling features apply to Swarm endpoints.

## Media Infrastructure Architecture

A typical containerized media platform includes:
- Video ingest and transcoding services
- Adaptive bitrate packaging (HLS/DASH)
- CDN origin servers
- Content metadata management
- DRM license services
- Analytics and monitoring

## Step 1: Deploy a Video Transcoding Stack

```yaml
# transcoding-stack/docker-compose.yml

version: '3.8'
services:
  ingest:
    image: media/ingest-service:v3.1
    restart: always
    ports:
      - "1935:1935"   # RTMP ingest
      - "9000:9000/udp"   # SRT ingest
    environment:
      - MAX_STREAMS=100
      - QUEUE_URL=redis://queue:6379
    volumes:
      - ingest-temp:/tmp/ingest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4'
          memory: 4g

  transcoder:
    image: media/ffmpeg-transcoder:v2.8
    restart: always
    runtime: nvidia   # GPU transcoding
    environment:
      - QUEUE_URL=redis://queue:6379
      - PROFILES=360p,720p,1080p,4K
      - OUTPUT_STORE=s3://media-bucket/transcoded
      - AWS_DEFAULT_REGION=us-east-1
    volumes:
      - /tmp/transcode:/workspace
    deploy:
      replicas: 4    # Scale based on queue depth
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  packager:
    image: media/hls-packager:v1.9
    restart: always
    environment:
      - INPUT_STORE=s3://media-bucket/transcoded
      - OUTPUT_STORE=s3://media-bucket/hls
      - SEGMENT_DURATION=6
      - DRM_ENABLED=true
    ports:
      - "8080:8080"

  queue:
    image: redis:7-alpine
    restart: always
    volumes:
      - queue-data:/data

volumes:
  ingest-temp:
  queue-data:
```

## Step 2: CDN Origin Server Setup

```yaml
# cdn-origin/docker-compose.yml
version: '3.8'
services:
  nginx-origin:
    image: nginx:1.25-alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx-origin.conf:/etc/nginx/nginx.conf:ro
      - /data/media:/usr/share/nginx/html:ro
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

  varnish-cache:
    image: varnish:7.4
    restart: always
    ports:
      - "6081:80"
    environment:
      - VARNISH_SIZE=2G
    volumes:
      - ./varnish.vcl:/etc/varnish/default.vcl:ro
```

```nginx
# nginx-origin.conf for media delivery
worker_processes auto;
events {
    worker_connections 10000;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Enable sendfile for efficient file serving
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # Large files optimization
    output_buffers 2 512k;
    postpone_output 1460;
    
    server {
        listen 80;
        root /usr/share/nginx/html;
        
        # HLS streaming
        location ~ \.m3u8$ {
            add_header Cache-Control "no-cache";
            add_header Access-Control-Allow-Origin "*";
        }
        
        location ~ \.ts$ {
            add_header Cache-Control "max-age=86400";
        }
    }
}
```

## Step 3: Scale Transcoders Based on Queue Depth

```bash
#!/bin/bash
# autoscale-transcoders.sh
PORTAINER_URL="https://portainer.media.com"
API_KEY="ops-api-key"
ENDPOINT_ID=1
STACK_NAME="transcoding-stack"
SERVICE_NAME="${STACK_NAME}_transcoder"
QUEUE_URL="redis://queue.media.local:6379"

# Get current queue depth from Redis
QUEUE_DEPTH=$(redis-cli -u "$QUEUE_URL" LLEN transcode_queue)
echo "Current queue depth: $QUEUE_DEPTH"

# Get current service spec and replica count
SERVICE_JSON=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_NAME")

CURRENT_REPLICAS=$(printf '%s' "$SERVICE_JSON" | \
  python3 -c "import sys,json; s=json.load(sys.stdin); print(s['Spec']['Mode']['Replicated']['Replicas'])")

SERVICE_VERSION=$(printf '%s' "$SERVICE_JSON" | \
  python3 -c "import sys,json; s=json.load(sys.stdin); print(s['Version']['Index'])")

# Calculate desired replicas (1 transcoder per 10 items in queue)
DESIRED_REPLICAS=$(( ($QUEUE_DEPTH / 10) + 1 ))
MAX_REPLICAS=20
DESIRED_REPLICAS=$(( DESIRED_REPLICAS > MAX_REPLICAS ? MAX_REPLICAS : DESIRED_REPLICAS ))

if [ "$DESIRED_REPLICAS" != "$CURRENT_REPLICAS" ]; then
  echo "Scaling from $CURRENT_REPLICAS to $DESIRED_REPLICAS replicas"
  UPDATED_SPEC=$(printf '%s' "$SERVICE_JSON" | \
    python3 -c "import json,sys; s=json.load(sys.stdin); s['Spec']['Mode']['Replicated']['Replicas']=int(sys.argv[1]); print(json.dumps(s['Spec']))" "$DESIRED_REPLICAS")

  curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$UPDATED_SPEC" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_NAME/update?version=$SERVICE_VERSION"
fi
```

## Step 4: Live Streaming Pipeline

```yaml
# live-streaming/docker-compose.yml
version: '3.8'
services:
  media-server:
    image: tiangolo/nginx-rtmp:latest
    restart: always
    ports:
      - "1935:1935"   # RTMP
      - "8080:8080"   # HLS output
    volumes:
      - ./nginx-rtmp.conf:/etc/nginx/nginx.conf:ro
      - live-segments:/tmp/hls

  stream-monitor:
    image: media/stream-health:v1.3
    restart: always
    environment:
      - STREAMS_ENDPOINT=http://media-server:8080/stat
      - ALERT_WEBHOOK=https://hooks.slack.com/your-webhook
      - CHECK_INTERVAL=30

volumes:
  live-segments:
```

## Step 5: Content Processing with Watermarking

```bash
# Run a watermarking service
docker service create \
  --name watermark-service \
  --replicas 3 \
  --constraint 'node.labels.gpu==true' \
  --network transcoding-stack_default \
  --mount type=volume,source=media-input,target=/input \
  --mount type=volume,source=media-output,target=/output \
  -e WATERMARK_TEXT="© MediaCo 2026" \
  -e WATERMARK_OPACITY=0.3 \
  -e QUEUE_URL=redis://transcoding-stack_queue:6379 \
  media/watermarker:v2.1
```

## Step 6: Media Analytics

```yaml
# analytics/docker-compose.yml
version: '3.8'
services:
  view-tracker:
    image: media/view-analytics:v1.5
    restart: always
    environment:
      - KAFKA_BROKERS=kafka:9092
      - CLICKHOUSE_URL=http://clickhouse:8123
    ports:
      - "9200:9200"

  clickhouse:
    image: clickhouse/clickhouse-server:23.8
    restart: always
    volumes:
      - analytics-data:/var/lib/clickhouse
    ulimits:
      nofile:
        soft: 262144
        hard: 262144

volumes:
  analytics-data:
```

## Conclusion

Media and content delivery containerized workloads require careful resource management, GPU access for transcoding, and intelligent scaling based on processing queue depth. Portainer provides the visibility to monitor transcoding services, scale replicas in response to demand, and manage rolling updates without disrupting live streams. The combination of Portainer's service management with media-specific tools like FFmpeg transcoders, Nginx RTMP servers, and Redis queues creates a robust, manageable media delivery infrastructure.
