# How to Use Podman for Blue-Green Deployments in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Blue-Green Deployment, CI/CD, Zero Downtime

Description: Learn how to implement blue-green deployments using Podman for zero-downtime container releases with instant rollback capability.

---

> Blue-green deployments give you zero-downtime releases and instant rollback by maintaining two identical production environments and switching traffic between them.

Blue-green deployments maintain two identical environments: one active (serving traffic) and one idle (ready for the next release). When deploying, you update the idle environment with the new version, test it, and then switch traffic to it. Podman handles building the container images in CI, while the deployment strategy manages the environment switching. This guide covers implementing blue-green deployments with Podman.

---

## Understanding Blue-Green Deployments

The blue-green pattern involves two environments: one serves live traffic while the other is updated with the new release.

```bash
#!/bin/bash
# Blue-green deployment concept:

#
# Blue (active) <-- Load Balancer --> Users
# Green (idle)
#
# Deploy new version to Green:
# Blue (active) <-- Load Balancer --> Users
# Green (updated)
#
# Switch traffic:
# Blue (idle)
# Green (active) <-- Load Balancer --> Users
#
# If issues occur, switch back instantly:
# Blue (active) <-- Load Balancer --> Users
# Green (idle)
```

## Building Images for Blue-Green Deployment

Build and tag images with version information for clear tracking.

```bash
#!/bin/bash
# Build images for blue-green deployment with Podman

REGISTRY="registry.example.com"
APP="myapp"
VERSION="${CI_COMMIT_SHA:0:8}"

# Build the new version
podman build \
  --tag "${REGISTRY}/${APP}:${VERSION}" \
  --label "deploy.version=${VERSION}" \
  --label "deploy.timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  .

# Push the image to the registry
echo "${REGISTRY_TOKEN}" | podman login "${REGISTRY}" \
  -u "${REGISTRY_USER}" --password-stdin

podman push "${REGISTRY}/${APP}:${VERSION}"

echo "Image ready for blue-green deployment: ${REGISTRY}/${APP}:${VERSION}"
```

## Implementing Blue-Green with Podman and Nginx

Use Podman containers with Nginx as the traffic switch.

```bash
#!/bin/bash
# blue-green-deploy.sh
# Implement blue-green deployment with Podman on a single host

NETWORK="bluegreen-net"
NEW_IMAGE="${1:-myapp:latest}"
STATE_FILE="/tmp/bluegreen-state"

# Determine current active environment
if [ -f "$STATE_FILE" ]; then
  ACTIVE=$(cat "$STATE_FILE")
else
  ACTIVE="blue"
fi

# Determine the idle environment (the one to deploy to)
if [ "$ACTIVE" = "blue" ]; then
  DEPLOY_TO="green"
else
  DEPLOY_TO="blue"
fi

echo "Current active: ${ACTIVE}"
echo "Deploying to:   ${DEPLOY_TO}"

# Ensure the network exists
podman network create "$NETWORK" 2>/dev/null || true

# Stop and remove the idle environment container
podman stop "app-${DEPLOY_TO}" 2>/dev/null || true
podman rm "app-${DEPLOY_TO}" 2>/dev/null || true

# Deploy the new version to the idle environment
podman run -d \
  --name "app-${DEPLOY_TO}" \
  --network "$NETWORK" \
  "$NEW_IMAGE"

echo "New version deployed to ${DEPLOY_TO} environment"
```

## Health Check Before Switching

Validate the new environment before switching traffic.

This example assumes the application image already defines a `HEALTHCHECK` instruction, or that you set one when creating the container with `podman run --health-cmd`.

```bash
#!/bin/bash
# health-check.sh
# Verify the newly deployed environment is healthy before switching

DEPLOY_TO="${1:-green}"
MAX_RETRIES=20
RETRY_INTERVAL=3

echo "Health checking ${DEPLOY_TO} environment..."

for i in $(seq 1 "$MAX_RETRIES"); do
  # Run the container's configured Podman health check
  podman healthcheck run "app-${DEPLOY_TO}" >/dev/null 2>&1
  STATUS=$?

  if [ "$STATUS" -eq 0 ]; then
    echo "Health check ${i}/${MAX_RETRIES}: PASSED"
    echo "${DEPLOY_TO} environment is healthy and ready for traffic"
    exit 0
  elif [ "$STATUS" -eq 125 ]; then
    echo "ERROR: app-${DEPLOY_TO} does not have a defined Podman health check"
    exit 1
  else
    echo "Health check ${i}/${MAX_RETRIES}: waiting..."
    sleep "$RETRY_INTERVAL"
  fi
done

echo "ERROR: ${DEPLOY_TO} environment failed health checks"
echo "Keeping traffic on current active environment"
exit 1
```

## Switching Traffic

Switch the load balancer to point to the new environment.

```bash
#!/bin/bash
# switch-traffic.sh
# Switch traffic from the active to the newly deployed environment

NETWORK="bluegreen-net"
STATE_FILE="/tmp/bluegreen-state"
ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")

if [ "$ACTIVE" = "blue" ]; then
  NEW_ACTIVE="green"
else
  NEW_ACTIVE="blue"
fi

echo "Switching traffic from ${ACTIVE} to ${NEW_ACTIVE}..."

# Generate Nginx config pointing to the new active environment
cat > /tmp/nginx-bluegreen.conf << NGINX
upstream active_backend {
    server app-${NEW_ACTIVE}:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://active_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
NGINX

# Check if the load balancer is already running
if podman inspect lb --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  # The bind-mounted config file is already updated on the host; validate and reload
  podman exec lb nginx -t && podman exec lb nginx -s reload
elif podman inspect lb >/dev/null 2>&1; then
  podman start lb
else
  # Start the load balancer for the first time
  podman run -d \
    --name lb \
    --network "$NETWORK" \
    -p 80:80 \
    -v /tmp/nginx-bluegreen.conf:/etc/nginx/conf.d/default.conf:ro,Z \
    nginx:alpine
fi

# Update the state file
echo "$NEW_ACTIVE" > "$STATE_FILE"

echo "Traffic switched to ${NEW_ACTIVE} environment"
echo "Previous environment (${ACTIVE}) is now idle and available for rollback"
```

## Instant Rollback

Roll back to the previous version by simply switching traffic back.

```bash
#!/bin/bash
# rollback.sh
# Instantly roll back by switching traffic to the previous environment

STATE_FILE="/tmp/bluegreen-state"
ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")

if [ "$ACTIVE" = "blue" ]; then
  ROLLBACK_TO="green"
else
  ROLLBACK_TO="blue"
fi

# Verify the rollback target is still running
if ! podman inspect "app-${ROLLBACK_TO}" --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "ERROR: Cannot rollback - ${ROLLBACK_TO} environment is not running"
  exit 1
fi

if ! podman inspect lb --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "ERROR: Cannot rollback - load balancer is not running"
  exit 1
fi

echo "Rolling back from ${ACTIVE} to ${ROLLBACK_TO}..."

# Switch traffic back using the same mechanism
cat > /tmp/nginx-bluegreen.conf << NGINX
upstream active_backend {
    server app-${ROLLBACK_TO}:8080;
}
server {
    listen 80;
    location / {
        proxy_pass http://active_backend;
        proxy_set_header Host \$host;
    }
}
NGINX

podman exec lb nginx -t && podman exec lb nginx -s reload

echo "$ROLLBACK_TO" > "$STATE_FILE"
echo "Rollback complete. Traffic now on ${ROLLBACK_TO} environment."
```

## Full CI Pipeline for Blue-Green Deployment

Complete CI workflow combining build, deploy, verify, and switch.

```bash
#!/bin/bash
# ci-blue-green-pipeline.sh
# Complete blue-green deployment pipeline

set -e

VERSION="${CI_COMMIT_SHA:0:8}"
REGISTRY="registry.example.com"
IMAGE="${REGISTRY}/myapp:${VERSION}"

echo "=== Step 1: Build ==="
podman build -t "$IMAGE" .
echo "${REGISTRY_TOKEN}" | podman login "${REGISTRY}" \
  -u "${REGISTRY_USER}" --password-stdin
podman push "$IMAGE"

echo "=== Step 2: Deploy to idle environment ==="
./scripts/blue-green-deploy.sh "$IMAGE"

echo "=== Step 3: Health check ==="
STATE_FILE="/tmp/bluegreen-state"
ACTIVE=$(cat "$STATE_FILE" 2>/dev/null || echo "blue")
IDLE=$([ "$ACTIVE" = "blue" ] && echo "green" || echo "blue")

if ./scripts/health-check.sh "$IDLE"; then
  echo "=== Step 4: Switch traffic ==="
  ./scripts/switch-traffic.sh
  echo "Deployment complete: version ${VERSION} is now live"
else
  echo "=== ABORT: Health check failed ==="
  echo "Rolling back idle environment..."
  podman stop "app-${IDLE}" 2>/dev/null || true
  podman rm "app-${IDLE}" 2>/dev/null || true
  exit 1
fi
```

## Summary

Blue-green deployments provide zero-downtime releases with instant rollback capability. Podman builds the container images in CI, and the deployment scripts manage two environments with traffic switching through a load balancer. The key advantage of blue-green over other strategies is the instant rollback -- since the previous version is still running, switching back is just a load balancer configuration change. Health checks between deployment and traffic switching ensure that only verified, working versions receive user traffic. Keep both environments running after a switch so that rollback is always available without delay.
