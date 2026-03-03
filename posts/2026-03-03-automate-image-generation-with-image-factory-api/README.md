# How to Automate Image Generation with Image Factory API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Factory, API, Automation, CI/CD

Description: Learn how to use the Talos Image Factory API to automate image generation, integrate with CI/CD pipelines, and build self-service infrastructure workflows.

---

While the Image Factory web UI is great for exploring options and one-off builds, production environments demand automation. The Image Factory API provides programmatic access to every feature of the service, letting you integrate image generation into your CI/CD pipelines, build self-service portals, and automate your entire infrastructure image lifecycle.

This guide covers the Image Factory API endpoints, practical automation patterns, and integration strategies for real-world workflows.

## Image Factory API Overview

The Image Factory API is a REST API hosted at `https://factory.talos.dev`. It does not require authentication for public operations, which makes it easy to integrate without managing API keys or tokens. The API follows a straightforward pattern: submit a schematic, get an ID, and use that ID to construct image URLs.

## Core API Endpoints

### Submit a Schematic

```bash
# POST /schematics
# Submit a schematic definition and receive a unique ID

curl -s -X POST \
  -H "Content-Type: application/yaml" \
  --data-binary @schematic.yaml \
  https://factory.talos.dev/schematics

# Response:
# {"id":"376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba"}
```

### List Available Talos Versions

```bash
# GET /versions
# List all available Talos versions

curl -s https://factory.talos.dev/versions | jq '.[]'

# Response includes version strings like "v1.7.0", "v1.6.7", etc.
```

### List Extensions for a Version

```bash
# GET /version/{version}/extensions/official
# List all official extensions available for a specific version

curl -s https://factory.talos.dev/version/v1.7.0/extensions/official | jq '.'
```

### Download Images

Images are not fetched through a traditional API call but through constructed URLs:

```bash
# Image URL pattern:
# https://factory.talos.dev/image/{schematic-id}/{version}/{image-type}

# Examples:
# Metal ISO:       /image/{id}/{ver}/metal-amd64.iso
# AWS AMI:         /image/{id}/{ver}/aws-amd64.raw.xz
# Azure VHD:       /image/{id}/{ver}/azure-amd64.vhd.xz
# VMware OVA:      /image/{id}/{ver}/vmware-amd64.ova
# Installer image: factory.talos.dev/installer/{id}:{ver}
```

## Building a CI/CD Integration

Here is a complete GitHub Actions workflow that automates image generation:

```yaml
# .github/workflows/generate-images.yaml
name: Generate Talos Images
on:
  push:
    paths:
      - 'schematics/**'
      - 'versions.env'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Load versions
        run: source versions.env && echo "TALOS_VERSION=${TALOS_VERSION}" >> $GITHUB_ENV

      - name: Generate schematic IDs
        run: |
          for file in schematics/*.yaml; do
            name=$(basename "$file" .yaml)
            id=$(curl -s -X POST --data-binary @"$file" \
              https://factory.talos.dev/schematics | jq -r '.id')
            echo "SCHEMATIC_${name}=${id}" >> $GITHUB_ENV
            echo "${name}: ${id}" >> schematic-manifest.txt
          done

      - name: Upload manifest
        uses: actions/upload-artifact@v4
        with:
          name: schematic-manifest
          path: schematic-manifest.txt
```

## Scripting with the API

### Complete Image Generation Script

```bash
#!/bin/bash
# generate-images.sh - complete image generation pipeline
set -euo pipefail

# Configuration
TALOS_VERSION="${TALOS_VERSION:-v1.7.0}"
SCHEMATIC_FILE="${1:?Usage: $0 <schematic-file> [platform]}"
PLATFORM="${2:-metal-amd64.iso}"
OUTPUT_DIR="${OUTPUT_DIR:-./output}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Step 1: Submit the schematic
echo "Submitting schematic from ${SCHEMATIC_FILE}..."
RESPONSE=$(curl -s -X POST \
  --data-binary @"${SCHEMATIC_FILE}" \
  https://factory.talos.dev/schematics)

SCHEMATIC_ID=$(echo "${RESPONSE}" | jq -r '.id')

if [ -z "${SCHEMATIC_ID}" ] || [ "${SCHEMATIC_ID}" = "null" ]; then
  echo "ERROR: Failed to submit schematic"
  echo "Response: ${RESPONSE}"
  exit 1
fi

echo "Schematic ID: ${SCHEMATIC_ID}"

# Step 2: Download the image
IMAGE_URL="https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/${PLATFORM}"
OUTPUT_FILE="${OUTPUT_DIR}/${PLATFORM}"

echo "Downloading ${PLATFORM}..."
HTTP_CODE=$(curl -s -o "${OUTPUT_FILE}" -w "%{http_code}" "${IMAGE_URL}")

if [ "${HTTP_CODE}" != "200" ]; then
  echo "ERROR: Download failed with HTTP ${HTTP_CODE}"
  rm -f "${OUTPUT_FILE}"
  exit 1
fi

# Step 3: Generate checksum
echo "Generating checksum..."
cd "${OUTPUT_DIR}"
sha256sum "${PLATFORM}" > "${PLATFORM}.sha256"

echo "Done! Image saved to ${OUTPUT_FILE}"
echo "Installer reference: factory.talos.dev/installer/${SCHEMATIC_ID}:${TALOS_VERSION}"
```

### Multi-Platform Generation Script

```bash
#!/bin/bash
# generate-multi-platform.sh - generate images for all platforms
set -euo pipefail

TALOS_VERSION="${1:?Usage: $0 <version>}"
SCHEMATIC_FILE="${2:?Usage: $0 <version> <schematic-file>}"

# Submit schematic once
SCHEMATIC_ID=$(curl -s -X POST \
  --data-binary @"${SCHEMATIC_FILE}" \
  https://factory.talos.dev/schematics | jq -r '.id')

echo "Schematic ID: ${SCHEMATIC_ID}"

# Define all platforms
PLATFORMS=(
  "metal-amd64.iso"
  "metal-arm64.iso"
  "aws-amd64.raw.xz"
  "aws-arm64.raw.xz"
  "azure-amd64.vhd.xz"
  "vmware-amd64.ova"
)

# Download each platform in parallel
for platform in "${PLATFORMS[@]}"; do
  (
    echo "Starting download: ${platform}"
    wget -q -O "output/${platform}" \
      "https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/${platform}" && \
      echo "Completed: ${platform}" || \
      echo "Failed: ${platform}"
  ) &
done

# Wait for all downloads to complete
wait
echo "All downloads complete"
```

## Building a Self-Service API Wrapper

For organizations that want to provide a simplified interface to their teams:

```python
#!/usr/bin/env python3
"""
talos_image_service.py - Simple wrapper around Image Factory API
Provides a simplified interface for generating Talos images
"""

import requests
import json
import sys
import hashlib

FACTORY_URL = "https://factory.talos.dev"

def submit_schematic(extensions, kernel_args=None):
    """Submit a schematic and return the ID."""
    schematic = {
        "customization": {
            "systemExtensions": {
                "officialExtensions": extensions
            }
        }
    }

    if kernel_args:
        schematic["customization"]["extraKernelArgs"] = kernel_args

    # Convert to YAML-like format for the API
    import yaml
    schematic_yaml = yaml.dump(schematic)

    response = requests.post(
        f"{FACTORY_URL}/schematics",
        data=schematic_yaml,
        headers={"Content-Type": "application/yaml"}
    )
    response.raise_for_status()
    return response.json()["id"]

def get_image_url(schematic_id, version, platform):
    """Construct an image download URL."""
    return f"{FACTORY_URL}/image/{schematic_id}/{version}/{platform}"

def get_installer_ref(schematic_id, version):
    """Get the installer image reference."""
    return f"factory.talos.dev/installer/{schematic_id}:{version}"

def list_extensions(version):
    """List available extensions for a version."""
    response = requests.get(
        f"{FACTORY_URL}/version/{version}/extensions/official"
    )
    response.raise_for_status()
    return response.json()

# Example usage
if __name__ == "__main__":
    version = "v1.7.0"

    # Define extensions for a production server
    extensions = [
        "siderolabs/intel-ucode",
        "siderolabs/iscsi-tools",
        "siderolabs/util-linux-tools",
    ]

    # Submit schematic
    schematic_id = submit_schematic(extensions)
    print(f"Schematic ID: {schematic_id}")

    # Get URLs
    print(f"ISO URL: {get_image_url(schematic_id, version, 'metal-amd64.iso')}")
    print(f"Installer: {get_installer_ref(schematic_id, version)}")
```

## Monitoring and Alerting

Track your Image Factory usage and catch problems early:

```bash
#!/bin/bash
# check-image-availability.sh
# Verify that all expected images are available

SCHEMATIC_ID=$1
TALOS_VERSION=$2

PLATFORMS=("metal-amd64.iso" "aws-amd64.raw.xz" "vmware-amd64.ova")
FAILURES=0

for platform in "${PLATFORMS[@]}"; do
  URL="https://factory.talos.dev/image/${SCHEMATIC_ID}/${TALOS_VERSION}/${platform}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --head "${URL}")

  if [ "${HTTP_CODE}" = "200" ]; then
    echo "OK: ${platform}"
  else
    echo "FAIL: ${platform} (HTTP ${HTTP_CODE})"
    FAILURES=$((FAILURES + 1))
  fi
done

if [ ${FAILURES} -gt 0 ]; then
  echo "${FAILURES} platform(s) unavailable"
  exit 1
fi
```

## Caching Strategies

Image Factory builds images on demand, which means the first request for a new combination of schematic and version may take a moment. Implement caching in your pipeline:

```bash
# Cache images locally after first download
CACHE_DIR="/var/cache/talos-images"
mkdir -p "${CACHE_DIR}"

CACHE_KEY="${SCHEMATIC_ID}-${TALOS_VERSION}-${PLATFORM}"
CACHE_FILE="${CACHE_DIR}/${CACHE_KEY}"

if [ -f "${CACHE_FILE}" ]; then
  echo "Using cached image: ${CACHE_FILE}"
  cp "${CACHE_FILE}" "${OUTPUT_DIR}/${PLATFORM}"
else
  echo "Downloading fresh image..."
  wget -O "${CACHE_FILE}" "${IMAGE_URL}"
  cp "${CACHE_FILE}" "${OUTPUT_DIR}/${PLATFORM}"
fi
```

## Rate Limiting and Best Practices

When automating against the Image Factory API, follow these guidelines:

- **Do not hammer the API**: Add reasonable delays between requests if you are submitting multiple schematics.
- **Cache schematic IDs**: Since the same schematic always produces the same ID, there is no need to submit the same schematic repeatedly.
- **Handle errors gracefully**: The API may return 5xx errors during maintenance. Implement retries with exponential backoff.
- **Mirror images locally**: For production deployments, download images once and store them in your own registry or artifact storage.

## Wrapping Up

The Image Factory API turns image generation from a manual process into an automated, repeatable operation. By integrating it into your CI/CD pipelines, you can ensure that every cluster deployment uses fresh, validated images built from version-controlled schematics. The API is simple enough to call with curl but powerful enough to support sophisticated workflows including multi-platform generation, self-service portals, and automated testing. For any team running Talos Linux at scale, API-driven image generation is not just convenient - it is essential.
