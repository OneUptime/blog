# How to Set Up ACR Import for Copying Images Between Registries Without Docker Pull and Push

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACR, Azure Container Registry, Docker, Image Import, Containers, Azure, DevOps

Description: Learn how to use ACR import to copy container images between registries server-side without pulling and pushing through your local machine.

---

The traditional way to copy a container image from one registry to another is to pull it locally and push it to the destination. For a small image, this works fine. For a 2 GB machine learning image, you are downloading gigabytes to your laptop only to upload them again. It wastes bandwidth, takes forever, and your CI/CD pipeline grinds to a halt while it shuffles bytes through a bottleneck that does not need to exist.

ACR import solves this by copying images server-side. The image goes directly from the source registry to the destination ACR without passing through your local machine. It works with Docker Hub, GitHub Container Registry, other ACR instances, and any OCI-compliant registry. It is faster, more reliable, and does not require Docker to be installed.

## The Basic Import Command

The simplest import copies an image from one source to your ACR.

```bash
# Import an image from Docker Hub into ACR
az acr import \
  --name myacr \
  --source docker.io/library/nginx:1.25 \
  --image nginx:1.25

# Import from GitHub Container Registry
az acr import \
  --name myacr \
  --source ghcr.io/myorg/myapp:v2.0 \
  --image myapp:v2.0

# Import from another ACR
az acr import \
  --name myacr \
  --source sourceacr.azurecr.io/myapp:latest \
  --image myapp:latest
```

The `--source` is the fully qualified image reference in the source registry. The `--image` is the repository and tag you want in your ACR. They do not have to match - you can rename images during import.

## Importing from Docker Hub

Docker Hub is the most common source for base images. ACR import handles both public and private Docker Hub repositories.

### Public Images

```bash
# Import a specific tag
az acr import \
  --name myacr \
  --source docker.io/library/python:3.12-slim \
  --image python:3.12-slim

# Import the latest tag
az acr import \
  --name myacr \
  --source docker.io/library/redis:latest \
  --image redis:latest

# Import a community image (non-library)
az acr import \
  --name myacr \
  --source docker.io/grafana/grafana:10.2.0 \
  --image grafana/grafana:10.2.0
```

### Private Docker Hub Images

For private repositories, provide Docker Hub credentials.

```bash
# Import from a private Docker Hub repository
az acr import \
  --name myacr \
  --source docker.io/mycompany/private-app:v1.0 \
  --image private-app:v1.0 \
  --username <docker-hub-username> \
  --password <docker-hub-access-token>
```

Use a Docker Hub access token rather than your password. Create one in Docker Hub under Account Settings, then Security, then Access Tokens.

## Importing Between ACR Instances

Copying images between ACR instances is a common operation for promoting images from a development registry to a production registry.

### Same Subscription

If both registries are in the same Azure subscription, the import is straightforward.

```bash
# Import from dev ACR to prod ACR
az acr import \
  --name prodacr \
  --source devacr.azurecr.io/myapp:v2.0 \
  --image myapp:v2.0
```

ACR uses the managed identity or your Azure AD credentials to authenticate with the source registry. No additional credentials needed.

### Different Subscriptions

For cross-subscription imports, you need to provide the source registry's resource ID or credentials.

```bash
# Option 1: Use the source registry's resource ID (requires Reader role on source)
SOURCE_REGISTRY_ID=$(az acr show \
  --name sourceacr \
  --subscription source-subscription-id \
  --query id -o tsv)

az acr import \
  --name destacr \
  --source sourceacr.azurecr.io/myapp:v2.0 \
  --image myapp:v2.0 \
  --registry "$SOURCE_REGISTRY_ID"

# Option 2: Use source registry credentials
az acr import \
  --name destacr \
  --source sourceacr.azurecr.io/myapp:v2.0 \
  --image myapp:v2.0 \
  --username <source-sp-client-id> \
  --password <source-sp-password>
```

## Importing Multiple Tags

You can import multiple tags in a single command or use scripting for bulk imports.

```bash
# Import multiple tags of the same image
for TAG in v1.0 v1.1 v2.0 v2.1 latest; do
  az acr import \
    --name myacr \
    --source docker.io/myorg/myapp:$TAG \
    --image myapp:$TAG \
    --no-wait
done

# The --no-wait flag runs imports in parallel
```

For a large number of images, use a manifest file.

```bash
#!/bin/bash
# bulk-import.sh
# Import a list of images from a manifest file

# images.txt format: source_image destination_image
# docker.io/library/nginx:1.25 nginx:1.25
# docker.io/library/redis:7 redis:7
# ghcr.io/myorg/tool:v1 tools/tool:v1

ACR_NAME="myacr"

while IFS=' ' read -r SOURCE DEST; do
  # Skip empty lines and comments
  [[ -z "$SOURCE" || "$SOURCE" == "#"* ]] && continue

  echo "Importing $SOURCE -> $DEST"
  az acr import \
    --name "$ACR_NAME" \
    --source "$SOURCE" \
    --image "$DEST" \
    --no-wait
done < images.txt

echo "All imports submitted. Check status with: az acr import --name $ACR_NAME --source ... --image ... (without --no-wait)"
```

## Importing by Digest

For reproducible builds, import by digest instead of tag. Digests are immutable - they always point to the exact same image content.

```bash
# Import by digest
az acr import \
  --name myacr \
  --source docker.io/library/nginx@sha256:abc123def456... \
  --image nginx:pinned-v1

# Find the digest of an image
az acr manifest show \
  --registry sourceacr \
  --name myapp:v2.0 \
  --query digest -o tsv
```

## Overwriting Existing Images

By default, ACR import fails if the destination tag already exists. Use the `--force` flag to overwrite.

```bash
# Overwrite an existing tag
az acr import \
  --name myacr \
  --source docker.io/library/nginx:latest \
  --image nginx:latest \
  --force
```

This is useful for tags like `latest` or `stable` that get updated regularly.

## Practical Use Cases

### Mirroring Base Images for Air-Gapped Environments

If your AKS cluster cannot pull from the public internet, import all needed images into your ACR.

```bash
#!/bin/bash
# mirror-base-images.sh
# Mirror essential base images into ACR for air-gapped clusters

ACR="myacr"

IMAGES=(
  "docker.io/library/nginx:1.25"
  "docker.io/library/redis:7"
  "docker.io/library/postgres:16"
  "docker.io/library/python:3.12-slim"
  "docker.io/library/node:20-slim"
  "mcr.microsoft.com/dotnet/aspnet:8.0"
  "mcr.microsoft.com/azure-cli:latest"
  "docker.io/grafana/grafana:10.2.0"
  "docker.io/prom/prometheus:v2.48.0"
)

for IMG in "${IMAGES[@]}"; do
  # Extract the repository and tag for the destination
  DEST=$(echo "$IMG" | sed 's|docker.io/library/||;s|docker.io/||;s|mcr.microsoft.com/||')

  echo "Importing $IMG -> $DEST"
  az acr import --name "$ACR" --source "$IMG" --image "$DEST" --force --no-wait
done
```

### CI/CD Pipeline Image Promotion

Import images from a development registry to staging and production registries as part of your deployment pipeline.

```yaml
# azure-pipelines.yml snippet
# Promote image from dev ACR to prod ACR after tests pass
steps:
  - task: AzureCLI@2
    displayName: 'Promote image to production'
    inputs:
      azureSubscription: 'production-subscription'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Import the tested image from dev to prod
        az acr import \
          --name prodacr \
          --source devacr.azurecr.io/myapp:$(Build.BuildId) \
          --image myapp:$(Build.BuildId) \
          --image myapp:latest \
          --force
```

### Avoiding Docker Hub Rate Limits

Docker Hub limits anonymous pulls to 100 per 6 hours and authenticated pulls to 200 per 6 hours. By importing images into ACR, your AKS nodes pull from ACR (with no rate limits) instead of Docker Hub.

```bash
# Import commonly used images to avoid rate limits
az acr import --name myacr --source docker.io/library/alpine:3.19 --image alpine:3.19 --force
az acr import --name myacr --source docker.io/library/ubuntu:22.04 --image ubuntu:22.04 --force
```

## Automating Regular Imports

Set up a scheduled Azure DevOps pipeline or GitHub Action to import updated images regularly.

```yaml
# .github/workflows/mirror-images.yml
name: Mirror Base Images
on:
  schedule:
    # Run every Monday at 6 AM UTC
    - cron: '0 6 * * 1'
  workflow_dispatch:

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Import base images
        run: |
          IMAGES=("nginx:1.25" "redis:7" "postgres:16" "python:3.12-slim")
          for IMG in "${IMAGES[@]}"; do
            echo "Importing $IMG..."
            az acr import \
              --name myacr \
              --source "docker.io/library/$IMG" \
              --image "$IMG" \
              --force
          done
```

## Troubleshooting Import Failures

### Authentication Errors

```bash
# If you get authentication errors with Docker Hub
# Verify your credentials work
docker login docker.io -u <username>

# For ACR-to-ACR imports, verify your Azure identity has access
az acr show --name sourceacr --query id -o tsv
# Then check your role assignment on that resource
```

### Network Timeouts

Large images may time out during import. There is no way to increase the timeout, but retrying usually works.

```bash
# Retry with --no-wait and check status later
az acr import \
  --name myacr \
  --source docker.io/large/image:tag \
  --image large-image:tag \
  --no-wait
```

### Image Not Found

```bash
# Verify the source image exists and is accessible
docker manifest inspect docker.io/library/nginx:1.25

# For ACR sources, check the repository
az acr repository show-tags --name sourceacr --repository myapp -o table
```

## Wrapping Up

ACR import is one of those features that seems minor but saves enormous amounts of time and bandwidth once you start using it regularly. Server-side copying eliminates the local machine as a bottleneck, works without Docker installed, and integrates cleanly into CI/CD pipelines. Use it for mirroring base images, promoting images between environments, and avoiding Docker Hub rate limits. The `--no-wait` flag makes bulk imports fast, and scheduled automation keeps your mirror up to date without manual intervention.
