# How to Configure Rook-Ceph for Video Streaming Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Video, Streaming, Object Storage, Kubernetes

Description: Learn how to configure Rook-Ceph to store and serve video content for streaming workloads, including HLS segment storage, CDN integration, and throughput tuning.

---

Video streaming applications require high-throughput, highly available storage for media files, HLS/DASH segments, and video metadata. Rook-Ceph's object storage and CephFS can serve as the foundation for a scalable video storage platform on Kubernetes.

## Storage Architecture for Video Streaming

A typical video streaming backend uses:
- **Object storage (RGW)** - Store raw uploads, transcoded files, HLS/DASH segments
- **CephFS** - Working space for transcoding jobs (temporary files, high-write throughput)
- **Block storage (RBD)** - Database for video metadata (title, duration, thumbnail URL)

## Configuring a High-Throughput Object Store

Create a dedicated pool optimized for large sequential reads:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: video-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
    parameters:
      bulk: "true"
  gateway:
    port: 80
    instances: 4
    resources:
      requests:
        cpu: "1"
        memory: 1Gi
      limits:
        cpu: "4"
        memory: 4Gi
```

The `bulk: "true"` parameter optimizes the pool for large object storage.

## Uploading and Serving HLS Segments

After transcoding, upload HLS segments to Ceph RGW:

```bash
# Upload HLS playlists (.m3u8) with correct content type
aws s3 sync ./hls-output/video-123/ \
  s3://video-content/hls/video-123/ \
  --endpoint-url http://rook-ceph-rgw-video-store.rook-ceph.svc.cluster.local \
  --cache-control "max-age=31536000" \
  --exclude "*" --include "*.m3u8" \
  --content-type "application/vnd.apple.mpegurl"

# Upload HLS segments (.ts) with correct content type
aws s3 sync ./hls-output/video-123/ \
  s3://video-content/hls/video-123/ \
  --endpoint-url http://rook-ceph-rgw-video-store.rook-ceph.svc.cluster.local \
  --cache-control "max-age=31536000" \
  --exclude "*" --include "*.ts" \
  --content-type "video/MP2T"
```

## Transcoding Jobs with CephFS Working Storage

FFmpeg transcoding jobs need fast temporary storage:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: transcode-video-123
  namespace: media
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: ffmpeg
          image: jrottenberg/ffmpeg:4.4-alpine
          command:
            - /bin/sh
            - -c
            - |
              ffmpeg -i /input/video.mp4 \
                -c:v libx264 -crf 22 \
                -hls_time 6 -hls_list_size 0 \
                -f hls /work/output.m3u8
          volumeMounts:
            - name: input
              mountPath: /input
              readOnly: true
            - name: work
              mountPath: /work
      volumes:
        - name: input
          persistentVolumeClaim:
            claimName: video-uploads
        - name: work
          persistentVolumeClaim:
            claimName: transcode-workspace
```

## Tuning Ceph for High-Throughput Reads

Optimize RGW for serving large media files:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.video-store]
    # Increase buffer size for large object reads
    rgw_max_chunk_size = 4194304
    # Enable TCP_NODELAY for lower latency
    ms_tcp_nodelay = true
    # Increase number of concurrent connections
    rgw_thread_pool_size = 512
```

## Setting Up Presigned URLs for Direct Client Access

Allow clients to fetch video directly from Ceph without going through your app server:

```python
import boto3
from botocore.config import Config

s3_client = boto3.client(
    "s3",
    endpoint_url="http://rook-ceph-rgw-video-store.rook-ceph.svc.cluster.local",
    aws_access_key_id="video-access-key",
    aws_secret_access_key="video-secret-key",
    config=Config(signature_version="s3v4"),
)

presigned_url = s3_client.generate_presigned_url(
    "get_object",
    Params={"Bucket": "video-content", "Key": "hls/video-123/output.m3u8"},
    ExpiresIn=3600,
)
```

## Summary

Rook-Ceph supports video streaming workloads using RGW for storing HLS/DASH segments and transcoded video files, CephFS for transcoding working directories, and RBD for video metadata databases. Configuring a dedicated video store with optimized chunk sizes, larger RGW thread pools, and a high-replication data pool ensures reliable, high-throughput media serving to concurrent viewers.
