# How to Inspect Docker Image Layers and History

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Image, Layer, History, Inspection, DevOps, Debugging, Optimization

Description: Learn how to inspect Docker image layers and build history to debug image issues, understand size, and optimize your builds.

---

Every Docker image is a stack of read-only layers. Each layer represents a Dockerfile instruction that changed the filesystem. Understanding these layers helps you debug build issues, optimize image size, identify what changed between versions, and verify that sensitive data did not leak into your images.

This guide covers every tool and technique for inspecting Docker image layers, from built-in Docker commands to specialized tools like dive.

## Understanding Image Layers

A Docker image is not a single file. It is an ordered collection of filesystem diffs. When you write a Dockerfile with five instructions that create filesystem changes, the resulting image has five layers (plus the base image layers). Instructions that only change metadata still appear in the image history, but they do not create filesystem layers.

Consider this Dockerfile:

```dockerfile
FROM ubuntu:22.04           # Layer 1: base OS filesystem
RUN apt-get update          # Layer 2: updated package lists
RUN apt-get install -y curl # Layer 3: curl binary and dependencies
COPY app.py /app/app.py     # Layer 4: your application file
CMD ["python3", "/app/app.py"]  # Layer 5: metadata only (no filesystem change)
```

Layers 1-4 each contain actual filesystem changes. Layer 5 only adds metadata (the default command), so it does not create a new filesystem layer.

## Viewing Image History

The `docker history` command shows the creation history of an image, including filesystem layers and metadata-only instructions.

View the build history of an image:

```bash
# Show image history

docker history nginx:alpine

# Sample output:
# IMAGE          CREATED       CREATED BY                                      SIZE
# f1e2d3c4b5a6   3 days ago    CMD ["nginx" "-g" "daemon off;"]                0B
# <missing>      3 days ago    STOPSIGNAL SIGQUIT                              0B
# <missing>      3 days ago    EXPOSE map[80/tcp:{}]                           0B
# <missing>      3 days ago    ENTRYPOINT ["/docker-entrypoint.sh"]            0B
# <missing>      3 days ago    COPY 30-tune-worker-processes.sh ... (truncated) 4.62kB
# <missing>      3 days ago    COPY 20-envsubst-on-templates.sh ... (truncated) 3.02kB
# <missing>      3 days ago    RUN /bin/sh -c set -x &&...                    28.1MB
```

The output shows what command created each history entry and how much space it added.

## Full History Without Truncation

By default, Docker truncates long commands in the history output. Use `--no-trunc` to see everything.

View the full, untruncated history:

```bash
# Show full commands without truncation
docker history --no-trunc nginx:alpine

# Format as a clean list showing size and command
docker history --no-trunc --format "{{.Size}}\t{{.CreatedBy}}" nginx:alpine
```

The `--no-trunc` flag is essential when you need to see the exact RUN commands, especially for debugging build issues or auditing for leaked secrets.

## Custom History Formatting

Use Go templates to customize the history output.

Format history output for different use cases:

```bash
# Show only layers with actual filesystem changes (non-zero size)
docker history nginx:alpine --format "{{.Size}}\t{{.CreatedBy}}" | grep -v "^0B"

# Table format with specific columns
docker history --format "table {{.ID}}\t{{.Size}}\t{{.CreatedSince}}\t{{.CreatedBy}}" nginx:alpine

# JSON output for programmatic analysis
docker history --format json nginx:alpine

# Show only the Dockerfile instructions (strip /bin/sh -c prefix)
docker history --no-trunc --format "{{.CreatedBy}}" nginx:alpine | \
    sed 's|/bin/sh -c #(nop) ||g; s|/bin/sh -c ||g'
```

## Inspecting Image Metadata

The `docker image inspect` command returns detailed JSON metadata about an image.

Inspect the full image metadata:

```bash
# Full JSON output
docker image inspect nginx:alpine

# Extract specific fields
docker image inspect nginx:alpine --format "{{.Architecture}}"
docker image inspect nginx:alpine --format "{{.Os}}"
docker image inspect nginx:alpine --format "{{.Created}}"

# Show all environment variables
docker image inspect nginx:alpine --format "{{range .Config.Env}}{{.}}{{println}}{{end}}"

# Show exposed ports
docker image inspect nginx:alpine --format "{{json .Config.ExposedPorts}}"

# Show the entrypoint and command
docker image inspect nginx:alpine --format "Entrypoint: {{.Config.Entrypoint}}"
docker image inspect nginx:alpine --format "Cmd: {{.Config.Cmd}}"

# Show all labels
docker image inspect nginx:alpine --format "{{json .Config.Labels}}" | python3 -m json.tool
```

## Viewing Layer Digests

Each filesystem layer has a content-addressable digest. The values in `.RootFS.Layers` are diff IDs for the image's uncompressed layers. Comparing these values between images tells you which local filesystem layers they share.

List the layer digests:

```bash
# Show layer digests (diff IDs)
docker image inspect nginx:alpine --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}"

# Count the number of layers
docker image inspect nginx:alpine --format "{{len .RootFS.Layers}}"

# Compare layers between two images to find shared ones
diff <(docker image inspect nginx:alpine --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}") \
     <(docker image inspect nginx:latest --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}")
```

Shared layers are stored only once on disk. If two images share the same base image layers, those layers consume space only once.

## Using dive to Explore Layers Interactively

dive is a terminal UI tool that lets you browse through each layer of a Docker image, seeing exactly what files were added, modified, or removed.

Install and use dive:

```bash
# Install dive
# macOS
brew install dive

# Linux
wget https://github.com/wagoodman/dive/releases/latest/download/dive_linux_amd64.deb
dpkg -i dive_linux_amd64.deb

# Run via Docker (no installation needed)
docker run --rm -it \
    -v /var/run/docker.sock:/var/run/docker.sock \
    wagoodman/dive nginx:alpine
```

Run dive on an image:

```bash
# Explore an image interactively
dive nginx:alpine

# Analyze an image and get a pass/fail result (useful for CI)
dive nginx:alpine --ci
```

Inside dive, you can:
- Navigate through each layer with arrow keys
- See which files were added, modified, or removed in each layer
- View the cumulative file tree at any layer
- Filter files by modification type
- See the "image efficiency" score

## Using dive in CI/CD

Run dive as a CI step to catch inefficiencies:

```yaml
# .github/workflows/image-check.yml
name: Image Analysis

on: push

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:test .

      - name: Analyze with dive
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            wagoodman/dive myapp:test --ci \
            --lowestEfficiency=0.95 \
            --highestWastedBytes=20MB
```

The `--ci` flag makes dive exit with a non-zero code if the image fails the configured efficiency or wasted-space thresholds.

## Saving and Extracting Layers

You can export an image as a tar archive and inspect the raw layer contents.

Export and examine layer contents:

```bash
# Save an image to a tar file
docker save nginx:alpine -o nginx-alpine.tar

# List the contents of the tar file
tar tf nginx-alpine.tar

# The tar contains a manifest.json plus layer blobs or layer directories,
# depending on the Docker version and image store
# Extract it to examine
mkdir image-layers
tar xf nginx-alpine.tar -C image-layers/

# View the manifest
cat image-layers/manifest.json | python3 -m json.tool

# In OCI-layout exports, layers are blobs under blobs/sha256/
tar tf image-layers/blobs/sha256/6a0ac161...

# In legacy Docker-layout exports, each layer is a layer.tar file inside a directory
mkdir layer-contents
tar xf image-layers/sha256-abc123.../layer.tar -C layer-contents/
ls -la layer-contents/
```

## Finding Large Files in Layers

Identify which files contribute most to image size:

```bash
# Export the image and list archived blobs or layer files
docker save myapp:latest -o myapp.tar
tar tf myapp.tar | grep -E '(^blobs/sha256/|/layer\.tar$)' | head -50

# Use dive's CI mode to report wasted space
docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    wagoodman/dive myapp:latest --ci --json dive-report.json 2>/dev/null

# Manual approach: check size of archived blobs or layer files
mkdir myapp-extracted
tar xf myapp.tar -C myapp-extracted/
find myapp-extracted -type f \( -path '*/blobs/sha256/*' -o -name layer.tar \) | while read -r layer; do
    echo "=== $layer ==="
    tar tf "$layer" 2>/dev/null | head -5
    echo "Size: $(du -sh "$layer" | cut -f1)"
    echo ""
done
```

## Checking for Leaked Secrets

Inspect layers to verify no secrets were accidentally included.

Scan image layers for potential secrets:

```bash
# Search for common secret patterns in image history
docker history --no-trunc myapp:latest | grep -iE "password|secret|token|api.key|private"

# Search the actual filesystem for secret files
docker run --rm myapp:latest find / -name "*.pem" -o -name "*.key" -o -name ".env" -o -name "*.secret" 2>/dev/null

# Check environment variables for secrets
docker image inspect myapp:latest --format "{{range .Config.Env}}{{.}}{{println}}{{end}}" | \
    grep -iE "password|secret|token|key"

# Use tools like trufflehog or gitleaks on the image
trufflehog docker --image=docker://myapp:latest
```

## Comparing Image Versions

Compare two versions of an image to see what changed.

Diff the layers between two image versions:

```bash
# Compare layer counts
echo "v1 layers: $(docker image inspect myapp:v1 --format '{{len .RootFS.Layers}}')"
echo "v2 layers: $(docker image inspect myapp:v2 --format '{{len .RootFS.Layers}}')"

# Compare sizes
echo "v1 size: $(docker image inspect myapp:v1 --format '{{.Size}}')"
echo "v2 size: $(docker image inspect myapp:v2 --format '{{.Size}}')"

# Compare the actual layer hashes
diff \
    <(docker image inspect myapp:v1 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}") \
    <(docker image inspect myapp:v2 --format "{{range .RootFS.Layers}}{{.}}{{println}}{{end}}")
```

## Using docker buildx imagetools

For images in registries, inspect layers without pulling the image:

```bash
# Inspect a remote image's manifest and layers
docker buildx imagetools inspect nginx:alpine

# Show the raw manifest
docker buildx imagetools inspect --raw nginx:alpine | python3 -m json.tool
```

## Summary

Use `docker history` for a quick overview of how an image was built. Add `--no-trunc` to see full commands. Use `docker image inspect` for detailed metadata, layer digests, and configuration. Install dive for interactive layer exploration and CI-based efficiency checks. Export images with `docker save` when you need to examine raw layer contents. Regularly inspect your images for leaked secrets, unnecessary large files, and inefficient layer structures. Understanding layers is the foundation for building smaller, faster, more secure Docker images.
