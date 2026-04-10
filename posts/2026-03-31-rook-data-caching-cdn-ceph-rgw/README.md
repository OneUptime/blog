# How to Configure Data Caching and CDN with Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, CDN, Caching, Object Storage

Description: Learn how to configure data caching and CDN integration with Ceph RGW to improve read performance and reduce latency for object storage workloads.

---

## Overview

Ceph RGW supports a local object cache that reduces latency for frequently accessed objects. Additionally, RGW can integrate with CDN systems by pre-signing URLs and configuring cache headers. For large-scale deployments, D4N (Datacenter-for-N) caching provides a distributed cache layer in front of RGW.

## Enabling the RGW Object Cache

The built-in RGW cache stores object metadata and small objects in memory:

```bash
# Enable and configure the cache
ceph config set client.rgw rgw_cache_enabled true
ceph config set client.rgw rgw_cache_lru_size 10000
ceph config set client.rgw rgw_cache_expiry_interval 900

# Verify configuration
ceph config get client.rgw rgw_cache_enabled
```

The cache is per-RGW-instance and stores:
- Object metadata (user info, bucket info, bucket instance info)
- ACLs and extended attributes

## Configuring D4N Caching (Distributed Cache)

D4N provides a distributed cache layer using Redis:

```bash
# Enable D4N by setting the RGW filter
ceph config set client.rgw rgw_filter d4n
ceph config set client.rgw rgw_d4n_address "redis-host:6379"
ceph config set client.rgw rgw_d4n_l1_datacache_persistent_path /var/cache/rgw
ceph config set client.rgw rgw_d4n_l1_datacache_disk_reserve 1073741824  # 1GB reserved free space
```

## Setting Cache-Control Headers

RGW does not have a server-side config option for setting a default `Cache-Control` header. Instead, set cache headers per object at upload time using S3 API metadata:

```bash
# Set cache-control header on upload
aws --endpoint-url http://rgw:80 s3 cp \
  image.jpg s3://mybucket/image.jpg \
  --cache-control "public, max-age=604800" \
  --content-type "image/jpeg"
```

## Pre-Signed URLs for CDN

Generate time-limited pre-signed URLs for CDN origins:

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='http://rgw.example.com:80',
    aws_access_key_id='ACCESSKEY',
    aws_secret_access_key='SECRETKEY'
)

# Generate a pre-signed URL (valid for 1 hour)
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'mybucket', 'Key': 'video.mp4'},
    ExpiresIn=3600
)
print(url)
```

## Configuring Nginx as a Caching Proxy

Use Nginx to cache RGW responses at the CDN edge:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2
    keys_zone=rgw_cache:10m
    max_size=50g
    inactive=24h;

server {
    listen 80;
    server_name cdn.example.com;

    location / {
        proxy_pass http://rgw-backend:80;
        proxy_cache rgw_cache;
        proxy_cache_valid 200 1d;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

## Rook: Configuring Cache Settings

In Rook, apply cache settings via the CephObjectStore or config override:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 3
    resources:
      requests:
        cpu: 1
        memory: 2Gi
```

Apply config overrides via ConfigMap:

```bash
kubectl -n rook-ceph exec -it $TOOLBOX -- \
  ceph config set client.rgw rgw_cache_lru_size 50000
```

## Summary

Ceph RGW caching operates at multiple layers: the built-in LRU metadata cache, D4N distributed caching via Redis, and external caching layers like Nginx. Configure cache headers on objects using S3 API metadata to enable CDN caching, and use pre-signed URLs to control access for CDN origin fetches. D4N provides the most scalable caching solution for high-read-throughput object storage workloads.
