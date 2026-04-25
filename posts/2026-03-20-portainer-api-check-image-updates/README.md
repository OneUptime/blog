# How to Check Image Updates via the Portainer API - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker, Image, Monitoring

Description: Learn how to use the Portainer API to check for container image updates, identify outdated containers, and automate image freshness monitoring across your environments.

## Introduction

Keeping container images up to date is important for security patches and bug fixes. Portainer provides API endpoints to check whether running containers are using the latest version of their images, enabling you to build automated update notification systems or integrate image freshness checks into your operations workflows.

## Prerequisites

- Portainer BE with a Docker environment
- Running containers with image update checking enabled
- Valid JWT token or API access token

## Step 1: Check Images for Updates via the API

Portainer can query registries to compare the current running image digest with the latest available. If you use an API access token, send it as `X-API-Key`; if you authenticated via `/api/auth`, use `Authorization: Bearer` with the JWT:

```bash
PORTAINER_URL="https://portainer.example.com"
TOKEN="your-access-token"
AUTH_HEADER="X-API-Key: $TOKEN"
# If you authenticated via /api/auth and received a JWT instead, use:
# AUTH_HEADER="Authorization: Bearer $TOKEN"
ENDPOINT_ID=1

# Get a container ID first

CONTAINER_ID="abc123def456"

# Check if a specific container's image has an update available
curl -s \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/docker/${ENDPOINT_ID}/containers/${CONTAINER_ID}/image_status" | jq .

# Response example:
# {
#   "Status": "updated"   # or outdated, preparing, processing, skipped, error
# }
```

## Step 2: List Containers with Outdated Images

```bash
#!/bin/bash
# check-image-updates.sh

PORTAINER_URL="https://portainer.example.com"
TOKEN="your-access-token"
AUTH_HEADER="X-API-Key: $TOKEN"
# If you authenticated via /api/auth and received a JWT instead, use:
# AUTH_HEADER="Authorization: Bearer $TOKEN"
ENDPOINT_ID=1

echo "=== Image Update Status Report ==="
echo ""

# Get all running containers
CONTAINERS=$(curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json")

OUTDATED_COUNT=0
TOTAL_COUNT=$(echo "$CONTAINERS" | jq 'length')

echo "Checking $TOTAL_COUNT running containers..."
echo ""

while IFS= read -r CONTAINER; do
  CONTAINER_ID=$(echo "$CONTAINER" | jq -r '.Id')
  CONTAINER_NAME=$(echo "$CONTAINER" | jq -r '.Names[0]' | sed 's/^\///')
  IMAGE=$(echo "$CONTAINER" | jq -r '.Image')

  # Check image status
  STATUS=$(curl -s \
    -H "$AUTH_HEADER" \
    "${PORTAINER_URL}/api/docker/${ENDPOINT_ID}/containers/${CONTAINER_ID}/image_status" | \
    jq -r '.Status // "unknown"')

  if [ "$STATUS" = "outdated" ]; then
    echo "OUTDATED: $CONTAINER_NAME ($IMAGE)"
  elif [ "$STATUS" = "updated" ]; then
    echo "UP TO DATE: $CONTAINER_NAME ($IMAGE)"
  else
    echo "UNKNOWN: $CONTAINER_NAME ($IMAGE) - $STATUS"
  fi
done < <(echo "$CONTAINERS" | jq -c '.[]')
```

## Step 3: Pull the Latest Image for a Container

After detecting an outdated image, pull the latest version:

```bash
IMAGE_NAME="nginx"
IMAGE_TAG="latest"
IMAGE_NAME_ENCODED=$(jq -rn --arg v "$IMAGE_NAME" '$v|@uri')
IMAGE_TAG_ENCODED=$(jq -rn --arg v "$IMAGE_TAG" '$v|@uri')

# Pull the latest version of the image
curl -s -X POST \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=${IMAGE_NAME_ENCODED}&tag=${IMAGE_TAG_ENCODED}" | \
  while IFS= read -r line; do
    echo "$line" | jq -r '.status // .errorDetail.message // .error // .' 2>/dev/null || echo "$line"
  done

echo "Image pull complete."
```

## Step 4: Update a Container to Use the Latest Image

After pulling, recreate the container with the new image:

```bash
CONTAINER_ID="abc123def456"

# Recreate a standalone container and optionally pull the latest image first
curl -s -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"PullImage":true}' \
  "${PORTAINER_URL}/api/docker/${ENDPOINT_ID}/containers/${CONTAINER_ID}/recreate" | jq .

# Note: This recreate endpoint is for standalone Docker containers.
# For stack-managed workloads or Swarm services, redeploy the stack or force-update the service instead.
```

## Step 5: Get Image Digest for Comparison

Compare the local image digest against the registry digest manually:

```bash
IMAGE_NAME="nginx"
IMAGE_TAG="latest"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"
IMAGE_REF_ENCODED=$(jq -rn --arg v "$IMAGE_REF" '$v|@uri')

# Get the local image digest
LOCAL_DIGEST=$(curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_REF_ENCODED}/json" | \
  jq -r '(.RepoDigests[0] // "") | if . == "" then "none" else split("@")[1] end')

# Get the remote registry digest
REMOTE_DIGEST=$(curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/distribution/${IMAGE_REF_ENCODED}/json" | \
  jq -r '.Descriptor.digest // "none"')

echo "Local digest: $LOCAL_DIGEST"
echo "Remote digest: $REMOTE_DIGEST"

# Inspect local image details
curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_REF_ENCODED}/json" | \
  jq '{
    id: .Id[0:20],
    tags: .RepoTags,
    created: .Created,
    size_mb: (.Size / 1048576 | floor),
    local_repo_digest: .RepoDigests[0]
  }'
```

## Step 6: List All Local Images

```bash
# List all local images with their tags and sizes
curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/json" | \
  jq '.[] | {
    id: .Id[0:12],
    tags: .RepoTags,
    size_mb: (.Size / 1048576 | floor),
    created: .Created
  }'

# Find images with no tags (dangling images)
DANGLING_FILTERS=$(jq -nc '{dangling:["true"]}')
curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/json?filters=$(jq -rn --arg v "$DANGLING_FILTERS" '$v|@uri')" | jq .
```

## Step 7: Remove Unused Images

```bash
# Remove all unused images (prune)
curl -s -X POST \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/prune" | \
  jq '{deleted: (.ImagesDeleted // [] | length), reclaimed_mb: (.SpaceReclaimed / 1048576 | floor)}'

# Remove a specific image
IMAGE_ID="sha256:abc123..."
curl -s -X DELETE \
  -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/${IMAGE_ID}"
```

## Step 8: Automated Update Notification Script

```bash
#!/bin/bash
# notify-outdated-images.sh - Send Slack notification for outdated images

PORTAINER_URL="https://portainer.example.com"
TOKEN="your-access-token"
AUTH_HEADER="X-API-Key: $TOKEN"
# If you authenticated via /api/auth and received a JWT instead, use:
# AUTH_HEADER="Authorization: Bearer $TOKEN"
ENDPOINT_ID=1
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

CONTAINERS=$(curl -s -H "$AUTH_HEADER" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json")

OUTDATED_ITEMS=""

while IFS= read -r CONTAINER; do
  ID=$(echo "$CONTAINER" | jq -r '.Id')
  NAME=$(echo "$CONTAINER" | jq -r '.Names[0]' | sed 's/^\///')
  IMAGE=$(echo "$CONTAINER" | jq -r '.Image')

  STATUS=$(curl -s -H "$AUTH_HEADER" \
    "${PORTAINER_URL}/api/docker/${ENDPOINT_ID}/containers/${ID}/image_status" | \
    jq -r '.Status // "unknown"')

  if [ "$STATUS" = "outdated" ]; then
    OUTDATED_ITEMS+="- ${NAME}: ${IMAGE}"$'\n'
  fi
done < <(echo "$CONTAINERS" | jq -c '.[]')

if [ -n "$OUTDATED_ITEMS" ]; then
  PAYLOAD=$(jq -n --arg text "*Outdated Container Images Detected*\n${OUTDATED_ITEMS}" '{text: $text}')
  curl -s -X POST "$SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
fi
```

## Conclusion

The Portainer API provides image update checking capabilities that you can integrate into monitoring dashboards, CI/CD pipelines, and automated update workflows. Use the image status endpoint for quick per-container checks, combine with pull operations for automated updates, and set up scheduled scripts to proactively notify your team about outdated images before they become security liabilities.
