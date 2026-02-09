# How to List All Tags of a Docker Image on Docker Hub

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Hub, Images, Tags, Registry, DevOps

Description: Learn how to list all available tags for any Docker image on Docker Hub using the API, CLI tools, and scripts.

---

Docker Hub hosts millions of images, and each image can have hundreds or even thousands of tags. Knowing which tags exist helps you pick the right version, find the latest security patch, or verify that a specific tag is still available before updating your Dockerfile.

The Docker CLI does not include a built-in command to list remote tags. You need to use the Docker Hub API, third-party tools, or scripts to get this information. This guide covers all the practical approaches.

## Using the Docker Hub API v2

The Docker Registry HTTP API v2 provides endpoints for listing tags. For official images on Docker Hub, you need to handle authentication first.

```bash
# List tags for an official image (e.g., nginx)
# Step 1: Get an authentication token
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull" | jq -r .token)

# Step 2: Fetch the tags list
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry-1.docker.io/v2/library/nginx/tags/list" | jq '.tags[]'
```

For non-official images (user or organization namespaces), adjust the repository path.

```bash
# List tags for a non-official image (e.g., grafana/grafana)
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:grafana/grafana:pull" | jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry-1.docker.io/v2/grafana/grafana/tags/list" | jq '.tags[]'
```

## Handling Pagination

Docker Hub paginates results for images with many tags. The API returns a `Link` header pointing to the next page when more results are available.

```bash
#!/bin/bash
# list-all-tags.sh - Fetch all tags with pagination support
# Usage: ./list-all-tags.sh library/nginx

REPO=$1
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:${REPO}:pull" | jq -r .token)

URL="https://registry-1.docker.io/v2/${REPO}/tags/list?n=100"

while [ -n "$URL" ]; do
    # Fetch the current page and extract tags
    RESPONSE=$(curl -s -D /tmp/headers -H "Authorization: Bearer $TOKEN" "$URL")
    echo "$RESPONSE" | jq -r '.tags[]' 2>/dev/null

    # Check for a Link header indicating more pages
    NEXT=$(grep -i "^link:" /tmp/headers | sed 's/.*<\(.*\)>.*/\1/' | tr -d '\r')

    if [ -n "$NEXT" ]; then
        URL="https://registry-1.docker.io${NEXT}"
    else
        URL=""
    fi
done
```

Run the script:

```bash
# List all tags for the official Python image
chmod +x list-all-tags.sh
./list-all-tags.sh library/python
```

## Using the Docker Hub REST API (v2 Hub API)

Docker Hub also has its own REST API that returns richer metadata including tag update dates and image sizes.

```bash
# Fetch tags with metadata from the Docker Hub API
# This endpoint returns creation dates, sizes, and more
curl -s "https://hub.docker.com/v2/repositories/library/nginx/tags?page_size=100" | jq '.results[] | {name: .name, last_updated: .last_updated, full_size: .full_size}'
```

This returns useful details per tag:

```json
{
  "name": "latest",
  "last_updated": "2026-01-15T10:30:00.000000Z",
  "full_size": 67891234
}
{
  "name": "1.25.3",
  "last_updated": "2026-01-15T10:30:00.000000Z",
  "full_size": 67891234
}
```

To paginate through all results:

```bash
#!/bin/bash
# list-tags-hub-api.sh - List tags using Docker Hub API with pagination
# Usage: ./list-tags-hub-api.sh library/nginx

REPO=$1
URL="https://hub.docker.com/v2/repositories/${REPO}/tags?page_size=100"

while [ "$URL" != "null" ] && [ -n "$URL" ]; do
    RESPONSE=$(curl -s "$URL")
    echo "$RESPONSE" | jq -r '.results[].name'
    URL=$(echo "$RESPONSE" | jq -r '.next')
done
```

## Using skopeo

Skopeo provides a clean way to list tags without writing API calls yourself.

```bash
# Install skopeo on Ubuntu/Debian
sudo apt-get install skopeo

# List all tags for an image
skopeo list-tags docker://docker.io/library/nginx | jq '.Tags[]'
```

Skopeo handles authentication and pagination automatically, making it the simplest command-line approach.

```bash
# List tags for a private registry image
skopeo list-tags --creds username:password docker://myregistry.example.com/myapp
```

## Using regctl (regclient)

The `regctl` tool from the regclient project is purpose-built for registry interactions.

```bash
# Install regctl
curl -L https://github.com/regclient/regclient/releases/latest/download/regctl-linux-amd64 > regctl
chmod +x regctl
sudo mv regctl /usr/local/bin/

# List tags for an image
regctl tag ls nginx
```

regctl also supports filtering and formatting:

```bash
# List tags and sort them
regctl tag ls nginx | sort -V

# List tags matching a pattern (using grep)
regctl tag ls python | grep "^3.12"
```

## Filtering Tags by Pattern

Docker images often have many tags, and you usually want a subset. Here are some practical filtering examples.

```bash
# Find all Alpine-based tags for Node.js
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" | jq -r .token)

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry-1.docker.io/v2/library/node/tags/list" | jq -r '.tags[]' | grep "alpine" | sort -V
```

```bash
# Find all tags for a specific major version
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://registry-1.docker.io/v2/library/node/tags/list" | jq -r '.tags[]' | grep "^20\." | sort -V
```

## Creating a Reusable Shell Function

Add this function to your `.bashrc` or `.zshrc` for quick tag lookups.

```bash
# Add to ~/.bashrc or ~/.zshrc
# Usage: docker-tags nginx or docker-tags grafana/grafana
docker-tags() {
    local image=$1

    # Add library/ prefix for official images
    if [[ "$image" != *"/"* ]]; then
        image="library/$image"
    fi

    local token=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image}:pull" | jq -r .token)

    curl -s -H "Authorization: Bearer $TOKEN" \
      "https://registry-1.docker.io/v2/${image}/tags/list" | jq -r '.tags[]' | sort -V
}
```

After sourcing your shell config, use it like this:

```bash
# Quick tag lookup
docker-tags nginx
docker-tags python | grep "3.12"
docker-tags grafana/grafana | tail -20
```

## Listing Tags from Private Registries

For private registries like Amazon ECR, Google Container Registry, or Azure Container Registry, the approach differs slightly.

```bash
# AWS ECR - List tags for an image
aws ecr describe-images --repository-name myapp \
  --query 'imageDetails[*].imageTags' --output text

# Google Container Registry - List tags
gcloud container images list-tags gcr.io/my-project/myapp

# Azure Container Registry - List tags
az acr repository show-tags --name myregistry --repository myapp
```

## Sorting and Analyzing Tags

Once you have the tag list, you might want to find the latest version or analyze naming patterns.

```bash
# Find the latest semantic version tag (excluding latest, alpine, slim, etc.)
docker-tags nginx | grep -E "^[0-9]+\.[0-9]+\.[0-9]+$" | sort -V | tail -1
```

```bash
# Count tags by major version prefix
docker-tags python | grep -E "^[0-9]+\." | cut -d. -f1 | sort | uniq -c | sort -rn
```

## Checking if a Specific Tag Exists

Sometimes you just need to verify that a specific tag is available before using it in a Dockerfile.

```bash
# Check if a specific tag exists (returns HTTP 200 if yes)
TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/node:pull" | jq -r .token)

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  "https://registry-1.docker.io/v2/library/node/manifests/20.11.0-alpine3.19")

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "Tag exists"
else
    echo "Tag not found"
fi
```

## Conclusion

Listing tags on Docker Hub requires using the registry API since Docker CLI lacks a built-in command for it. For quick one-off checks, the curl-based API approach works well. For regular use, tools like skopeo or regctl streamline the process. Add a shell function to your dotfiles for instant access to tag information during development.

Understanding what tags are available keeps your Dockerfiles precise and your deployments predictable.
