# How to View Image History and Layers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Layer

Description: Learn how to view the build history and layer structure of container images using Podman to understand how images were constructed.

---

> Understanding image history and layers helps you optimize image size, debug build issues, and audit what goes into your containers.

Every container image is built from a series of layers. Filesystem-changing Containerfile instructions create layers, while metadata instructions can appear as zero-byte history entries. The `podman history` command lets you see exactly how an image was constructed, including each layer's size, the command that created it, and when it was built. This guide shows you how to analyze image history and layers with Podman.

---

## Viewing Basic Image History

See the build history of an image.

```bash
# View history of an nginx image

podman history nginx:1.25

# Sample output:
# ID            CREATED      CREATED BY                          SIZE     COMMENT
# a3ed95caeb02  2 days ago   /bin/sh -c #(nop) CMD [...]         0 B
# <missing>     2 days ago   /bin/sh -c #(nop) EXPOSE 80         0 B
# <missing>     2 days ago   COPY file:xyz... in /etc/nginx...   4.62kB
# <missing>     2 days ago   RUN /bin/sh -c set -x && ...        62.1MB
# ...

# View history of an alpine image
podman history alpine:3.19
```

## Showing Full Commands Without Truncation

By default, the `CREATED BY` column is truncated. Show the full commands.

```bash
# Show full commands without truncation
podman history --no-trunc nginx:1.25

# This reveals the complete RUN, COPY, and other instructions
# that were used to build each layer
```

## Formatting History Output

Customize the history output with Go templates.

```bash
# Show only size and command for each layer
podman history nginx:1.25 \
  --format "table {{.Size}}\t{{.CreatedBy}}"

# Show creation date and size
podman history nginx:1.25 \
  --format "table {{.Created}}\t{{.Size}}\t{{.CreatedBy}}"

# Show layer IDs and sizes
podman history nginx:1.25 \
  --format "table {{.ID}}\t{{.Size}}"

# JSON output for programmatic processing
podman history nginx:1.25 --format json | python3 -m json.tool
```

## Identifying Large Layers

Find which layers contribute the most to image size.

```bash
# Show layers sorted by size (largest first)
podman history --human=false nginx:1.25 --format "{{.Size}}\t{{.CreatedBy}}" \
  | sort -nr

# Show only layers with non-zero size
podman history --human=false nginx:1.25 --format "{{.Size}}\t{{.CreatedBy}}" \
  | grep -v "^0"

# Script to find the top 5 largest layers
echo "=== Top 5 Largest Layers ==="
podman history --no-trunc --human=false nginx:1.25 \
  --format "{{.Size}}\t{{.CreatedBy}}" \
  | grep -v "^0" \
  | sort -nr \
  | head -5
```

## Comparing Image Histories

Compare layers between different versions or images.

```bash
# Compare layer counts between two image versions
echo "nginx:1.24 layers: $(podman history -q nginx:1.24 | wc -l)"
echo "nginx:1.25 layers: $(podman history -q nginx:1.25 | wc -l)"

# Compare histories side by side
diff <(podman history --no-trunc nginx:1.24 --format "{{.CreatedBy}}") \
     <(podman history --no-trunc nginx:1.25 --format "{{.CreatedBy}}")

# Compare an image with its slim variant
podman history --human=false python:3.12 --format "{{.Size}}" | paste -sd+ | bc
podman history --human=false python:3.12-slim --format "{{.Size}}" | paste -sd+ | bc
```

## Viewing Layer Digests

Access the cryptographic digests of each layer.

```bash
# Get layer digests from image inspection
podman inspect nginx:1.25 --format '{{json .RootFS.Layers}}' \
  | python3 -m json.tool

# Count layers
podman inspect nginx:1.25 --format '{{len .RootFS.Layers}}'

# List layers one per line
podman inspect nginx:1.25 \
  --format '{{range .RootFS.Layers}}{{println .}}{{end}}'
```

## Understanding Layer Sharing

Images that share a base image also share layers, saving disk space.

```bash
# Pull two images based on the same base
podman pull python:3.12
podman pull python:3.12-slim

# See shared layer information
podman system df -v

# The "shared size" column shows how much storage is shared
# between images that use common base layers
```

## Analyzing Build Efficiency

Use history to identify optimization opportunities.

```bash
#!/bin/bash
# Analyze image build efficiency

IMAGE="${1:?Usage: $0 <image>}"

echo "=== Image Analysis: ${IMAGE} ==="
echo ""

# Total number of layers
LAYERS=$(podman history -q "$IMAGE" | wc -l)
echo "Total layers: ${LAYERS}"

# Number of layers with content
CONTENT_LAYERS=$(podman history --human=false "$IMAGE" --format "{{.Size}}" \
  | grep -v "^0$" | wc -l)
echo "Layers with content: ${CONTENT_LAYERS}"
echo "Empty layers: $((LAYERS - CONTENT_LAYERS))"

echo ""
echo "--- Layer Breakdown ---"
podman history "$IMAGE" \
  --format "table {{.Size}}\t{{.CreatedBy}}" \
  | grep -Ev "^0 ?B"

echo ""
echo "--- Optimization Tips ---"
# Check for multiple RUN layers
RUN_LAYERS=$(podman history --no-trunc "$IMAGE" \
  --format "{{.CreatedBy}}" | grep -c "RUN")
if [ "$RUN_LAYERS" -gt 5 ]; then
  echo "- Consider combining RUN instructions to reduce layers (found ${RUN_LAYERS} RUN layers)"
fi

# Check for large layers
LARGE=$(podman history --human=false "$IMAGE" --format "{{.Size}}" \
  | awk '$1 >= 104857600 { count++ } END { print count + 0 }')
if [ "$LARGE" -gt 0 ]; then
  echo "- ${LARGE} large layer(s) found, review for optimization"
fi
```

## Viewing History of Multi-Stage Build Images

Multi-stage builds produce images with only the layers from the final stage.

```bash
# Build a multi-stage image
cat > Containerfile << 'EOF'
# Build stage
FROM docker.io/library/golang:1.22 AS builder
WORKDIR /app
RUN echo 'package main; import "fmt"; func main() { fmt.Println("hello") }' > main.go
RUN go build -o app main.go

# Runtime stage
FROM docker.io/library/alpine:3.19
COPY --from=builder /app/app /usr/local/bin/app
CMD ["app"]
EOF

podman build -t myapp:latest .

# View history - only shows final stage layers
podman history myapp:latest

# Compare with the full golang builder image
podman history golang:1.22 | wc -l
podman history myapp:latest | wc -l
# The multi-stage image has far fewer layers
```

## Summary

The `podman history` command is essential for understanding how container images are built and where disk space is consumed. Use it to identify oversized layers, compare image versions, and find optimization opportunities in your Containerfiles. Layer analysis is a key skill for building efficient, minimal container images that are fast to pull and deploy.
