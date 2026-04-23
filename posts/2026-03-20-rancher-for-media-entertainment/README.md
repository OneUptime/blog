# How to Set Up Rancher for Media and Entertainment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Media, Entertainment, Video Processing, CDN, Kubernetes, Streaming

Description: Configure Rancher for media and entertainment workloads including video transcoding, content delivery, live streaming infrastructure, and high-throughput storage systems for broadcast and OTT...

## Introduction

Media and entertainment Kubernetes workloads are characterized by high throughput, massive storage requirements, GPU-accelerated transcoding, and traffic spikes during live events. OTT streaming platforms, broadcast systems, and digital asset management all run effectively on Rancher-managed Kubernetes, leveraging burst scaling and object storage integration.

## Media Platform Architecture

```text
┌──────────────────────────────────────────────────┐
│  Rancher Management                               │
└──────────────────────────┬───────────────────────┘
          ┌─────────────────┼─────────────────┐
          │                 │                 │
  ┌───────▼────────┐  ┌─────▼──────┐  ┌──────▼──────────┐
  │ Ingest/         │  │ Transcode  │  │ Distribution    │
  │ Processing      │  │ Cluster    │  │ / CDN Origin    │
  │ Cluster         │  │ (GPU)      │  │ Cluster         │
  └─────────────────┘  └────────────┘  └─────────────────┘
  Live feed ingest      GPU transcode   HLS/DASH serving
  DAM, metadata         HLS packaging   Cache warming
```

## Step 1: GPU Transcoding Cluster

```yaml
# NVIDIA GPU operator for transcoding nodes

helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update
helm install gpu-operator nvidia/gpu-operator \
  --namespace gpu-operator \
  --create-namespace

# Video transcoding job using FFmpeg with GPU acceleration
apiVersion: batch/v1
kind: Job
metadata:
  name: transcode-4k-to-1080p
  namespace: media-processing
spec:
  parallelism: 1       # Transcode one asset per Job
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: ffmpeg
          image: linuxserver/ffmpeg:latest
          command:
            - ffmpeg
            - "-hwaccel"
            - "cuda"
            - "-hwaccel_output_format"
            - "cuda"
            - "-i"
            - "/input/source-4k.mov"
            - "-vf"
            - "scale_cuda=1920:1080"
            - "-c:v"
            - "h264_nvenc"
            - "-preset"
            - "fast"
            - "/output/1080p.mp4"
          resources:
            limits:
              nvidia.com/gpu: "1"
              memory: "8Gi"
          volumeMounts:
            - name: media-input
              mountPath: /input
            - name: media-output
              mountPath: /output
      volumes:
        - name: media-input
          persistentVolumeClaim:
            claimName: raw-media-pvc
        - name: media-output
          persistentVolumeClaim:
            claimName: processed-media-pvc
```

## Step 2: HLS Packaging and Streaming

```yaml
# HLS packager deployment for adaptive bitrate streaming
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hls-packager
  namespace: streaming
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hls-packager
  template:
    metadata:
      labels:
        app: hls-packager
    spec:
      containers:
        - name: packager
          image: google/shaka-packager:v3.7.2
          command:
            - packager
            - "in=udp://239.0.0.1:5000,stream=audio,init_segment=/out/audio-init.mp4,segment_template=/out/audio-$Number$.m4s,playlist_name=/out/audio.m3u8,hls_group_id=audio,hls_name=ENGLISH"
            - "in=udp://239.0.0.1:5001,stream=video,init_segment=/out/720p-init.mp4,segment_template=/out/720p-$Number$.m4s,playlist_name=/out/720p.m3u8"
            - "in=udp://239.0.0.1:5002,stream=video,init_segment=/out/1080p-init.mp4,segment_template=/out/1080p-$Number$.m4s,playlist_name=/out/1080p.m3u8"
            - "--hls_master_playlist_output=/out/master.m3u8"
            - "--hls_playlist_type=LIVE"
            - "--segment_duration=2"
          resources:
            requests:
              cpu: "2"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "4Gi"
          volumeMounts:
            - name: hls-output
              mountPath: /out
      volumes:
        - name: hls-output
          persistentVolumeClaim:
            claimName: hls-output-pvc
```

## Step 3: Object Storage for Media Assets

```yaml
# MinIO for media asset storage
helm repo add minio https://minio.github.io/charts
helm repo update
helm install minio minio/minio \
  --namespace media-storage \
  --create-namespace \
  --set mode=distributed \
  --set replicas=4 \
  --set drivesPerNode=4 \
  --set persistence.size=10Ti \
  --set persistence.storageClass=local-nvme

# Lifecycle policy: transition older content to a lower-cost tier after 90 days
mc ilm tier add s3 myminio MEDIAARCHIVE \
  --endpoint https://s3.amazonaws.com \
  --access-key "$AWS_ACCESS_KEY_ID" \
  --secret-key "$AWS_SECRET_ACCESS_KEY" \
  --bucket media-archive \
  --storage-class "STANDARD-IA" \
  --region us-east-1

mc ilm rule add \
  --transition-days "90" \
  --transition-tier "MEDIAARCHIVE" \
  myminio/media-assets
```

## Step 4: KEDA-Based Autoscaling for Live Events

```yaml
# Scale transcoding workers based on queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: transcode-worker-scaler
  namespace: media-processing
spec:
  scaleTargetRef:
    name: transcode-workers
  minReplicaCount: 2
  maxReplicaCount: 50    # Scale to 50 during live events
  triggers:
    - type: rabbitmq
      metadata:
        queueName: transcoding-jobs
        mode: QueueLength
        value: "5"    # 1 worker per 5 jobs in queue
        hostFromEnv: RABBITMQ_URI
```

## Step 5: CDN Origin Serving

```yaml
# NGINX-based CDN origin with caching
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-cdn-config
  namespace: cdn-origin
data:
  nginx.conf: |
    proxy_cache_path /cache/media levels=1:2
      keys_zone=media_cache:100m
      max_size=500g
      inactive=7d
      use_temp_path=off;

    server {
      listen 80;
      location ~* \.(m3u8|m4s|mp4|ts)$ {
        proxy_cache media_cache;
        proxy_cache_valid 200 1d;
        proxy_cache_use_stale error timeout updating;
        proxy_pass http://minio.media-storage.svc:9000;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Cache-Status $upstream_cache_status;
      }
    }
```

## Step 6: Event-Driven Live Streaming

```yaml
# RTMP ingest endpoint for live contribution feeds
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rtmp-ingest
  namespace: streaming
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rtmp-ingest
  template:
    metadata:
      labels:
        app: rtmp-ingest
    spec:
      containers:
        - name: nginx-rtmp
          image: tiangolo/nginx-rtmp
          ports:
            - containerPort: 1935    # RTMP
          resources:
            requests:
              cpu: "4"
              memory: "4Gi"
---
# LoadBalancer for RTMP ingest
apiVersion: v1
kind: Service
metadata:
  name: rtmp-ingest-lb
  namespace: streaming
spec:
  type: LoadBalancer
  selector:
    app: rtmp-ingest
  ports:
    - port: 1935
      targetPort: 1935
      name: rtmp
```

## Conclusion

Rancher manages media and entertainment Kubernetes clusters that demand GPU transcoding, high-throughput storage, and massive autoscaling during live events. KEDA-based autoscaling handles traffic spikes from thousands to millions of concurrent viewers. MinIO provides on-premises S3-compatible media storage, while NGINX handles CDN origin serving with aggressive caching. The combination of GPU operator, HLS packaging, and object storage makes Rancher a complete platform for broadcast, OTT, and digital asset management workloads.
