# How to Set Up Docker Image Garbage Collection in CI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, CI/CD, Garbage Collection, Container Registry, DevOps, Docker Cleanup

Description: Set up automated Docker image garbage collection in CI environments to reclaim disk space and reduce registry costs.

---

CI environments generate Docker images at an alarming rate. Every pull request, every commit, every nightly build leaves behind layers, dangling images, and unused tags. Without cleanup, your CI runners fill up their disks. Your container registries bloat with thousands of stale images nobody will ever pull again. Registry storage costs climb month after month.

Docker image garbage collection solves this. You set up automated cleanup policies that remove images you no longer need while keeping the ones you do. This guide covers cleanup on CI runners, in self-hosted registries, and across major cloud registry providers.

## Cleaning Up CI Runner Disk Space

CI runners accumulate Docker artifacts between jobs. Start with a basic cleanup step that runs after each pipeline.

```bash
# Remove all stopped containers
docker container prune -f

# Remove all unused images (not referenced by any container)
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove all unused networks
docker network prune -f

# Nuclear option: remove everything unused
docker system prune -a -f --volumes
```

For a more targeted approach, remove images older than a specific time period.

```bash
# Remove images created more than 24 hours ago that have no container references
docker image prune -a -f --filter "until=24h"

# Remove images with specific label patterns (e.g., CI build images)
docker image prune -a -f --filter "label=ci-build=true"
```

## Adding Cleanup to GitHub Actions

Add a cleanup step to your GitHub Actions workflow so runners stay lean.

```yaml
# .github/workflows/build.yml - Build pipeline with cleanup
name: Build and Clean

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Pre-build cleanup (reclaim space before building)
        run: |
          # Show current disk usage
          df -h /
          docker system df
          # Remove images older than 7 days
          docker image prune -a -f --filter "until=168h"

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run tests
        run: docker run --rm myapp:${{ github.sha }} npm test

      - name: Push to registry
        run: |
          docker tag myapp:${{ github.sha }} registry.example.com/myapp:${{ github.sha }}
          docker push registry.example.com/myapp:${{ github.sha }}

      - name: Post-build cleanup
        if: always()
        run: |
          # Remove the local build image since it has been pushed
          docker rmi myapp:${{ github.sha }} || true
          docker rmi registry.example.com/myapp:${{ github.sha }} || true
          # Clean up dangling images from multi-stage builds
          docker image prune -f
```

## Scheduled Cleanup Job

Run a dedicated cleanup job on a schedule to handle accumulated garbage.

```yaml
# .github/workflows/cleanup.yml - Scheduled Docker cleanup
name: Docker Cleanup

on:
  schedule:
    # Run every day at 3 AM UTC
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  cleanup-runners:
    runs-on: self-hosted
    strategy:
      matrix:
        # Run on all self-hosted runner groups
        runner: [runner-1, runner-2, runner-3]
    steps:
      - name: Report disk usage before cleanup
        run: |
          echo "=== Disk Usage Before ==="
          df -h /
          echo "=== Docker Disk Usage ==="
          docker system df -v

      - name: Remove old containers
        run: |
          # Remove containers that exited more than 1 hour ago
          docker container prune -f --filter "until=1h"

      - name: Remove old images
        run: |
          # Keep images used in the last 48 hours, remove everything else
          docker image prune -a -f --filter "until=48h"

      - name: Remove unused volumes and networks
        run: |
          docker volume prune -f
          docker network prune -f

      - name: Report disk usage after cleanup
        run: |
          echo "=== Disk Usage After ==="
          df -h /
          docker system df
```

## Registry Garbage Collection for Self-Hosted Registries

If you run a self-hosted Docker Registry (the open-source distribution), garbage collection requires a two-step process: marking and sweeping.

```yaml
# registry-config.yml - Registry configuration with deletion enabled
version: 0.1
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
  maintenance:
    uploadpurging:
      enabled: true
      age: 168h
      interval: 24h
      dryrun: false
```

Run garbage collection against the registry.

```bash
# First, delete tags you no longer need via the API
# Delete a specific tag from the registry
TAG_DIGEST=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  -I "https://registry.example.com/v2/myapp/manifests/old-tag" \
  | grep -i Docker-Content-Digest | awk '{print $2}' | tr -d '\r')

curl -X DELETE "https://registry.example.com/v2/myapp/manifests/${TAG_DIGEST}"

# Then run garbage collection to reclaim storage
# Dry run first to see what would be collected
docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml --dry-run

# Execute the actual garbage collection
docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml
```

## Automated Tag Cleanup Script

Write a script that removes old tags from your registry based on age or count.

```bash
#!/bin/bash
# cleanup-registry.sh - Remove old image tags from a Docker registry

set -euo pipefail

REGISTRY="https://registry.example.com"
REPO="myapp"
KEEP_LAST=10  # Keep the most recent 10 tags

echo "Fetching tags for ${REPO}..."
# Get all tags sorted by creation date
TAGS=$(curl -s "${REGISTRY}/v2/${REPO}/tags/list" | jq -r '.tags[]' | sort -V)
TAG_COUNT=$(echo "${TAGS}" | wc -l)

if [ "${TAG_COUNT}" -le "${KEEP_LAST}" ]; then
    echo "Only ${TAG_COUNT} tags found. Nothing to clean up."
    exit 0
fi

# Calculate how many tags to remove
REMOVE_COUNT=$((TAG_COUNT - KEEP_LAST))
TAGS_TO_REMOVE=$(echo "${TAGS}" | head -n "${REMOVE_COUNT}")

echo "Removing ${REMOVE_COUNT} old tags..."
for TAG in ${TAGS_TO_REMOVE}; do
    echo "  Deleting ${REPO}:${TAG}"
    # Get the digest for this tag
    DIGEST=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
      -I "${REGISTRY}/v2/${REPO}/manifests/${TAG}" \
      | grep -i Docker-Content-Digest | awk '{print $2}' | tr -d '\r')

    # Delete the manifest by digest
    curl -s -X DELETE "${REGISTRY}/v2/${REPO}/manifests/${DIGEST}"
done

echo "Tag cleanup complete. Run registry garbage-collect to reclaim storage."
```

## Cloud Registry Cleanup Policies

Major cloud providers offer built-in lifecycle policies for their registries.

### AWS ECR Lifecycle Policy

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 20 production images",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["prod-"],
        "countType": "imageCountMoreThan",
        "countNumber": 20
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 2,
      "description": "Remove untagged images older than 7 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 7
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "rulePriority": 3,
      "description": "Remove dev images older than 14 days",
      "selection": {
        "tagStatus": "tagged",
        "tagPrefixList": ["dev-", "pr-"],
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 14
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

```bash
# Apply the lifecycle policy to your ECR repository
aws ecr put-lifecycle-policy \
  --repository-name myapp \
  --lifecycle-policy-text file://ecr-lifecycle-policy.json
```

### Google Artifact Registry Cleanup

```bash
# Delete images older than 30 days using gcloud
gcloud artifacts docker images list us-docker.pkg.dev/myproject/myrepo/myapp \
  --filter="UPDATE_TIME < $(date -d '30 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  --format="value(DIGEST)" | while read DIGEST; do
    gcloud artifacts docker images delete \
      us-docker.pkg.dev/myproject/myrepo/myapp@${DIGEST} --quiet
done
```

### Azure Container Registry Purge

```bash
# Purge images older than 30 days, keep at least 5 tagged images
az acr run --cmd "acr purge \
  --filter 'myapp:.*' \
  --ago 30d \
  --keep 5 \
  --untagged" \
  --registry myregistry /dev/null
```

## Monitoring Disk Usage

Set up alerts so you know when garbage collection is not keeping up.

```bash
#!/bin/bash
# monitor-docker-disk.sh - Alert when Docker disk usage exceeds threshold

THRESHOLD_PERCENT=80
DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}')

# Get disk usage percentage for the Docker partition
USAGE=$(df "${DOCKER_ROOT}" | tail -1 | awk '{print $5}' | tr -d '%')

if [ "${USAGE}" -ge "${THRESHOLD_PERCENT}" ]; then
    echo "WARNING: Docker disk usage at ${USAGE}% (threshold: ${THRESHOLD_PERCENT}%)"
    echo "Docker system disk breakdown:"
    docker system df -v
    # Trigger cleanup
    docker system prune -a -f --filter "until=24h"
    exit 1
fi

echo "Docker disk usage OK: ${USAGE}%"
```

Setting up garbage collection is not glamorous work, but it prevents build failures from full disks and saves real money on registry storage. Start with cleanup steps in your CI pipelines, add lifecycle policies to your cloud registries, and schedule regular sweeps of your self-hosted infrastructure. Your future self will thank you when the next midnight build does not fail because a runner ran out of disk space.
