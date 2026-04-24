# How to Export Docker Images from Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Backup, DevOps

Description: Learn how to export Docker images from Portainer as tar files for backup, transfer, or air-gapped deployment purposes.

## Introduction

Exporting Docker images from Portainer creates a portable tar file of the image that can be transferred to other systems, used for air-gapped deployments, or archived for compliance. This is the opposite of the import operation - you start with an image on the host and create a file.

## Prerequisites

- Portainer installed with a connected Docker environment
- Images to export available on the host

## Step 1: Export an Image via Portainer UI

1. Navigate to **Images** in Portainer.
2. Find the image you want to export.
3. Click on the image name or ID.
4. Look for an **Export** button.
5. Click to download the image as a `.tar` file.

The browser downloads the image directly as a file.

Note: Portainer may not always offer a direct export button - if not available, use the Docker CLI method below.

## Step 2: Export via Docker CLI

The most reliable way to export images:

```bash
# Export a single image to a tar file:

docker save myorg/myapp:v2.1.0 > myapp-v2.1.0.tar

# Export with gzip compression (can reduce storage size):
docker save myorg/myapp:v2.1.0 | gzip > myapp-v2.1.0.tar.gz

# Export multiple tags in one archive:
docker save myorg/myapp:v2.0.0 myorg/myapp:v2.1.0 myorg/myapp:latest \
    > myapp-all-versions.tar

# Export all images with a specific prefix:
IMAGES_TO_SAVE=$(docker images --filter "reference=myorg/*:*" --format "{{.Repository}}:{{.Tag}}")
[ -n "${IMAGES_TO_SAVE}" ] && printf '%s\n' "${IMAGES_TO_SAVE}" | \
    xargs docker save | gzip > myorg-all-images.tar.gz

# Export using image ID (exports the image regardless of tags):
IMAGE_ID=$(docker inspect myorg/myapp:latest --format '{{.Id}}')
docker save "${IMAGE_ID}" > myapp-by-id.tar
```

## Step 3: Export via Portainer API

For automation and scripting:

```bash
# Export an image via Portainer API
PORTAINER_URL="https://portainer.example.com:9443"
API_KEY="your-api-key"
ENDPOINT_ID=1
IMAGE_NAME="nginx:alpine"
SAFE_NAME=$(printf '%s' "${IMAGE_NAME}" | tr '/:' '--')

# Portainer proxies the Docker Engine API under /api/endpoints/{id}/docker
curl -fsS --get \
  -H "X-API-Key: ${API_KEY}" \
  --data-urlencode "names=${IMAGE_NAME}" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/get" \
  -o "${SAFE_NAME}.tar"

echo "Exported: ${SAFE_NAME}.tar"
```

## Step 4: Bulk Export Script

For exporting multiple images at once:

```bash
#!/bin/bash
# export-images.sh
# Exports specified images to a backup directory

BACKUP_DIR="${1:-/backup/images}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_DIR="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "${EXPORT_DIR}"

# Images to export
IMAGES=(
  "nginx:alpine"
  "postgres:15-alpine"
  "redis:7-alpine"
  "myorg/myapp:v2.1.0"
  "grafana/grafana:10.3.0"
)

echo "=== Docker Image Export: ${TIMESTAMP} ==="
echo "Destination: ${EXPORT_DIR}"
echo ""

TOTAL_SIZE=0

for image in "${IMAGES[@]}"; do
    SAFE_NAME=$(echo "${image}" | tr '/:' '_-')
    OUTPUT_FILE="${EXPORT_DIR}/${SAFE_NAME}.tar.gz"

    echo "Exporting: ${image}"

    if docker save "${image}" | gzip > "${OUTPUT_FILE}"; then
        SIZE=$(du -sh "${OUTPUT_FILE}" | cut -f1)
        echo "  ✓ ${OUTPUT_FILE} (${SIZE})"
    else
        echo "  ✗ Failed to export ${image}"
    fi
done

echo ""
echo "=== Export Summary ==="
ls -lh "${EXPORT_DIR}"
echo ""
echo "Total size: $(du -sh "${EXPORT_DIR}" | cut -f1)"
```

## Step 5: Export and Push to Archive Registry

For proper image archival, push to a private registry instead of tar files:

```bash
#!/bin/bash
# archive-to-registry.sh
# Tags and pushes images to an archive registry

ARCHIVE_REGISTRY="archive.registry.example.com"
TIMESTAMP=$(date +%Y%m%d)

IMAGES=(
  "myorg/myapp:v2.1.0"
  "postgres:15-alpine"
  "nginx:alpine"
)

# Log in to archive registry
docker login "${ARCHIVE_REGISTRY}"

for image in "${IMAGES[@]}"; do
    ARCHIVE_TAG="${ARCHIVE_REGISTRY}/archive-${TIMESTAMP}/${image}"

    echo "Archiving: ${image} → ${ARCHIVE_TAG}"
    docker tag "${image}" "${ARCHIVE_TAG}"
    docker push "${ARCHIVE_TAG}"

    echo "  ✓ Archived: ${ARCHIVE_TAG}"
done

echo "Archive complete. Images stored in ${ARCHIVE_REGISTRY}/archive-${TIMESTAMP}/"
```

## Step 6: Verify the Exported File

After export, verify the tar file is valid:

```bash
# Check file size (should be > 0):
ls -lh myapp-v2.1.0.tar.gz

# Inspect the tar contents without loading:
tar -tzf myapp-v2.1.0.tar.gz | head -20
# Output typically includes files such as:
# manifest.json
# repositories
# abc123.../layer.tar
# abc123....json

# Test the file integrity:
gzip -t myapp-v2.1.0.tar.gz && echo "File is valid"

# Optional functional test (loads the image into Docker):
docker load -i myapp-v2.1.0.tar.gz
docker image inspect myorg/myapp:v2.1.0 > /dev/null && echo "Image loaded successfully"
```

## Export Size Expectations

```bash
# Export file sizes vary by image version, platform, and layer contents.
# The uncompressed .tar is often close to the image size shown by `docker images`.
# gzip can reduce the transfer size, but the savings vary widely by image.

# Check the local image size before exporting:
docker images myorg/myapp:v2.1.0
```

## Use Cases by Scenario

```bash
# Air-gapped deployment:
# On internet-connected machine:
docker save myapp:v1 | gzip > bundle.tar.gz
scp bundle.tar.gz air-gapped-host:/tmp/
# On air-gapped host (or via Portainer import):
docker load -i bundle.tar.gz

# Disaster recovery:
# Regular scheduled export → offsite storage

# Developer image sharing:
# Build locally → save → email/slack → colleague loads
docker save my-debug-image:local | gzip > debug-image.tar.gz

# Compliance/audit archival:
# Every release tagged image → S3 archival bucket
aws s3 cp myapp-v2.1.0.tar.gz s3://compliance-bucket/images/
```

## Conclusion

Exporting Docker images from Portainer or Docker CLI creates portable tar files for backup, transfer, and air-gapped deployments. Consider gzip compression when you want smaller files for storage or transfer. For systematic image archival in production, consider pushing to a dedicated archive registry rather than managing tar files - it provides versioning, tagging, and easy retrieval without large binary file management.
