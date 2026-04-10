# How to Use Ceph RGW as Cache Backend for Buildkit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BuildKit, Docker, CI/CD, Cache, Storage

Description: Configure Buildkit to use Ceph RGW as an S3-compatible cache backend for Docker image layer caching, enabling persistent build caches across ephemeral CI runners.

---

## Overview

Buildkit (the default build engine behind `docker build` since Docker Engine 23.0) supports external cache storage via S3-compatible backends. By pointing Buildkit's cache at Ceph RGW, you persist layer caches across ephemeral CI runners, dramatically reducing build times for large images.

## Prepare Ceph RGW Bucket

Create a dedicated cache bucket:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=buildkit \
  --display-name="Buildkit Cache" \
  --access-key=buildkitakey \
  --secret-key=buildkitskey

aws s3 mb s3://buildkit-cache \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Build with S3 Cache - docker buildx

Export the build cache to Ceph after the build:

```bash
docker buildx build \
  --cache-to type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,\
endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,\
access_key_id=buildkitakey,secret_access_key=buildkitskey,\
use_path_style=true,mode=max \
  --cache-from type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,\
endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,\
access_key_id=buildkitakey,secret_access_key=buildkitskey,\
use_path_style=true \
  -t myapp:latest \
  --push \
  .
```

## Buildkit Daemon Configuration

When running buildkitd standalone via `buildctl`, specify the S3 cache using the `--export-cache` and `--import-cache` flags:

```bash
buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --output type=image,name=myapp:latest,push=true \
  --export-cache type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,\
endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,\
access_key_id=buildkitakey,secret_access_key=buildkitskey,\
use_path_style=true,mode=max \
  --import-cache type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,\
endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,\
access_key_id=buildkitakey,secret_access_key=buildkitskey,\
use_path_style=true
```

## Use in a GitHub Actions Workflow

```yaml
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: myregistry/myapp:latest
          cache-from: type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,access_key_id=${{ secrets.CEPH_ACCESS_KEY }},secret_access_key=${{ secrets.CEPH_SECRET_KEY }},use_path_style=true
          cache-to: type=s3,region=us-east-1,bucket=buildkit-cache,name=myapp,endpoint_url=http://rook-ceph-rgw-my-store.rook-ceph:80,access_key_id=${{ secrets.CEPH_ACCESS_KEY }},secret_access_key=${{ secrets.CEPH_SECRET_KEY }},use_path_style=true,mode=max
```

## Verify Cache Objects in Ceph

```bash
aws s3 ls s3://buildkit-cache/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive | head -20
```

## Set Lifecycle Policy to Clean Up Old Cache

```json
{
  "Rules": [
    {
      "ID": "expire-old-cache",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Expiration": {"Days": 30}
    }
  ]
}
```

## Summary

Buildkit's S3 cache backend integrates seamlessly with Ceph RGW, providing persistent Docker layer caching across ephemeral CI runners. Cache hits on subsequent builds skip expensive re-downloads and rebuilds, and Ceph RGW's path-style addressing requires only the `use_path_style=true` parameter to work correctly.
