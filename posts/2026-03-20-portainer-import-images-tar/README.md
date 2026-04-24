# How to Import Docker Images from a Tar File in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Air-Gap, DevOps

Description: Learn how to import Docker images from tar files in Portainer for air-gapped environments, offline deployments, or image transfer between systems.

## Introduction

In air-gapped environments, edge deployments without internet access, or when transferring images between systems that can't communicate directly, Docker's image tarball format provides a way to package and move images as files. Portainer supports importing images from tar files through the web interface.

## Prerequisites

- Portainer installed with a connected Docker environment
- A Docker image tar file (`.tar` or `.tar.gz`)

## When to Use Image Tar Files

- **Air-gapped environments**: No internet access to pull from registries.
- **Secure networks**: Registry access is blocked by security policy.
- **Edge device provisioning**: Pre-load images before devices go to remote locations.
- **Development sharing**: Share custom images without pushing to a registry.
- **Image archival**: Archive specific versions for compliance.

## Step 1: Export an Image to a Tar File

On a machine with Docker access:

```bash
# Export a single image:

docker save nginx:alpine > nginx-alpine.tar

# Export with gzip compression (smaller file):
docker save nginx:alpine | gzip > nginx-alpine.tar.gz

# Export multiple images into one tar:
docker save nginx:alpine redis:7-alpine postgres:15-alpine > all-images.tar

# Export by image ID (the archive won't include repository:tag names):
docker save 7abc123def45 > image-by-id.tar

# Export a specific stack of images:
IMAGES=(
  "myorg/myapp:v2.1.0"
  "postgres:15-alpine"
  "redis:7-alpine"
  "nginx:alpine"
)

docker save "${IMAGES[@]}" | gzip > app-stack-v2.1.0.tar.gz
echo "Archive size: $(du -sh app-stack-v2.1.0.tar.gz | cut -f1)"
```

## Step 2: Transfer the Tar File

```bash
# Transfer to remote host via SCP:
scp nginx-alpine.tar user@remote-host:/tmp/

# Transfer via rsync (with progress):
rsync -avz --progress all-images.tar user@remote-host:/tmp/

# For edge devices without SCP: use USB drive or local network share
# Copy to USB:
cp all-images.tar /media/usb/images/
```

## Step 3: Import Images via Portainer

1. Navigate to **Images** in Portainer.
2. Click the **Import** button.
3. Click **Select file** and choose the `.tar`, `.tar.gz`, `.tar.bz2`, or `.tar.xz` file.
4. Click **Upload**.

Portainer loads the image(s) from the file and makes them available for container creation.

## Step 4: Import via Docker CLI

```bash
# Import from tar file:
docker load < nginx-alpine.tar

# Import compressed tar:
docker load < nginx-alpine.tar.gz
# Or:
gunzip -c nginx-alpine.tar.gz | docker load

# Import with verbose output:
docker load -i nginx-alpine.tar
# Loaded image: nginx:alpine

# Import multiple images from one tar:
docker load -i all-images.tar
# Loaded image: nginx:alpine
# Loaded image: redis:7-alpine
# Loaded image: postgres:15-alpine
```

## Step 5: Verify Imported Images

After import, verify the images are available:

1. Navigate to **Images** in Portainer.
2. The imported images appear in the list.

```bash
# Docker CLI verification:
docker images
# REPOSITORY    TAG       IMAGE ID       CREATED        SIZE
# nginx         alpine    abc123         2 weeks ago    42MB
# redis         7-alpine  def456         3 weeks ago    35MB
```

## Step 6: Automate Air-Gapped Deployments

For regular air-gapped deployments, script the entire process:

```bash
#!/bin/bash
# prepare-airgap-bundle.sh
# Run on an internet-connected machine to prepare images for air-gapped deployment

BUNDLE_FILE="airgap-bundle-$(date +%Y%m%d).tar.gz"
MANIFEST_FILE="airgap-manifest-$(date +%Y%m%d).json"

# Define images to bundle
IMAGES=(
  "nginx:1.25-alpine"
  "portainer/agent:latest"
  "myorg/myapp:v2.1.0"
  "postgres:15-alpine"
  "redis:7-alpine"
  "grafana/grafana:10.3.0"
  "prom/prometheus:v2.51.0"
  "prom/node-exporter:v1.7.0"
)

echo "Pulling images..."
for image in "${IMAGES[@]}"; do
  docker pull "${image}"
done

echo "Creating bundle..."
docker save "${IMAGES[@]}" | gzip > "${BUNDLE_FILE}"

echo "Creating manifest..."
cat > "${MANIFEST_FILE}" << EOF
{
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "images": $(printf '%s\n' "${IMAGES[@]}" | jq -R . | jq -s .),
  "bundle": "${BUNDLE_FILE}",
  "size_mb": $(du -m "${BUNDLE_FILE}" | cut -f1)
}
EOF

echo ""
echo "Bundle created: ${BUNDLE_FILE}"
echo "Bundle size: $(du -sh ${BUNDLE_FILE} | cut -f1)"
echo "Manifest: ${MANIFEST_FILE}"
echo ""
cat "${MANIFEST_FILE}" | jq .
```

```bash
#!/bin/bash
# deploy-airgap-bundle.sh
# Run on the air-gapped machine to import and deploy

BUNDLE_FILE="${1:?Bundle file required}"

echo "Importing images from: ${BUNDLE_FILE}"
docker load -i "${BUNDLE_FILE}"

echo ""
echo "Imported images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "Ready for container deployment via Portainer"
```

## Step 7: Batch Import via Portainer API

For automated imports without the UI:

```bash
# Import image via Portainer API:
PORTAINER_URL="https://portainer:9443"
API_KEY="your-api-key"
ENDPOINT_ID=1

curl -s -X POST \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/x-tar" \
  --data-binary "@nginx-alpine.tar" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/load"
```

## Image Tar File Considerations

```bash
# Tar files can include multiple tags for an image
# When you load a tar, the tags stored in that archive are restored:
docker save myapp:v2.0.0 myapp:v2.1.0 myapp:latest > myapp-all-versions.tar
docker load -i myapp-all-versions.tar
# Loads all three tags

# Check tar file contents without importing:
docker save myapp:latest | tar -tf - | grep -E "manifest|json"
tar -tzf myapp.tar.gz | head -20

# Image tar size vs compressed image size:
# 100 MB image → 90-95 MB tar (uncompressed)
# 100 MB image → 35-60 MB tar.gz (gzip compressed)
```

## Conclusion

Importing Docker images from tar files in Portainer fills an important gap for air-gapped deployments, edge devices, and secure environments. Export images on internet-connected machines using `docker save`, transfer the bundle, and import via Portainer's web interface. For regular air-gapped deployments, automate the bundle creation and loading with scripts to ensure consistent, reproducible image deployments.
