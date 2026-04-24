# How to Fix 'Image Not Found' Errors When Deploying in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Image, Registry

Description: Resolve 'Image Not Found' errors in Portainer deployments caused by incorrect image names, missing registry credentials, network issues, or private registry configuration problems.

## Introduction

"Image Not Found" errors in Portainer occur when Docker cannot pull the image needed for a container or stack. The error can come from the public Docker Hub, a private registry, or a local image reference. This guide covers all the common scenarios.

## Common Error Messages

- `"manifest unknown: manifest unknown"`
- `"repository does not exist or may require 'docker login'"`
- `"Error response from daemon: pull access denied"`
- `"Error: No such image: imagename:tag"`
- `"unauthorized: access to the requested resource is not authorized"`

## Step 1: Verify the Image Name and Tag

```bash
# Pull the image directly from CLI to test

docker pull nginx:latest
docker pull myregistry.com/myimage:v1.0

# Common mistakes:
# nginx:Latest (capital L - tags are case-sensitive)
# myimage:latest vs myimage (no tag defaults to latest, but should be explicit)
# myregistry.com/myimage vs myregistry.com:5000/myimage (port is part of the name)
```

## Step 2: Check if Image Exists Locally

```bash
# List local images
docker images | grep imagename

# If the image exists locally but Portainer can't find it:
# Check if Portainer is on the same Docker host
# Pull a fresh copy
docker pull imagename:tag
```

## Step 3: Test Registry Credentials

```bash
# Test login to a private registry
docker login myregistry.com
# Enter username and password when prompted

# Or non-interactively
echo "$REGISTRY_PASSWORD" | docker login myregistry.com -u username --password-stdin

# Test pulling from the registry
docker pull myregistry.com/myimage:v1.0

# If pull works from CLI, the issue is in Portainer's registry configuration
```

## Step 4: Add Registry Credentials in Portainer

1. Go to **Registries** → **Add Registry**
2. Select **Custom Registry** (or Docker Hub if using private Docker Hub images)
3. Enter:
   - **Registry URL**: `https://myregistry.com` (or omit the scheme and Portainer will assume `https://`)
   - **Username** and **Password**
4. Click **Add Registry**

When creating containers or stacks, select this registry from the dropdown.

## Step 5: Fix Docker Hub Rate Limiting

Docker Hub rate limits unauthenticated pulls:

```bash
# Even for public images, authenticate to avoid rate limits
docker login
# Follow the web-based login flow
# Or use: docker login -u your-dockerhub-username

# In Portainer, add Docker Hub as a registry:
# Registries → Add Registry → DockerHub
# Enter your Docker Hub username and access token
```

## Step 6: Fix Private Image Access in Stacks

When your compose file references private images:

```yaml
services:
  myapp:
    # Private image - requires registry credentials in Portainer
    image: myregistry.com/myapp:v1.0
    # No need to specify credentials here - configure in Portainer's Registries
```

In Portainer, when deploying the stack:
1. Portainer will use configured registries during stack deployment
2. If you have multiple registries from the same provider, explicitly select the correct registry so Docker uses the right credentials

## Step 7: Fix Authentication for ECR (Amazon ECR)

AWS ECR tokens expire every 12 hours:

```bash
# Get a fresh ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# In Portainer, prefer adding AWS ECR as the registry provider:
# 1. Go to Registries → Add Registry → AWS ECR
# 2. Enter the registry URL
# 3. Enable Authentication
# 4. Enter the AWS Access Key, AWS Secret Access Key, and Region
# 5. Save
```

## Step 8: Fix Authentication for GitHub Container Registry (GHCR)

```bash
# Create a GitHub Personal Access Token (classic) with read:packages scope
# Then login:
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# In Portainer:
# Registry URL: https://ghcr.io
# Username: your-github-username
# Password: your-github-personal-access-token
```

## Step 9: Fix Image Reference Format Issues

```text
# Different registries use different URL formats:

# Docker Hub (public)
image: nginx:latest
image: username/myimage:v1.0

# Docker Hub (private, explicit registry)
image: docker.io/username/myimage:v1.0

# Custom registry without port
image: myregistry.com/myimage:v1.0

# Custom registry with port
image: myregistry.com:5000/myimage:v1.0

# GitHub Container Registry
image: ghcr.io/username/myimage:v1.0

# AWS ECR
image: 123456789.dkr.ecr.us-east-1.amazonaws.com/myimage:v1.0

# Google Artifact Registry
image: us-central1-docker.pkg.dev/project-id/repo/myimage:v1.0
```

## Step 10: Fix Air-Gapped or Offline Environments

If your Portainer host has no internet access:

```bash
# Pre-load the image on the Docker host
# First, save the image on an internet-connected machine:
docker pull nginx:latest
docker save nginx:latest | gzip > nginx-latest.tar.gz

# Transfer to the offline host
scp nginx-latest.tar.gz offline-host:/tmp/

# On the offline host, load the image:
docker load < /tmp/nginx-latest.tar.gz

# Verify
docker images | grep nginx

# In Portainer, the image is now available locally
# When creating a container, it won't try to pull
# (set "Always pull the image" to false in container settings)
```

## Conclusion

"Image Not Found" errors in Portainer are almost always caused by one of three things: an incorrect image name or tag, missing registry credentials for private images, or Docker Hub rate limiting for public images. Test image pulls from the Docker CLI first to isolate the problem, then configure the appropriate registry credentials in Portainer's Registries section to resolve authentication issues.
