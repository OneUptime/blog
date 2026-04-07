# How to Use Ceph RGW for Media Asset Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Media, Object Storage, S3, Asset Management

Description: Learn how to use Ceph RADOS Gateway as a media asset management backend, configure large object storage, serve media via presigned URLs, and optimize for high-bandwidth streaming workloads.

---

## Why Ceph RGW for Media Asset Management?

Media organizations deal with large binary files (images, video, audio) that require:
- Scalable object storage without per-file limitations
- High-throughput access for video streaming
- Multipart upload for large files
- Pre-signed URLs for time-limited client access
- S3-compatible API compatible with media tooling

Ceph RGW handles all of these natively.

## Step 1: Configure the Media Bucket

```bash
aws s3 mb s3://media-assets --endpoint-url https://rgw.example.com

# Set bucket for public read (if serving public media)
aws s3api put-bucket-acl \
  --bucket media-assets \
  --acl public-read \
  --endpoint-url https://rgw.example.com
```

## Step 2: Upload Large Media Files with Multipart

For files >100MB, use multipart upload:

First, configure the multipart chunk size:

```bash
aws configure set default.s3.multipart_chunksize 64MB
```

Then upload:

```bash
aws s3 cp large-video.mp4 s3://media-assets/videos/2026/large-video.mp4 \
  --expected-size 5368709120 \
  --endpoint-url https://rgw.example.com
```

## Step 3: Generate Pre-Signed URLs for Client Downloads

```bash
# Generate a URL valid for 1 hour (3600 seconds)
aws s3 presign s3://media-assets/videos/2026/large-video.mp4 \
  --expires-in 3600 \
  --endpoint-url https://rgw.example.com
```

Users can download directly from the pre-signed URL without credentials.

## Step 4: Generate Pre-Signed URLs with Python

```python
import boto3
from botocore.config import Config

s3 = boto3.client(
    's3',
    endpoint_url='https://rgw.example.com',
    aws_access_key_id='your-access-key',
    aws_secret_access_key='your-secret-key',
    config=Config(signature_version='s3v4')
)

url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'media-assets', 'Key': 'videos/2026/large-video.mp4'},
    ExpiresIn=3600
)

print(url)
```

## Step 5: Organize Assets with Metadata

Use custom metadata to tag assets:

```bash
aws s3 cp thumbnail.jpg s3://media-assets/images/thumbnail.jpg \
  --metadata "project=campaign-2026,format=JPEG,width=1920,height=1080" \
  --endpoint-url https://rgw.example.com
```

Retrieve metadata:

```bash
aws s3api head-object \
  --bucket media-assets \
  --key images/thumbnail.jpg \
  --endpoint-url https://rgw.example.com | jq '.Metadata'
```

## Step 6: Tune RGW for High-Bandwidth Streaming

Configure RGW for large object throughput:

```bash
ceph config set client.rgw rgw_max_chunk_size 4194304
ceph config set client.rgw rgw_put_obj_min_window_size 16777216
ceph config set client.rgw rgw_max_put_size 137438953472
```

## Step 7: Enable Object Lifecycle for Expired Assets

```json
{
  "Rules": [{
    "ID": "expire-temp-media",
    "Filter": { "Prefix": "temp/" },
    "Status": "Enabled",
    "Expiration": { "Days": 7 }
  }]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket media-assets \
  --lifecycle-configuration file://media-lifecycle.json \
  --endpoint-url https://rgw.example.com
```

## Disabling Compression for Media

Since video and image files are already compressed, disable BlueStore compression on the RGW pool:

```bash
ceph osd pool set default.rgw.buckets.data compression_mode none
```

## Summary

Ceph RGW provides a high-throughput, scalable backend for media asset management. Use multipart uploads for large files, pre-signed URLs for time-limited client access, and custom metadata for asset tagging. Tune `rgw_max_chunk_size` and related settings for streaming workloads, and disable compression on RGW data pools when storing already-compressed media to avoid CPU overhead without savings.
