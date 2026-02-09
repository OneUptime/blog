# How to Search for Docker Images on Docker Hub from the CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Hub, CLI, Images, Registry, DevOps, Docker Commands

Description: Learn how to search for Docker images on Docker Hub and other registries directly from the command line using docker search and the Hub API.

---

Docker Hub hosts millions of container images. When you need a base image, a development tool, or a pre-built service, searching Docker Hub from the command line is faster than switching to a browser. The `docker search` command gives you quick results, and the Docker Hub API provides detailed metadata when you need more information.

This guide covers every practical method for finding Docker images from the terminal.

## Basic Search with docker search

The `docker search` command queries Docker Hub and returns matching images.

Search for images by keyword:

```bash
# Search for nginx images
docker search nginx

# Sample output:
# NAME                       DESCRIPTION                                     STARS   OFFICIAL
# nginx                      Official build of Nginx.                        19000   [OK]
# nginxinc/nginx-unprivileged Unprivileged Nginx image                       150
# bitnami/nginx              Bitnami container image for Nginx               200
# linuxserver/nginx          An Nginx container from LinuxServer.io          180
```

The output shows the image name, a short description, star count, and whether it is an official image.

## Filtering Search Results

Docker search supports filters to narrow down results.

Filter by official images and star count:

```bash
# Show only official images
docker search --filter is-official=true nginx

# Show only images with at least 100 stars
docker search --filter stars=100 nginx

# Combine filters: official images with 50+ stars
docker search --filter is-official=true --filter stars=50 python

# Show only automated builds
docker search --filter is-automated=true redis
```

## Limiting Results

By default, docker search returns up to 25 results. You can adjust this limit.

Control the number of results:

```bash
# Show only the top 5 results
docker search --limit 5 postgres

# Show up to 100 results (maximum)
docker search --limit 100 node
```

## Custom Output Format

The `--format` flag customizes the output using Go templates.

Format search results for different needs:

```bash
# Show only the image name
docker search --format "{{.Name}}" nginx

# Show name and star count in a custom format
docker search --format "{{.Name}}\t{{.StarCount}} stars" nginx

# Table format with selected columns
docker search --format "table {{.Name}}\t{{.StarCount}}\t{{.IsOfficial}}" python

# JSON output for scripting
docker search --format json nginx
```

Available template fields for search results:

```
.Name          - Image name
.Description   - Image description
.StarCount     - Number of stars
.IsOfficial    - Whether it's an official image
.IsAutomated   - Whether it uses automated builds
```

## Finding Available Tags

The `docker search` command does not show available tags. To find which tags exist for an image, you need the Docker Hub API or other tools.

### Using the Docker Hub API

Query the Docker Hub registry API for tag information:

```bash
# List tags for an official image (library namespace)
curl -s "https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=20" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for tag in data['results']:
    print(f\"{tag['name']:30s} {tag['full_size']/(1024*1024):.1f} MB  {tag['last_updated'][:10]}\")
"

# List tags for a non-official image (has a namespace)
curl -s "https://hub.docker.com/v2/repositories/bitnami/nginx/tags?page_size=10" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
for tag in data['results']:
    print(tag['name'])
"
```

### Using a Shell Script

A reusable script to list tags:

```bash
#!/bin/bash
# list-tags.sh - List tags for a Docker Hub image

IMAGE=$1
PAGE_SIZE=${2:-25}

if [ -z "$IMAGE" ]; then
    echo "Usage: $0 <image> [page_size]"
    echo "Example: $0 nginx 10"
    exit 1
fi

# Handle official images (no namespace) vs user images
if [[ "$IMAGE" == *"/"* ]]; then
    REPO="$IMAGE"
else
    REPO="library/$IMAGE"
fi

# Fetch and display tags
curl -s "https://hub.docker.com/v2/repositories/${REPO}/tags?page_size=${PAGE_SIZE}&ordering=last_updated" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'results' not in data:
    print('Image not found or error occurred')
    sys.exit(1)
for tag in data['results']:
    size = tag.get('full_size', 0)
    size_mb = size / (1024*1024) if size else 0
    print(f\"{tag['name']:40s} {size_mb:8.1f} MB  Updated: {tag['last_updated'][:10]}\")
"
```

Use the script:

```bash
chmod +x list-tags.sh

# List nginx tags
./list-tags.sh nginx

# List specific user's image tags
./list-tags.sh bitnami/redis 10
```

### Using skopeo

Skopeo is a container image tool that can list tags without pulling images:

```bash
# Install skopeo
# macOS
brew install skopeo

# Ubuntu/Debian
apt-get install skopeo

# List all tags for an image
skopeo list-tags docker://docker.io/library/nginx

# List tags for a user image
skopeo list-tags docker://docker.io/bitnami/redis

# Get detailed info about a specific tag
skopeo inspect docker://docker.io/library/nginx:alpine
```

Skopeo works with any OCI-compatible registry, not just Docker Hub.

### Using regctl (regclient)

regctl is another powerful tool for registry operations:

```bash
# Install regctl
curl -L https://github.com/regclient/regclient/releases/latest/download/regctl-linux-amd64 \
    -o /usr/local/bin/regctl
chmod +x /usr/local/bin/regctl

# List tags
regctl tag ls nginx

# List tags with filtering
regctl tag ls nginx --include "alpine.*"

# Get image details
regctl image inspect nginx:alpine
```

## Searching Private Registries

Docker Hub is the default, but you might need to search private registries.

### Docker Hub with Authentication

Search private repositories on Docker Hub:

```bash
# Log in to Docker Hub first
docker login

# Search works for public images regardless of login
# Private repos appear in search results only when authenticated
docker search mycompany/
```

### Amazon ECR

Search for images in AWS ECR:

```bash
# List repositories in ECR
aws ecr describe-repositories --output table

# List image tags in a specific repository
aws ecr list-images --repository-name myapp --output table

# Describe image details
aws ecr describe-images --repository-name myapp --image-ids imageTag=latest
```

### Google Container Registry / Artifact Registry

Search for images in GCR:

```bash
# List images in a GCR project
gcloud container images list --project my-project

# List tags for a specific image
gcloud container images list-tags gcr.io/my-project/myapp

# List images in Artifact Registry
gcloud artifacts docker images list us-docker.pkg.dev/my-project/my-repo
```

### GitHub Container Registry

Search GHCR using the GitHub CLI:

```bash
# List packages in a GitHub organization
gh api /orgs/my-org/packages?package_type=container | jq '.[].name'

# List tags for a specific package
gh api /orgs/my-org/packages/container/myapp/versions | jq '.[].metadata.container.tags'
```

## Comparing Images Before Pulling

Before pulling an image, check its size and platform support.

Inspect an image without downloading it:

```bash
# Check image size and platforms using docker buildx
docker buildx imagetools inspect nginx:alpine

# Check with skopeo (more detailed)
skopeo inspect docker://nginx:alpine | python3 -m json.tool

# Compare sizes of different tags
for tag in alpine slim bookworm latest; do
    size=$(skopeo inspect docker://nginx:$tag 2>/dev/null | \
        python3 -c "import json,sys; print(json.load(sys.stdin).get('LayersData', [{}])[0].get('Size', 'N/A'))" 2>/dev/null)
    echo "nginx:$tag - $size bytes"
done
```

## Searching with Docker Scout

Docker Scout provides vulnerability and provenance information about images:

```bash
# Check an image for known vulnerabilities before pulling
docker scout cves nginx:alpine

# Quick overview of an image's security posture
docker scout quickview nginx:alpine

# Compare two images
docker scout compare nginx:alpine nginx:latest
```

## Building a Search Workflow

A practical workflow for finding the right image:

```bash
# Step 1: Search for the service you need
docker search --filter is-official=true postgres

# Step 2: Check available tags
curl -s "https://hub.docker.com/v2/repositories/library/postgres/tags?page_size=10&ordering=last_updated" | \
    python3 -c "import json,sys; [print(t['name']) for t in json.load(sys.stdin)['results']]"

# Step 3: Inspect the specific tag you want
docker buildx imagetools inspect postgres:16-alpine

# Step 4: Check for vulnerabilities
docker scout quickview postgres:16-alpine

# Step 5: Pull the image
docker pull postgres:16-alpine
```

## Tips for Choosing Images

When searching for images, keep these guidelines in mind.

Prefer official images when they exist. They are maintained by Docker in collaboration with the software vendor, receive regular security updates, and follow best practices.

Check the update frequency. An image last updated two years ago probably has unpatched vulnerabilities. Look at the `last_updated` field in tag listings.

Prefer slim or Alpine variants for smaller image sizes. The full Debian-based images include tools you rarely need in production.

Verify the image supports your target architecture. Multi-platform images list their supported architectures in the manifest.

Read the image documentation. Most well-maintained images document their environment variables, volumes, and configuration options on their Docker Hub page.

## Summary

Use `docker search` for quick lookups, the Docker Hub API for tag information, and tools like skopeo or regctl for detailed registry operations. Filter search results by official status and star count to find quality images. Always check the available tags, image size, and platform support before pulling. For private registries, use the vendor-specific CLI tools. A few minutes of research before pulling an image saves debugging time later.
