# How to Compare Two Docker Images Layer by Layer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Layers, Diff, Comparison, DevOps, Debugging, Security

Description: Learn how to compare two Docker images layer by layer to find differences in size, files, packages, and configuration.

---

When a Docker image suddenly grows by 200MB, when a deployment breaks after an image update, or when you need to audit what changed between two releases, comparing images layer by layer gives you the answers. Docker does not provide a built-in diff command for images, but several tools and techniques make detailed comparisons straightforward.

This guide covers practical methods for comparing Docker images, from quick command-line checks to deep filesystem-level analysis.

## Quick Size Comparison

Start with the most basic comparison: image size and layer count.

Compare basic image properties:

```bash
# Compare sizes
echo "Image 1:"
docker image inspect myapp:v1 --format "Size: {{.Size}} bytes ({{len .RootFS.Layers}} layers)"
echo "Image 2:"
docker image inspect myapp:v2 --format "Size: {{.Size}} bytes ({{len .RootFS.Layers}} layers)"

# Side-by-side comparison
paste \
    <(docker image inspect myapp:v1 --format "v1: {{.Size}} bytes, {{len .RootFS.Layers}} layers") \
    <(docker image inspect myapp:v2 --format "v2: {{.Size}} bytes, {{len .RootFS.Layers}} layers")
```

A more detailed comparison script:

```bash
#!/bin/bash
# compare-basics.sh - Quick image comparison

IMG1=$1
IMG2=$2

if [ -z "$IMG1" ] || [ -z "$IMG2" ]; then
    echo "Usage: $0 <image1> <image2>"
    exit 1
fi

echo "=== Image Comparison ==="
echo ""

# Size comparison
SIZE1=$(docker image inspect "$IMG1" --format "{{.Size}}")
SIZE2=$(docker image inspect "$IMG2" --format "{{.Size}}")
DIFF=$((SIZE2 - SIZE1))

echo "Size:"
echo "  $IMG1: $((SIZE1 / 1048576)) MB"
echo "  $IMG2: $((SIZE2 / 1048576)) MB"
echo "  Difference: $((DIFF / 1048576)) MB"
echo ""

# Layer comparison
LAYERS1=$(docker image inspect "$IMG1" --format "{{len .RootFS.Layers}}")
LAYERS2=$(docker image inspect "$IMG2" --format "{{len .RootFS.Layers}}")

echo "Layers:"
echo "  $IMG1: $LAYERS1"
echo "  $IMG2: $LAYERS2"
echo ""

# Architecture comparison
ARCH1=$(docker image inspect "$IMG1" --format "{{.Architecture}}")
ARCH2=$(docker image inspect "$IMG2" --format "{{.Architecture}}")

echo "Architecture:"
echo "  $IMG1: $ARCH1"
echo "  $IMG2: $ARCH2"
```

## Comparing Layer Digests

Layer digests tell you exactly which layers are shared between two images and which are different.

Compare layer digests:

```bash
# List layers side by side
echo "=== Layers in v1 ==="
docker image inspect myapp:v1 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}"

echo "=== Layers in v2 ==="
docker image inspect myapp:v2 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}"

# Find common layers
comm -12 \
    <(docker image inspect myapp:v1 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect myapp:v2 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort)

# Find layers unique to each image
echo "=== Only in v1 ==="
comm -23 \
    <(docker image inspect myapp:v1 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect myapp:v2 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort)

echo "=== Only in v2 ==="
comm -13 \
    <(docker image inspect myapp:v1 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect myapp:v2 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort)
```

## Comparing Build History

The build history shows which Dockerfile instructions created each layer and how big they are.

Diff the build history of two images:

```bash
# Save history of both images
docker history --no-trunc myapp:v1 --format "{{.Size}}\t{{.CreatedBy}}" > /tmp/history-v1.txt
docker history --no-trunc myapp:v2 --format "{{.Size}}\t{{.CreatedBy}}" > /tmp/history-v2.txt

# Diff the histories
diff /tmp/history-v1.txt /tmp/history-v2.txt

# Color-coded diff (requires colordiff)
diff /tmp/history-v1.txt /tmp/history-v2.txt | colordiff 2>/dev/null || diff /tmp/history-v1.txt /tmp/history-v2.txt
```

## Using container-diff

Google's container-diff tool is purpose-built for comparing container images. It analyzes filesystem content, package installations, and more.

Install container-diff:

```bash
# macOS
brew install container-diff

# Linux
curl -LO https://storage.googleapis.com/container-diff/latest/container-diff-linux-amd64
chmod +x container-diff-linux-amd64
sudo mv container-diff-linux-amd64 /usr/local/bin/container-diff
```

Compare images with container-diff:

```bash
# Compare all aspects of two images
container-diff diff myapp:v1 myapp:v2 --type=file --type=pip --type=apt --type=size

# Compare only the filesystem (files added, removed, modified)
container-diff diff myapp:v1 myapp:v2 --type=file

# Compare installed apt packages
container-diff diff myapp:v1 myapp:v2 --type=apt

# Compare installed pip packages
container-diff diff myapp:v1 myapp:v2 --type=pip

# Compare installed npm packages
container-diff diff myapp:v1 myapp:v2 --type=node

# Compare image size by layer
container-diff diff myapp:v1 myapp:v2 --type=size

# Output as JSON for programmatic processing
container-diff diff myapp:v1 myapp:v2 --type=apt --json

# Compare remote images (pulls from registry)
container-diff diff docker://nginx:1.24 docker://nginx:1.25 --type=file
```

The file comparison shows added, deleted, and modified files with their sizes. The package comparisons show version changes, additions, and removals.

## Filesystem-Level Comparison

For the most detailed comparison, export both images and diff their filesystems.

Compare the actual file contents:

```bash
# Export both images to directories
CID1=$(docker create myapp:v1)
CID2=$(docker create myapp:v2)

mkdir -p /tmp/image-v1 /tmp/image-v2

docker export $CID1 | tar -xC /tmp/image-v1
docker export $CID2 | tar -xC /tmp/image-v2

docker rm $CID1 $CID2

# Compare directory trees
diff -rq /tmp/image-v1 /tmp/image-v2

# Find files only in v1
diff -rq /tmp/image-v1 /tmp/image-v2 | grep "Only in /tmp/image-v1"

# Find files only in v2
diff -rq /tmp/image-v1 /tmp/image-v2 | grep "Only in /tmp/image-v2"

# Find modified files
diff -rq /tmp/image-v1 /tmp/image-v2 | grep "differ"

# Compare specific files
diff /tmp/image-v1/etc/nginx/nginx.conf /tmp/image-v2/etc/nginx/nginx.conf

# Clean up
rm -rf /tmp/image-v1 /tmp/image-v2
```

## Comparing Installed Packages

Check what packages differ between two images.

Compare system packages:

```bash
# Compare apt packages (Debian/Ubuntu)
diff \
    <(docker run --rm myapp:v1 dpkg -l | awk '{print $2, $3}' | sort) \
    <(docker run --rm myapp:v2 dpkg -l | awk '{print $2, $3}' | sort)

# Compare apk packages (Alpine)
diff \
    <(docker run --rm myapp:v1 apk list --installed 2>/dev/null | sort) \
    <(docker run --rm myapp:v2 apk list --installed 2>/dev/null | sort)

# Compare pip packages
diff \
    <(docker run --rm myapp:v1 pip list --format=freeze 2>/dev/null | sort) \
    <(docker run --rm myapp:v2 pip list --format=freeze 2>/dev/null | sort)

# Compare npm packages
diff \
    <(docker run --rm myapp:v1 npm list --all --json 2>/dev/null) \
    <(docker run --rm myapp:v2 npm list --all --json 2>/dev/null)
```

## Comparing Configuration

Diff the image configuration (environment variables, labels, ports, etc.).

Compare image configuration:

```bash
# Compare environment variables
echo "=== Environment Variables ==="
diff \
    <(docker image inspect myapp:v1 --format "{{range .Config.Env}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect myapp:v2 --format "{{range .Config.Env}}{{.}}{{println}}{{end}}" | sort)

# Compare labels
echo "=== Labels ==="
diff \
    <(docker image inspect myapp:v1 --format "{{json .Config.Labels}}" | python3 -m json.tool) \
    <(docker image inspect myapp:v2 --format "{{json .Config.Labels}}" | python3 -m json.tool)

# Compare exposed ports
echo "=== Exposed Ports ==="
diff \
    <(docker image inspect myapp:v1 --format "{{json .Config.ExposedPorts}}") \
    <(docker image inspect myapp:v2 --format "{{json .Config.ExposedPorts}}")

# Compare entrypoint and command
echo "=== Entrypoint/CMD ==="
echo "v1 Entrypoint: $(docker image inspect myapp:v1 --format '{{.Config.Entrypoint}}')"
echo "v2 Entrypoint: $(docker image inspect myapp:v2 --format '{{.Config.Entrypoint}}')"
echo "v1 CMD: $(docker image inspect myapp:v1 --format '{{.Config.Cmd}}')"
echo "v2 CMD: $(docker image inspect myapp:v2 --format '{{.Config.Cmd}}')"
```

## Using Docker Scout for Security Comparison

Docker Scout compares the security posture of two images, showing which vulnerabilities were added or fixed.

Compare vulnerabilities between image versions:

```bash
# Compare security profiles
docker scout compare myapp:v2 --to myapp:v1

# Show only new vulnerabilities in v2
docker scout cves myapp:v2 --only-severity critical,high

# Compare with a specific base image
docker scout compare myapp:latest --to nginx:alpine
```

## A Comprehensive Comparison Script

Here is a script that combines multiple comparison methods:

```bash
#!/bin/bash
# image-diff.sh - Comprehensive Docker image comparison

set -euo pipefail

IMG1="${1:?Usage: $0 <image1> <image2>}"
IMG2="${2:?Usage: $0 <image1> <image2>}"

echo "========================================="
echo "Comparing: $IMG1 vs $IMG2"
echo "========================================="

# Size comparison
echo ""
echo "--- Size ---"
SIZE1=$(docker image inspect "$IMG1" --format "{{.Size}}")
SIZE2=$(docker image inspect "$IMG2" --format "{{.Size}}")
echo "$IMG1: $((SIZE1 / 1048576)) MB"
echo "$IMG2: $((SIZE2 / 1048576)) MB"
echo "Delta: $(( (SIZE2 - SIZE1) / 1048576 )) MB"

# Layer comparison
echo ""
echo "--- Layers ---"
L1=$(docker image inspect "$IMG1" --format "{{len .RootFS.Layers}}")
L2=$(docker image inspect "$IMG2" --format "{{len .RootFS.Layers}}")
echo "$IMG1: $L1 layers"
echo "$IMG2: $L2 layers"

SHARED=$(comm -12 \
    <(docker image inspect "$IMG1" --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect "$IMG2" --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}" | sort) | wc -l | tr -d ' ')
echo "Shared layers: $SHARED"

# Environment comparison
echo ""
echo "--- Environment Variable Changes ---"
diff \
    <(docker image inspect "$IMG1" --format "{{range .Config.Env}}{{.}}{{println}}{{end}}" | sort) \
    <(docker image inspect "$IMG2" --format "{{range .Config.Env}}{{.}}{{println}}{{end}}" | sort) || true

# History comparison
echo ""
echo "--- Build History Differences ---"
diff \
    <(docker history "$IMG1" --format "{{.Size}} {{.CreatedBy}}" | head -20) \
    <(docker history "$IMG2" --format "{{.Size}} {{.CreatedBy}}" | head -20) || true

echo ""
echo "========================================="
echo "Comparison complete"
echo "========================================="
```

Make it executable and use it:

```bash
chmod +x image-diff.sh
./image-diff.sh myapp:v1 myapp:v2
```

## CI/CD Integration

Run image comparisons automatically when new images are built.

GitHub Actions example:

```yaml
# .github/workflows/image-compare.yml
name: Compare Images

on:
  pull_request:

jobs:
  compare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build new image
        run: docker build -t myapp:pr .

      - name: Pull current production image
        run: docker pull myregistry.example.com/myapp:latest

      - name: Compare images
        run: |
          echo "## Image Comparison" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY

          OLD_SIZE=$(docker image inspect myregistry.example.com/myapp:latest --format "{{.Size}}")
          NEW_SIZE=$(docker image inspect myapp:pr --format "{{.Size}}")
          DELTA=$(( (NEW_SIZE - OLD_SIZE) / 1048576 ))

          echo "- Current size: $((OLD_SIZE / 1048576)) MB" >> $GITHUB_STEP_SUMMARY
          echo "- New size: $((NEW_SIZE / 1048576)) MB" >> $GITHUB_STEP_SUMMARY
          echo "- Delta: ${DELTA} MB" >> $GITHUB_STEP_SUMMARY

          # Fail if image grew by more than 50MB
          if [ "$DELTA" -gt 50 ]; then
            echo "Image size increased by ${DELTA}MB (threshold: 50MB)"
            exit 1
          fi
```

## Summary

Start with quick comparisons using `docker image inspect` for size and layer counts. Use `docker history` to diff build instructions. For detailed filesystem comparisons, export both images and use standard diff tools. Google's container-diff analyzes files, packages, and sizes in one command. Docker Scout compares security postures. Combine these into a script or CI step to catch unexpected changes between image versions. Understanding what changed between two images is the first step to understanding why something broke.
