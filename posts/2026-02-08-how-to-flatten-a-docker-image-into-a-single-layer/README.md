# How to Flatten a Docker Image into a Single Layer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Images, Layers, Optimization, DevOps, Containers, Image Size

Description: Learn how to flatten a multi-layer Docker image into a single layer to reduce size and hide build history using export and import.

---

Docker images accumulate layers with every Dockerfile instruction. Each RUN, COPY, and ADD creates a new layer that gets stacked on top of the previous ones. Even if you delete a file in a later layer, the file still exists in the earlier layer, consuming space. Flattening squashes all layers into one, eliminating this overhead and producing a cleaner, often smaller image.

Flattening also strips the build history, which can be useful when you do not want to expose how the image was built. This guide covers the practical methods for flattening Docker images, when you should do it, and when you should not.

## Why Flatten an Image

Several practical reasons make flattening worthwhile.

**Size reduction.** When a Dockerfile installs build tools, compiles code, then removes the build tools, those tools still exist in earlier layers. Flattening eliminates this duplication. A 500MB image can sometimes shrink to 200MB after flattening.

**Hiding build details.** The build history reveals every command used to create the image. Flattening strips this information, which some organizations want for security or intellectual property reasons.

**Simpler layer structure.** Debugging layer issues becomes irrelevant when there is only one layer. Tools that analyze layers have less work to do.

**Registry storage.** Fewer layers mean fewer objects to store and transfer when pushing to and pulling from registries.

## Method 1: Export and Import

The classic approach uses `docker export` and `docker import`. You run a container from the image, export its filesystem, then import that filesystem as a new single-layer image.

Flatten an image using export/import:

```bash
# Step 1: Create a container from the image (it does not need to run)
docker create --name temp-container myapp:latest

# Step 2: Export the container's filesystem to a tar file
docker export temp-container -o flat-image.tar

# Step 3: Import the tar file as a new image
docker import flat-image.tar myapp:flat

# Step 4: Clean up
docker rm temp-container
rm flat-image.tar

# Verify the result
docker images myapp
# REPOSITORY   TAG      IMAGE ID       CREATED          SIZE
# myapp        flat     d4e5f6a1b2c3   10 seconds ago   180MB
# myapp        latest   a1b2c3d4e5f6   2 hours ago      450MB
```

Check the layer count before and after:

```bash
# Count layers in the original image
docker image inspect myapp:latest --format "Layers: {{len .RootFS.Layers}}"
# Layers: 12

# Count layers in the flattened image
docker image inspect myapp:flat --format "Layers: {{len .RootFS.Layers}}"
# Layers: 1
```

## One-Liner Flatten Command

Combine the export and import steps into a single command without intermediate files.

Flatten an image in one line:

```bash
# Flatten without creating a temporary tar file
docker export $(docker create myapp:latest) | docker import - myapp:flat
```

A cleaner version that also cleans up the temporary container:

```bash
# Flatten and clean up the temp container
CID=$(docker create myapp:latest) && \
    docker export $CID | docker import - myapp:flat && \
    docker rm $CID
```

## Preserving CMD, ENTRYPOINT, and Other Metadata

The major downside of export/import is that it strips all image metadata. The CMD, ENTRYPOINT, ENV, EXPOSE, WORKDIR, and other configuration from the original Dockerfile are lost.

Verify the metadata loss:

```bash
# Check the original image's config
docker image inspect myapp:latest --format "CMD: {{.Config.Cmd}}"
# CMD: [python3 app.py]

# Check the flattened image - it's gone
docker image inspect myapp:flat --format "CMD: {{.Config.Cmd}}"
# CMD: []
```

You can restore this metadata during the import step using `--change` flags:

```bash
# Import with restored metadata
docker export $(docker create myapp:latest) | \
    docker import \
        --change 'CMD ["python3", "app.py"]' \
        --change 'WORKDIR /app' \
        --change 'ENV NODE_ENV=production' \
        --change 'EXPOSE 3000' \
        - myapp:flat
```

The `--change` flag accepts standard Dockerfile instructions. You can pass multiple `--change` flags to set multiple configuration options.

### Extracting Config Automatically

Write a script that reads the original config and applies it to the flattened image:

```bash
#!/bin/bash
# flatten.sh - Flatten an image while preserving metadata

SOURCE_IMAGE=$1
TARGET_IMAGE=$2

if [ -z "$SOURCE_IMAGE" ] || [ -z "$TARGET_IMAGE" ]; then
    echo "Usage: $0 <source-image> <target-image>"
    exit 1
fi

# Extract metadata from the original image
CMD=$(docker image inspect "$SOURCE_IMAGE" --format '{{json .Config.Cmd}}')
ENTRYPOINT=$(docker image inspect "$SOURCE_IMAGE" --format '{{json .Config.Entrypoint}}')
WORKDIR=$(docker image inspect "$SOURCE_IMAGE" --format '{{.Config.WorkingDir}}')
USER=$(docker image inspect "$SOURCE_IMAGE" --format '{{.Config.User}}')

# Build the --change arguments
CHANGES=""
if [ "$CMD" != "null" ] && [ "$CMD" != "[]" ]; then
    CHANGES="$CHANGES --change \"CMD $CMD\""
fi
if [ "$ENTRYPOINT" != "null" ] && [ "$ENTRYPOINT" != "[]" ]; then
    CHANGES="$CHANGES --change \"ENTRYPOINT $ENTRYPOINT\""
fi
if [ -n "$WORKDIR" ]; then
    CHANGES="$CHANGES --change \"WORKDIR $WORKDIR\""
fi
if [ -n "$USER" ]; then
    CHANGES="$CHANGES --change \"USER $USER\""
fi

# Add environment variables
docker image inspect "$SOURCE_IMAGE" --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}' | \
    while read -r env; do
        if [ -n "$env" ]; then
            CHANGES="$CHANGES --change \"ENV $env\""
        fi
    done

# Add exposed ports
docker image inspect "$SOURCE_IMAGE" --format '{{range $port, $_ := .Config.ExposedPorts}}{{$port}}{{"\n"}}{{end}}' | \
    while read -r port; do
        if [ -n "$port" ]; then
            CHANGES="$CHANGES --change \"EXPOSE $port\""
        fi
    done

# Create container, export, and import with metadata
CID=$(docker create "$SOURCE_IMAGE")
eval "docker export $CID | docker import $CHANGES - $TARGET_IMAGE"
docker rm "$CID" > /dev/null

echo "Flattened $SOURCE_IMAGE to $TARGET_IMAGE"
echo "Original layers: $(docker image inspect "$SOURCE_IMAGE" --format '{{len .RootFS.Layers}}')"
echo "Flattened layers: $(docker image inspect "$TARGET_IMAGE" --format '{{len .RootFS.Layers}}')"
```

## Method 2: Multi-Stage Build (Better Alternative)

Instead of flattening after the fact, a multi-stage build achieves a similar result during the build process. It is cleaner and preserves all Dockerfile metadata.

Use a multi-stage build to minimize layers:

```dockerfile
# Stage 1: Build with all tools
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y build-essential python3-dev && \
    pip install -r requirements.txt

COPY . /app
WORKDIR /app
RUN python3 setup.py build

# Stage 2: Copy only what you need into a fresh base
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy the built application from stage 1
COPY --from=builder /app/build /app

WORKDIR /app
CMD ["python3", "main.py"]
```

The final image only contains layers from the second stage. All the build tools, intermediate files, and package caches from stage 1 are excluded automatically.

## Method 3: Using FROM scratch

For the ultimate minimal image, copy your application into a `scratch` (empty) base. This works for statically compiled binaries.

Build a single-layer image from scratch:

```dockerfile
# Build a Go binary
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o server .

# Create a single-layer image
FROM scratch
COPY --from=builder /app/server /server
CMD ["/server"]
```

This produces an image with exactly one layer containing just your binary.

## Comparing Size Before and After

Measure the actual size reduction from flattening:

```bash
# Build a test image with intentional waste
cat > Dockerfile.test << 'EOF'
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y build-essential wget curl git
RUN dd if=/dev/urandom of=/tmp/large-file bs=1M count=100
RUN rm /tmp/large-file
RUN apt-get purge -y build-essential && apt-get autoremove -y
EOF

# Build the original image
docker build -t test-original -f Dockerfile.test .

# Flatten it
CID=$(docker create test-original)
docker export $CID | docker import - test-flat
docker rm $CID

# Compare sizes
docker images test-original --format "Original: {{.Size}}"
docker images test-flat --format "Flattened: {{.Size}}"

# The flattened image should be significantly smaller because the
# 100MB file deleted in layer 3 no longer exists in any layer
```

## When Not to Flatten

Flattening is not always beneficial.

**Layer sharing stops working.** When multiple images share the same base image, Docker stores those shared layers only once. Flattened images cannot share layers with other images, so total disk usage across all your images might increase.

**Incremental pulls break.** When you update and push a non-flattened image, registries only transfer the changed layers. A flattened image transfers the entire image on every push because there is only one layer.

**Build caching is lost.** Docker's layer cache speeds up rebuilds by reusing unchanged layers. A flattened image has no layers to cache.

**Debugging becomes harder.** You cannot inspect which Dockerfile instruction caused a problem when the history is stripped.

## Flattening in CI/CD

Automate flattening as part of your build pipeline:

```yaml
# .github/workflows/build.yml
name: Build and Flatten

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:build .

      - name: Flatten image
        run: |
          CID=$(docker create myapp:build)
          docker export $CID | docker import \
              --change 'CMD ["python3", "app.py"]' \
              --change 'WORKDIR /app' \
              - myapp:flat
          docker rm $CID

      - name: Push flattened image
        run: |
          docker tag myapp:flat myregistry.example.com/myapp:latest
          docker push myregistry.example.com/myapp:latest
```

## Summary

Flatten images using `docker export | docker import` when you need to eliminate wasted space from deleted files in layers or hide build history. Remember to restore CMD, ENTRYPOINT, and other metadata using `--change` flags. For most cases, a well-structured multi-stage Dockerfile achieves the same size benefits without the drawbacks of flattening. Reserve flattening for specific situations where single-layer images are required or where stripping build history is a security requirement.
