# How to Use Skopeo for Container Image Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Skopeo, Containers, OCI, Container Registry

Description: Manage and inspect container images on Ubuntu using Skopeo to copy images between registries, inspect image metadata, and sign images without pulling them locally.

---

Skopeo is a command-line tool for working with container images and registries. Unlike Docker, it does not require a daemon, does not need root, and does not pull images to local storage. You can inspect, copy, and delete remote images directly, which makes it extremely useful for automation, registry migrations, and CI/CD pipelines.

Skopeo is part of the containers ecosystem alongside Buildah and Podman. It uses the same `containers/image` library under the hood.

## Installing Skopeo

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install -y skopeo

# Verify installation
skopeo --version

# For a more recent version on Ubuntu 20.04:
. /etc/os-release
echo "deb https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${VERSION_ID}/ /" | \
    sudo tee /etc/apt/sources.list.d/containers.list

curl -L "https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${VERSION_ID}/Release.key" | \
    sudo apt-key add -

sudo apt update && sudo apt install -y skopeo
```

## Inspecting Images Without Pulling

One of Skopeo's most useful features is inspecting image metadata without downloading the entire image:

```bash
# Inspect an image on Docker Hub
skopeo inspect docker://nginx:latest

# The output is JSON with metadata:
# - Created timestamp
# - Architecture
# - OS
# - Environment variables
# - Entrypoint and Cmd
# - Exposed ports
# - Labels

# Inspect a specific field with jq
skopeo inspect docker://nginx:latest | jq '.Architecture'
skopeo inspect docker://nginx:latest | jq '.Env'
skopeo inspect docker://nginx:latest | jq '.Labels'

# Inspect the image manifest (layer information)
skopeo inspect --raw docker://nginx:latest | jq .

# Inspect a specific architecture (multi-arch images)
skopeo inspect --override-arch arm64 docker://nginx:latest

# List available tags for a repository
skopeo list-tags docker://nginx
skopeo list-tags docker://library/ubuntu | jq '.Tags[]' | sort
```

## Authenticating with Registries

```bash
# Log in to Docker Hub
skopeo login docker.io

# Log in with credentials passed directly (for scripting)
skopeo login -u username -p password docker.io

# Log in to a private registry
skopeo login registry.internal:5000

# Log in to multiple registries and store credentials
# Credentials are stored in ~/.config/containers/auth.json by default
cat ~/.config/containers/auth.json

# Log out
skopeo logout docker.io

# Use a specific credentials file
skopeo --authfile /path/to/auth.json inspect docker://private-registry.com/image:tag
```

## Copying Images Between Registries

This is where Skopeo really shines - copying images without pulling them to local storage:

```bash
# Copy from Docker Hub to another registry
skopeo copy \
    docker://nginx:latest \
    docker://registry.internal:5000/nginx:latest

# Copy with different credentials for source and destination
skopeo copy \
    --src-authfile /tmp/src-auth.json \
    --dest-authfile /tmp/dest-auth.json \
    docker://source-registry.com/app:1.0 \
    docker://dest-registry.com/app:1.0

# Copy with TLS verification disabled (for self-signed certs)
skopeo copy \
    --dest-tls-verify=false \
    docker://docker.io/nginx:latest \
    docker://internal-registry.example.com:5000/nginx:latest

# Mirror multiple tags in a loop
for tag in 1.24 1.25 latest; do
    skopeo copy \
        docker://nginx:$tag \
        docker://registry.internal:5000/nginx:$tag
done
```

## Copying to Local Storage Formats

```bash
# Copy to a local directory in OCI format
skopeo copy \
    docker://nginx:latest \
    oci:/tmp/nginx-oci

# Copy to a Docker archive (tar file)
skopeo copy \
    docker://nginx:latest \
    docker-archive:/tmp/nginx.tar:nginx:latest

# Load a docker-archive into Docker
docker load < /tmp/nginx.tar

# Load into Podman
podman load < /tmp/nginx.tar

# Copy to OCI archive
skopeo copy \
    docker://nginx:latest \
    oci-archive:/tmp/nginx-oci.tar

# Copy from local containers storage (Podman/Buildah)
skopeo copy \
    containers-storage:localhost/my-app:latest \
    docker://registry.example.com/my-app:latest
```

## Syncing Registries

The `sync` command mirrors all tags from one location to another:

```bash
# Sync an entire repository from Docker Hub to an internal registry
skopeo sync \
    --src docker \
    --dest docker \
    nginx \
    registry.internal:5000

# Sync using a YAML configuration file (for complex sync setups)
cat > /tmp/sync-config.yaml <<'EOF'
docker.io:
  images:
    nginx:
      - "1.24"
      - "1.25"
      - "latest"
    redis:
      - "7.0"
      - "7.2"
      - "latest"

quay.io:
  images:
    prometheus/prometheus:
      - "v2.47.0"
      - "latest"
EOF

skopeo sync \
    --src yaml \
    --dest docker \
    /tmp/sync-config.yaml \
    registry.internal:5000
```

## Checking Image Digests

Content-addressable digests (SHA256 hashes) are the definitive way to identify specific image versions:

```bash
# Get the digest of an image without pulling it
skopeo inspect --format '{{.Digest}}' docker://nginx:latest

# Or parse the full inspection output
skopeo inspect docker://nginx:latest | jq -r '.Digest'

# Compare digests between two registries to verify a copy
DIGEST_HUB=$(skopeo inspect docker://docker.io/nginx:latest | jq -r '.Digest')
DIGEST_INTERNAL=$(skopeo inspect docker://registry.internal:5000/nginx:latest | jq -r '.Digest')

if [ "$DIGEST_HUB" == "$DIGEST_INTERNAL" ]; then
    echo "Images match: $DIGEST_HUB"
else
    echo "Images differ!"
    echo "Hub: $DIGEST_HUB"
    echo "Internal: $DIGEST_INTERNAL"
fi

# Pin an image by digest for reproducible deployments
skopeo inspect docker://nginx@sha256:abc123... | jq .
```

## Deleting Remote Images

```bash
# Delete a tag from a registry
skopeo delete docker://registry.internal:5000/my-app:old-tag

# Delete with explicit credentials
skopeo delete \
    --authfile /tmp/registry-auth.json \
    docker://registry.example.com/old-image:deprecated

# Delete by digest (note: some registries don't support digest deletion via API)
skopeo delete docker://registry.internal:5000/my-app@sha256:abc123...
```

## Registry Automation with Skopeo

### Automated Image Promotion

A common CI/CD pattern is to promote images from a staging registry to production after tests pass:

```bash
#!/bin/bash
# promote-image.sh - copy a tested image from staging to production

set -e

IMAGE_NAME=$1
TAG=$2
STAGING_REGISTRY="staging-registry.internal:5000"
PROD_REGISTRY="prod-registry.example.com"

# Verify the image exists in staging
if ! skopeo inspect docker://$STAGING_REGISTRY/$IMAGE_NAME:$TAG > /dev/null 2>&1; then
    echo "Image not found in staging: $IMAGE_NAME:$TAG"
    exit 1
fi

# Get the digest for audit trail
DIGEST=$(skopeo inspect docker://$STAGING_REGISTRY/$IMAGE_NAME:$TAG | jq -r '.Digest')
echo "Promoting $IMAGE_NAME:$TAG (digest: $DIGEST)"

# Copy from staging to production
skopeo copy \
    --src-authfile /etc/containers/staging-auth.json \
    --dest-authfile /etc/containers/prod-auth.json \
    docker://$STAGING_REGISTRY/$IMAGE_NAME:$TAG \
    docker://$PROD_REGISTRY/$IMAGE_NAME:$TAG

echo "Successfully promoted $IMAGE_NAME:$TAG to production"
```

### Registry Health Check

```bash
#!/bin/bash
# Check if critical images are accessible

check_image() {
    local image=$1
    if skopeo inspect docker://$image > /dev/null 2>&1; then
        echo "OK: $image"
    else
        echo "FAIL: $image"
        return 1
    fi
}

check_image "registry.internal:5000/myapp:production"
check_image "registry.internal:5000/nginx:latest"
check_image "registry.internal:5000/postgres:15"
```

## Inspecting Multi-Architecture Manifests

```bash
# View the manifest list for a multi-arch image
skopeo inspect --raw docker://nginx:latest | jq .

# For a multi-arch image, you'll see a manifest list with entries for each arch
# Get the digest for a specific architecture
skopeo inspect --override-arch amd64 docker://nginx:latest | jq .Digest
skopeo inspect --override-arch arm64 docker://nginx:latest | jq .Digest

# Copy only the linux/amd64 variant
skopeo copy \
    --override-arch amd64 \
    --override-os linux \
    docker://nginx:latest \
    docker://registry.internal:5000/nginx:latest-amd64
```

## Policy Configuration

Skopeo uses policy files to enforce which images are trusted:

```bash
# View the default policy
cat /etc/containers/policy.json

# A permissive policy that accepts all images (good for testing)
# /etc/containers/policy.json:
{
    "default": [
        {
            "type": "insecureAcceptAnything"
        }
    ]
}

# Use a custom policy for a specific command
skopeo copy \
    --policy /path/to/custom-policy.json \
    docker://source/image:tag \
    docker://dest/image:tag
```

Skopeo is an essential tool in a container operations toolkit. Its ability to work with remote registries without requiring local storage or a running daemon makes it ideal for automation scripts, CI/CD systems, and registry management tasks that would otherwise require pulling multi-gigabyte images to disk unnecessarily.
