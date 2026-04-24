# How to Fix 'Unable to Retrieve Image Details' After Docker Update (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Image, Docker Update

Description: Resolve 'Unable to Retrieve Image Details' errors in Portainer that appear after Docker Engine updates, caused by API changes, image format differences, and metadata compatibility issues.

## Introduction

After updating Docker Engine, Portainer may show "Unable to Retrieve Image Details" for some or all images. This is often a compatibility issue between the Portainer version in use and the image metadata returned by the Docker Engine API. This guide explains the fixes.

## Step 1: Check the Specific Error in Logs

```bash
# Check Portainer logs for image-related errors

docker logs portainer 2>&1 | grep -i "image\|retrieve\|inspect\|error" | tail -30

# Check Docker daemon logs for relevant errors
journalctl -u docker --since "30 minutes ago" | grep -i "image\|manifest\|digest"
```

## Step 2: Test Image Inspection from CLI

```bash
# If CLI works but Portainer doesn't, suspect a Portainer compatibility or snapshot issue
docker image inspect nginx:latest

# Discover the daemon API version, then query that version directly
API_VERSION=$(curl --silent --unix-socket /var/run/docker.sock \
  http://localhost/version | jq -r '.ApiVersion')

curl --unix-socket /var/run/docker.sock \
  "http://localhost/v${API_VERSION}/images/nginx:latest/json" | jq '.'

# Check if the API returns valid data
# If this succeeds, Portainer is likely the layer that needs attention
```

## Step 3: Update Portainer to Latest Version

```bash
# Check the image currently deployed for Portainer
docker inspect portainer | jq -r '.[0].Config.Image'

# Pull the latest LTS release
docker pull portainer/portainer-ce:lts

# Update (data volume is preserved)
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name=portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 4: Fix OCI Image Format Issues

Registries can return either Docker or OCI media types for an image. Check what the registry is returning:

```bash
# Check image manifest format in the registry
docker buildx imagetools inspect nginx:latest --format '{{json .Manifest}}' | jq '.mediaType'

# If the image was built locally or imported a long time ago:
# Rebuild the image
docker build -t myimage:latest .

# Or, if the image comes from a registry, pull a fresh copy
docker pull --platform linux/amd64 nginx:latest
```

## Step 5: Fix Multi-Platform Image Issues

Multi-platform images can also trigger image-selection or inspect issues:

```bash
# Check if the image is multi-platform
docker buildx imagetools inspect nginx:latest --format '{{json .Manifest}}' | jq '.manifests[].platform'

# If Portainer shows image details error for multi-platform images:
# Pull the specific platform variant
docker pull --platform linux/amd64 nginx:latest

# Verify
docker image inspect nginx:latest | jq '.[0].Architecture'
```

## Step 6: Clear Local Image Cache

```bash
# Remove and re-pull problematic images
docker image rm nginx:latest
docker pull nginx:latest

# Check if image details work after fresh pull
docker image inspect nginx:latest | jq '.[0] | {Id, RepoTags, Architecture, Os}'
```

## Step 7: Fix BuildKit Image Metadata Issues

BuildKit has been the default Linux image builder since Docker Engine 23.0, and images built with it can omit legacy inspect fields that older tooling expected:

```bash
# Check image history (should work regardless of BuildKit)
docker history myimage:latest

# Some legacy fields such as ContainerConfig, Parent, and DockerVersion
# may be absent for BuildKit-built images on current Docker releases

# For Portainer to display details correctly:
# Use a Portainer release that supports your Docker Engine version
# (Docker v29 support was added in Portainer 2.33.5 LTS / 2.36.0 STS and later)
```

## Step 8: Fix for Images Built with Docker Compose

```bash
# Rebuild compose-managed images after updating Docker
docker compose build

# Add labels if you want more metadata on the resulting image
# In docker-compose.yml:
services:
  myapp:
    build:
      context: .
      labels:
        - "com.example.version=1.0"
        - "com.example.build-date=${BUILD_DATE}"
```

## Step 9: Rebuild the Portainer Snapshot

```bash
# Create an access token in Portainer, then use it here
PORTAINER_URL=https://localhost:9443
PORTAINER_API_KEY=your_access_token

# Trigger a fresh snapshot
curl -k -X POST \
  -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/api/endpoints/1/snapshot"

# Wait a moment, then refresh Portainer UI
sleep 10
```

## Step 10: Fix Permission Issues for Image Inspection

```bash
# Verify Portainer can reach the Docker API through the socket

# Test Docker socket works
API_VERSION=$(curl --silent --unix-socket /var/run/docker.sock \
  http://localhost/version | jq -r '.ApiVersion')

curl --unix-socket /var/run/docker.sock \
  "http://localhost/v${API_VERSION}/images/json" | jq '.[0].RepoTags'

# Check socket ownership and mode
ls -la /var/run/docker.sock
# Typically owned by root:docker with group read/write access

# Ensure the Docker socket is mounted into the Portainer container
docker inspect portainer | jq '.[0].HostConfig.Binds'
# Should include: /var/run/docker.sock:/var/run/docker.sock
```

## Step 11: Check for Corrupted Image Layers

```bash
# Export and re-import the image to rule out local image-store issues
docker image save nginx:latest | docker image load

# Or use Docker Scout to inspect the image
docker scout cves nginx:latest 2>/dev/null | head -10

# Remove and re-pull corrupted images
docker image rm --force nginx:latest
docker pull nginx:latest
```

## Conclusion

"Unable to Retrieve Image Details" after a Docker update is most commonly resolved by updating Portainer to a release that supports your Docker Engine version. Newer Docker releases can change the image-inspect response returned by the daemon, and older Portainer releases may not handle that correctly. Secondary causes include multi-platform image selection, stale local image data, and older images that should be rebuilt or re-pulled.
