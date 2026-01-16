# How to Tag and Push Docker Images to Multiple Registries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Container Registry, CI/CD, DevOps, Multi-Registry

Description: Learn how to tag Docker images properly, push to multiple container registries simultaneously, and set up efficient CI/CD workflows for multi-registry deployments.

---

Pushing images to multiple registries is common for disaster recovery, multi-cloud deployments, and providing faster pulls in different regions. Understanding tagging conventions and efficient push strategies helps maintain consistent deployments across registries.

## Image Tagging Basics

### Tag Syntax

```
[registry/][repository/]image[:tag]

registry.example.com/mycompany/myapp:v1.0.0
└────────┬─────────┘ └───┬────┘ └─┬─┘ └──┬──┘
      registry      namespace  image   tag
```

### Default Registry

```bash
# These are equivalent (Docker Hub is default)
docker pull nginx
docker pull docker.io/library/nginx
docker pull docker.io/library/nginx:latest
```

## Tagging Strategies

### Semantic Versioning

```bash
# Build and tag with semantic versioning
docker build -t myapp:1.0.0 .

# Also tag with minor and major versions for convenience
docker tag myapp:1.0.0 myapp:1.0
docker tag myapp:1.0.0 myapp:1
docker tag myapp:1.0.0 myapp:latest
```

### Git-Based Tags

```bash
# Tag with git commit SHA
GIT_SHA=$(git rev-parse --short HEAD)
docker build -t myapp:$GIT_SHA .

# Tag with branch name
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
docker build -t myapp:$GIT_BRANCH .

# Combined approach
docker build -t myapp:${GIT_BRANCH}-${GIT_SHA} .
```

### Date-Based Tags

```bash
# Tag with date
DATE=$(date +%Y%m%d)
docker build -t myapp:$DATE .

# Tag with date and time
DATETIME=$(date +%Y%m%d-%H%M%S)
docker build -t myapp:$DATETIME .
```

## Common Container Registries

| Registry | URL Format |
|----------|------------|
| Docker Hub | `docker.io/username/image` |
| GitHub Container Registry | `ghcr.io/owner/image` |
| AWS ECR | `123456789.dkr.ecr.region.amazonaws.com/image` |
| Google GCR | `gcr.io/project/image` |
| Google Artifact Registry | `region-docker.pkg.dev/project/repo/image` |
| Azure ACR | `registry.azurecr.io/image` |
| GitLab Registry | `registry.gitlab.com/group/project` |

## Push to Multiple Registries

### Manual Approach

```bash
# Build the image
docker build -t myapp:v1.0.0 .

# Tag for each registry
docker tag myapp:v1.0.0 docker.io/mycompany/myapp:v1.0.0
docker tag myapp:v1.0.0 ghcr.io/mycompany/myapp:v1.0.0
docker tag myapp:v1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0

# Push to each registry
docker push docker.io/mycompany/myapp:v1.0.0
docker push ghcr.io/mycompany/myapp:v1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
```

### Script for Multiple Registries

```bash
#!/bin/bash
# push-multi-registry.sh

IMAGE_NAME="myapp"
VERSION="${1:-latest}"

REGISTRIES=(
  "docker.io/mycompany"
  "ghcr.io/mycompany"
  "123456789.dkr.ecr.us-east-1.amazonaws.com"
)

# Build the image
echo "Building $IMAGE_NAME:$VERSION..."
docker build -t "$IMAGE_NAME:$VERSION" .

# Tag and push to each registry
for registry in "${REGISTRIES[@]}"; do
  full_tag="$registry/$IMAGE_NAME:$VERSION"
  echo "Tagging and pushing $full_tag..."
  docker tag "$IMAGE_NAME:$VERSION" "$full_tag"
  docker push "$full_tag"
done

echo "Done! Pushed to ${#REGISTRIES[@]} registries."
```

### Parallel Push Script

```bash
#!/bin/bash
# push-parallel.sh

IMAGE_NAME="myapp"
VERSION="${1:-latest}"

REGISTRIES=(
  "docker.io/mycompany"
  "ghcr.io/mycompany"
  "123456789.dkr.ecr.us-east-1.amazonaws.com"
)

# Build once
docker build -t "$IMAGE_NAME:$VERSION" .

# Tag all
for registry in "${REGISTRIES[@]}"; do
  docker tag "$IMAGE_NAME:$VERSION" "$registry/$IMAGE_NAME:$VERSION"
done

# Push in parallel
for registry in "${REGISTRIES[@]}"; do
  docker push "$registry/$IMAGE_NAME:$VERSION" &
done

# Wait for all pushes to complete
wait
echo "All pushes complete!"
```

## Docker Buildx for Multi-Registry Push

Buildx can build and push to multiple registries in a single command.

```bash
# Build and push to multiple registries
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t docker.io/mycompany/myapp:v1.0.0 \
  -t ghcr.io/mycompany/myapp:v1.0.0 \
  -t 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0 \
  --push .
```

### Buildx Bake for Complex Scenarios

```hcl
# docker-bake.hcl
variable "VERSION" {
  default = "latest"
}

variable "REGISTRIES" {
  default = [
    "docker.io/mycompany",
    "ghcr.io/mycompany",
  ]
}

target "default" {
  platforms = ["linux/amd64", "linux/arm64"]
  tags = [for registry in REGISTRIES : "${registry}/myapp:${VERSION}"]
}
```

Build and push:
```bash
VERSION=v1.0.0 docker buildx bake --push
```

## Registry Authentication

### Docker Hub

```bash
docker login docker.io -u username -p password
# Or interactively
docker login
```

### GitHub Container Registry

```bash
# Using personal access token
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### AWS ECR

```bash
# Get login password and pipe to docker login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

### Google Container Registry

```bash
# Using gcloud
gcloud auth configure-docker

# For Artifact Registry
gcloud auth configure-docker us-docker.pkg.dev
```

### Azure Container Registry

```bash
# Using Azure CLI
az acr login --name myregistry

# Using service principal
docker login myregistry.azurecr.io -u $SP_APP_ID -p $SP_PASSWORD
```

## CI/CD Examples

### GitHub Actions

```yaml
name: Build and Push

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Login to AWS ECR
        uses: docker/login-action@v3
        with:
          registry: 123456789.dkr.ecr.us-east-1.amazonaws.com
          username: ${{ secrets.AWS_ACCESS_KEY_ID }}
          password: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            docker.io/mycompany/myapp:${{ steps.version.outputs.VERSION }}
            docker.io/mycompany/myapp:latest
            ghcr.io/mycompany/myapp:${{ steps.version.outputs.VERSION }}
            ghcr.io/mycompany/myapp:latest
            123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:${{ steps.version.outputs.VERSION }}
            123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build

variables:
  IMAGE_NAME: myapp

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    # Login to all registries
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker login -u $DOCKERHUB_USER -p $DOCKERHUB_TOKEN docker.io
    - echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USER --password-stdin
  script:
    - docker buildx create --use
    - |
      docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG \
        -t docker.io/$DOCKERHUB_USER/$IMAGE_NAME:$CI_COMMIT_TAG \
        -t ghcr.io/$GHCR_USER/$IMAGE_NAME:$CI_COMMIT_TAG \
        --push .
  only:
    - tags
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    environment {
        VERSION = "${env.TAG_NAME ?: 'latest'}"
        DOCKERHUB_CREDS = credentials('dockerhub')
        GHCR_CREDS = credentials('ghcr')
    }

    stages {
        stage('Login') {
            steps {
                sh '''
                    echo $DOCKERHUB_CREDS_PSW | docker login docker.io -u $DOCKERHUB_CREDS_USR --password-stdin
                    echo $GHCR_CREDS_PSW | docker login ghcr.io -u $GHCR_CREDS_USR --password-stdin
                '''
            }
        }

        stage('Build and Push') {
            steps {
                sh '''
                    docker buildx build \
                        -t docker.io/mycompany/myapp:${VERSION} \
                        -t ghcr.io/mycompany/myapp:${VERSION} \
                        --push .
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout docker.io || true'
            sh 'docker logout ghcr.io || true'
        }
    }
}
```

## Mirror Images Between Registries

### Using crane (from go-containerregistry)

```bash
# Install crane
go install github.com/google/go-containerregistry/cmd/crane@latest

# Copy image between registries
crane copy docker.io/mycompany/myapp:v1.0.0 \
           ghcr.io/mycompany/myapp:v1.0.0
```

### Using skopeo

```bash
# Install skopeo (available in most package managers)
apt install skopeo

# Copy between registries
skopeo copy \
    docker://docker.io/mycompany/myapp:v1.0.0 \
    docker://ghcr.io/mycompany/myapp:v1.0.0
```

### Sync Script

```bash
#!/bin/bash
# sync-registries.sh

SOURCE_REGISTRY="docker.io/mycompany"
DEST_REGISTRIES=(
  "ghcr.io/mycompany"
  "123456789.dkr.ecr.us-east-1.amazonaws.com"
)

IMAGES=(
  "myapp:v1.0.0"
  "myapp:v1.0.1"
  "myapp:latest"
)

for image in "${IMAGES[@]}"; do
  for dest in "${DEST_REGISTRIES[@]}"; do
    echo "Syncing $image to $dest..."
    skopeo copy \
      "docker://$SOURCE_REGISTRY/$image" \
      "docker://$dest/$image"
  done
done
```

## Best Practices

### 1. Use Immutable Tags

```bash
# Good: Specific version
docker push myapp:v1.0.0
docker push myapp:v1.0.1

# Avoid relying on mutable tags for production
docker push myapp:latest  # OK for development
```

### 2. Include Metadata

```dockerfile
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2024-01-15T10:00:00Z"
LABEL org.opencontainers.image.revision="abc123"
```

### 3. Sign Images

```bash
# Sign with cosign
cosign sign docker.io/mycompany/myapp:v1.0.0

# Sign with Docker Content Trust
export DOCKER_CONTENT_TRUST=1
docker push docker.io/mycompany/myapp:v1.0.0
```

### 4. Clean Up Old Tags

```bash
# List tags
crane ls ghcr.io/mycompany/myapp

# Delete old tags
crane delete ghcr.io/mycompany/myapp:old-tag
```

## Summary

| Task | Command |
|------|---------|
| Tag image | `docker tag source target` |
| Push single | `docker push registry/image:tag` |
| Build multi-registry | `docker buildx build -t reg1/img -t reg2/img --push` |
| Copy between registries | `crane copy source dest` |
| Login to registry | `docker login registry` |

Pushing to multiple registries ensures availability and provides flexibility for multi-cloud deployments. Use buildx for efficient multi-registry pushes, implement proper tagging strategies, and automate the process in your CI/CD pipeline for consistent, reliable deployments.

