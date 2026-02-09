# How to Convert a Docker Image to an OCI Image

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, OCI, Images, Containers, Registry, DevOps, Standards, Skopeo

Description: Learn how to convert Docker images to OCI format for broader compatibility with container runtimes and registries.

---

Docker created the original container image format, but it is no longer the only standard. The Open Container Initiative (OCI) image specification has become the industry standard, supported by every major container runtime, registry, and orchestration platform. While Docker images and OCI images are compatible in most cases, there are situations where you need a proper OCI-format image, whether for compliance, tooling requirements, or interoperability with non-Docker runtimes.

This guide explains the differences between Docker and OCI image formats and walks through practical methods to convert between them.

## Docker Format vs OCI Format

Both formats describe container images as a collection of layers with metadata, but they differ in specifics.

The Docker image format (also called Docker V2 Schema 2) uses Docker-specific media types:
- Manifest: `application/vnd.docker.distribution.manifest.v2+json`
- Config: `application/vnd.docker.container.image.v1+json`
- Layer: `application/vnd.docker.image.rootfs.diff.tar.gzip`

The OCI image format uses standard OCI media types:
- Manifest: `application/vnd.oci.image.manifest.v1+json`
- Config: `application/vnd.oci.image.config.v1+json`
- Layer: `application/vnd.oci.image.layer.v1.tar+gzip`

The layer content is identical in both formats. The difference is primarily in the manifest and configuration JSON structure and their media types.

## Checking an Image's Format

Before converting, check what format your image currently uses.

Inspect the media type of an image:

```bash
# Check the manifest media type using docker buildx
docker buildx imagetools inspect nginx:alpine --raw | head -5

# Using skopeo to inspect the manifest
skopeo inspect --raw docker://nginx:alpine | python3 -c "
import json, sys
manifest = json.load(sys.stdin)
print(f\"Media type: {manifest.get('mediaType', 'not specified')}\")
print(f\"Schema version: {manifest.get('schemaVersion', 'unknown')}\")
"

# Using crane (from go-containerregistry)
crane manifest nginx:alpine | python3 -m json.tool | head -5
```

## Method 1: Using Skopeo

Skopeo is the most straightforward tool for converting between image formats. It can copy images between registries, local directories, and different formats.

Install skopeo:

```bash
# macOS
brew install skopeo

# Ubuntu/Debian
sudo apt-get install skopeo

# Fedora/RHEL
sudo dnf install skopeo
```

### Convert a Docker Image to OCI Layout

Copy a Docker image to an OCI layout directory on disk:

```bash
# Convert a Docker Hub image to OCI layout on disk
skopeo copy docker://nginx:alpine oci:nginx-oci:alpine

# The output is a directory with OCI layout structure
ls nginx-oci/
# blobs/  index.json  oci-layout

# Inspect the OCI layout
cat nginx-oci/oci-layout
# {"imageLayoutVersion": "1.0.0"}

# View the index
cat nginx-oci/index.json | python3 -m json.tool
```

### Convert and Push to a Registry in OCI Format

Copy an image between registries while converting the format:

```bash
# Pull from Docker Hub in Docker format, push to another registry in OCI format
skopeo copy \
    --dest-oci-accept-uncompressed-layers \
    docker://nginx:alpine \
    docker://myregistry.example.com/nginx:alpine

# Convert a local Docker image to OCI format in a registry
skopeo copy \
    docker-daemon:myapp:latest \
    docker://myregistry.example.com/myapp:latest
```

### Convert from Local Docker Daemon

Export an image from the local Docker daemon to OCI format:

```bash
# Copy from Docker daemon to OCI directory layout
skopeo copy docker-daemon:myapp:latest oci:myapp-oci:latest

# Copy from Docker daemon to an OCI tar archive
skopeo copy docker-daemon:myapp:latest oci-archive:myapp-oci.tar:latest
```

## Method 2: Using Docker Buildx

Docker Buildx can output images in OCI format directly during the build process.

Build an image and output in OCI format:

```bash
# Build and export as OCI tar
docker buildx build --output type=oci,dest=myapp-oci.tar .

# Build and export as OCI layout directory
docker buildx build --output type=oci,dest=./myapp-oci .

# Build and push to a registry in OCI format
docker buildx build \
    --output type=image,push=true,oci-mediatypes=true \
    -t myregistry.example.com/myapp:latest .
```

For existing images that you want to convert without rebuilding, combine buildx with a minimal Dockerfile:

```dockerfile
# convert.Dockerfile - Convert an existing image to OCI
FROM nginx:alpine
```

```bash
# Build this trivial Dockerfile and export as OCI
docker buildx build \
    -f convert.Dockerfile \
    --output type=oci,dest=nginx-oci.tar \
    .
```

## Method 3: Using crane

crane is a tool from the go-containerregistry project. It is fast and works well in CI environments.

Install crane:

```bash
# macOS
brew install crane

# Linux
go install github.com/google/go-containerregistry/cmd/crane@latest

# Or download the binary
curl -sL https://github.com/google/go-containerregistry/releases/latest/download/go-containerregistry_Linux_x86_64.tar.gz | \
    tar xz -C /usr/local/bin/ crane
```

Use crane to convert and copy images:

```bash
# Copy an image (crane handles format conversion automatically)
crane copy nginx:alpine myregistry.example.com/nginx:alpine

# Pull an image as a tarball
crane pull nginx:alpine nginx.tar

# Push a tarball to a registry
crane push nginx.tar myregistry.example.com/nginx:latest

# View the manifest to verify format
crane manifest myregistry.example.com/nginx:alpine | python3 -m json.tool
```

## Method 4: Using buildah

Buildah is a tool for building OCI-compliant images. It natively produces OCI format images.

Create an OCI image with buildah:

```bash
# Install buildah
sudo apt-get install buildah

# Pull an image
buildah pull nginx:alpine

# Create a working container
container=$(buildah from nginx:alpine)

# Make modifications if needed
buildah run $container -- apk add curl

# Commit as OCI image
buildah commit --format oci $container myapp-oci:latest

# Push to a registry in OCI format
buildah push myapp-oci:latest docker://myregistry.example.com/myapp:latest
```

Build from a Dockerfile using buildah:

```bash
# Build a Dockerfile and produce an OCI image
buildah build-using-dockerfile --format oci -t myapp:latest .

# Push the OCI image
buildah push myapp:latest docker://myregistry.example.com/myapp:latest
```

## Working with OCI Layout Directories

An OCI layout directory is a standard directory structure for storing OCI images on disk.

Explore an OCI layout:

```bash
# Create an OCI layout from a Docker image
skopeo copy docker://nginx:alpine oci:./nginx-oci:alpine

# The directory structure looks like this:
# nginx-oci/
#   oci-layout           # Version marker
#   index.json           # Entry point listing all manifests
#   blobs/
#     sha256/
#       abc123...        # Image config
#       def456...        # Layer tarballs
#       ghi789...        # Manifest

# Read the image manifest
INDEX=$(cat nginx-oci/index.json)
MANIFEST_DIGEST=$(echo "$INDEX" | python3 -c "
import json, sys
idx = json.load(sys.stdin)
print(idx['manifests'][0]['digest'].replace('sha256:', ''))
")

# View the manifest
cat "nginx-oci/blobs/sha256/$MANIFEST_DIGEST" | python3 -m json.tool
```

## Working with OCI Archives

An OCI archive is a tar file containing an OCI layout. It is useful for transferring OCI images between systems.

Create and use OCI archives:

```bash
# Create an OCI archive from a Docker image
skopeo copy docker://nginx:alpine oci-archive:nginx-oci.tar:alpine

# Inspect the contents
tar tf nginx-oci.tar

# Import an OCI archive into the local Docker daemon
skopeo copy oci-archive:nginx-oci.tar docker-daemon:nginx-imported:alpine

# Push an OCI archive to a registry
skopeo copy oci-archive:nginx-oci.tar docker://myregistry.example.com/nginx:alpine
```

## Verifying OCI Compliance

After conversion, verify that the image conforms to the OCI specification.

Validate the OCI image:

```bash
# Check the manifest media type
skopeo inspect --raw oci:./nginx-oci:alpine | python3 -c "
import json, sys
m = json.load(sys.stdin)
media_type = m.get('mediaType', 'not specified')
expected = 'application/vnd.oci.image.manifest.v1+json'
if media_type == expected:
    print(f'Valid OCI manifest: {media_type}')
else:
    print(f'Not OCI format. Got: {media_type}')
    print(f'Expected: {expected}')
"

# Validate using oci-image-tool (from opencontainers)
# Install: go install github.com/opencontainers/image-tools/cmd/oci-image-tool@latest
oci-image-tool validate --type image ./nginx-oci/
```

## CI/CD Integration

Automate OCI image creation in your pipeline.

GitHub Actions example:

```yaml
# .github/workflows/oci-build.yml
name: Build OCI Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push OCI image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          outputs: type=image,oci-mediatypes=true
```

## Common Issues

A few problems come up during format conversion.

Some older registries do not support OCI manifests. If you get a "manifest invalid" error when pushing, the registry may only accept Docker format manifests. Check the registry documentation or try pushing in Docker format first.

Multi-platform manifests (manifest lists) have slightly different formats between Docker and OCI. The Docker format uses `application/vnd.docker.distribution.manifest.list.v2+json`, while OCI uses `application/vnd.oci.image.index.v1+json`. Most modern registries handle both, but verify if you encounter issues.

Some tools report the format as "Docker" even when the content is OCI-compatible. The layer content is the same, so this usually does not cause functional problems. The format distinction matters primarily for tooling that checks media types explicitly.

## Summary

Most modern container tools handle both Docker and OCI formats transparently. When you need explicit OCI format, use skopeo for copying and converting between formats, Docker Buildx with `oci-mediatypes=true` for building, crane for registry operations, or buildah for native OCI builds. Verify the format by checking manifest media types. For most practical purposes, the two formats are interchangeable, but having the tools and knowledge to convert when needed keeps your container workflows flexible.
