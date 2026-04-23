# How to Implement Rolling Updates with Portainer on Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Rolling Update, Zero Downtime, DevOps, Deployment

Description: Configure Docker Swarm rolling updates with Portainer for zero-downtime deployments with automatic rollback on failure.

## Introduction

Rolling updates replace containers one at a time (or in small batches), helping your service stay available throughout the update. Docker Swarm has built-in rolling update support with configurable parallelism, delay, health checks, and rollback policies. Portainer provides a visual interface to manage and monitor these updates.

## Step 1: Deploy Service with Update Config

```yaml
# docker-compose.yml - Service with rolling update configuration

networks:
  app_overlay:
    driver: overlay
    attachable: true

services:
  api:
    image: myapp/api:${IMAGE_TAG:-latest}
    networks:
      - app_overlay
    deploy:
      replicas: 6

      # Rolling update configuration
      update_config:
        # Update 2 replicas at a time
        parallelism: 2
        # Wait 15s between updating batches
        delay: 15s
        # Start new replica before stopping old (requires spare capacity for zero downtime)
        order: start-first
        # Monitor each updated task for failures for 60s
        monitor: 60s
        # Roll back all replicas on failure
        failure_action: rollback
        # Maximum failure ratio before rollback
        max_failure_ratio: 0

      # Rollback configuration (when failure_action=rollback)
      rollback_config:
        parallelism: 2
        delay: 5s
        order: stop-first
        failure_action: pause
        monitor: 30s

      # Restart policy for failed containers
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 60s

      # Resource limits
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

      # Service labels (Traefik's Swarm provider reads service labels)
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
        - "traefik.http.services.api.loadbalancer.server.port=8000"
        - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
        - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"

    # Health check reports app readiness and can fail unhealthy tasks during the monitor window
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## Step 2: Trigger Rolling Update via Portainer

### Via Portainer UI
1. Navigate to **Services** in Portainer (Swarm mode)
2. Click the **api** service
3. Click **Update** or **Edit**
4. Change the image tag
5. Click **Update the service**

### Via Portainer API

```bash
#!/bin/bash
# rolling-update.sh - Trigger rolling update via Portainer API

NEW_IMAGE="myapp/api:${1:?Specify new image tag}"
SERVICE_ID="myapp_api"
PORTAINER_URL="https://portainer.yourdomain.com"
API_KEY="your-portainer-api-key"
ENDPOINT_ID=1

echo "Starting rolling update: $SERVICE_ID → $NEW_IMAGE"

# Get current service spec
SERVICE=$(curl -s \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_ID")

CURRENT_VERSION=$(echo "$SERVICE" | jq -r '.Version.Index')

echo "Service version: $CURRENT_VERSION"

# Update the service with new image
UPDATE_RESPONSE=$(curl -s -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/services/$SERVICE_ID/update?version=$CURRENT_VERSION" \
    -d "$(echo "$SERVICE" | jq --arg img "$NEW_IMAGE" \
        '.Spec | .TaskTemplate.ContainerSpec.Image = $img')")

echo "Update initiated: $(echo "$UPDATE_RESPONSE" | jq '.')"
```

## Step 3: Monitor Rolling Update Progress

```bash
#!/bin/bash
# monitor-update.sh - Monitor rolling update progress

SERVICE_NAME="${1:?Specify service name}"
EXPECTED_REPLICAS="${2:-6}"

echo "Monitoring update for: $SERVICE_NAME"

while true; do
    # Get current status
    RUNNING=$(docker service ps "$SERVICE_NAME" \
        --filter "desired-state=running" \
        --format '{{.CurrentState}}' | \
        grep -c "Running")

    PREPARING=$(docker service ps "$SERVICE_NAME" \
        --filter "desired-state=running" \
        --format '{{.CurrentState}}' | \
        grep -c "Preparing")

    FAILED=$(docker service ps "$SERVICE_NAME" \
        --format '{{.CurrentState}}' | \
        grep -c "Failed")

    UPDATE_STATE=$(docker service inspect "$SERVICE_NAME" \
        --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}')

    echo "[$(date '+%H:%M:%S')] Running: $RUNNING/$EXPECTED_REPLICAS | Preparing: $PREPARING | Failed: $FAILED | Update: ${UPDATE_STATE:-not started}"

    # Check for a paused update; with failure_action=rollback, Swarm starts rollback automatically
    if [ "$UPDATE_STATE" = "paused" ] || [ "$UPDATE_STATE" = "rollback_paused" ]; then
        echo "ERROR: Update paused in state: $UPDATE_STATE"
        if [ "$UPDATE_STATE" = "paused" ]; then
            docker service rollback "$SERVICE_NAME"
        fi
        exit 1
    fi

    if [ "$UPDATE_STATE" = "rollback_started" ] || [ "$UPDATE_STATE" = "rollback_completed" ]; then
        echo "ERROR: Update failed and rollback state is: $UPDATE_STATE"
        exit 1
    fi

    # Check if update is complete
    if [ "$RUNNING" -eq "$EXPECTED_REPLICAS" ] && [ "$PREPARING" -eq 0 ] && [ "$UPDATE_STATE" = "completed" ]; then
        echo "Update complete! All $EXPECTED_REPLICAS replicas running."
        break
    fi

    sleep 5
done

# Give health checks time to fail unhealthy tasks, then verify desired tasks are still running
echo "Waiting for health-check monitor window..."
sleep 30

RUNNING_AFTER_WAIT=$(docker service ps "$SERVICE_NAME" \
    --filter "desired-state=running" \
    --format '{{.CurrentState}}' | \
    grep -c "Running")

if [ "$RUNNING_AFTER_WAIT" -eq "$EXPECTED_REPLICAS" ]; then
    echo "✓ All replicas still running after health-check window. Update successful!"
else
    echo "WARNING: Expected $EXPECTED_REPLICAS running replicas, found $RUNNING_AFTER_WAIT"
fi
```

## Step 4: Manual Rollback

```bash
# Rollback via Docker CLI
docker service rollback myapp_api

# Rollback via Portainer API
SERVICE=$(curl -s \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/1/docker/services/myapp_api")

VERSION=$(echo "$SERVICE" | jq -r '.Version.Index')

curl -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    "$PORTAINER_URL/api/endpoints/1/docker/services/myapp_api/update?version=$VERSION&rollback=previous" \
    -d "$(echo "$SERVICE" | jq '.Spec')"

# View rollback history
docker service ps myapp_api --no-trunc
```

## Step 5: Zero-Downtime Verification

```bash
#!/bin/bash
# verify-zero-downtime.sh - Test that rolling update has no downtime

TARGET_URL="https://api.yourdomain.com/health"
ERRORS=0
TOTAL=0

echo "Starting continuous health checks during update..."
echo "Press Ctrl+C to stop"

while true; do
    TOTAL=$((TOTAL + 1))
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$TARGET_URL")

    if [ "$HTTP_STATUS" != "200" ]; then
        ERRORS=$((ERRORS + 1))
        echo "[$(date '+%H:%M:%S')] ERROR: HTTP $HTTP_STATUS (total errors: $ERRORS/$TOTAL)"
    else
        # Show status every 10 checks
        if [ $((TOTAL % 10)) -eq 0 ]; then
            ERROR_RATE=$((ERRORS * 100 / TOTAL))
            echo "[$(date '+%H:%M:%S')] OK: $TOTAL checks, $ERRORS errors (${ERROR_RATE}% error rate)"
        fi
    fi

    sleep 0.5
done
```

## Step 6: Portainer Update UI Walkthrough

In Portainer's Services view during a rolling update:

1. **Service details** shows update progress:
   - Current image tag vs new image tag
   - Number of tasks in each state

2. **Service tasks** tab shows individual replica states:
   - `Running` (old version being replaced)
   - `Preparing` (new version starting)
   - `Running` (new version task executing)

3. **Update failure** automatically triggers rollback if configured

## Conclusion

Docker Swarm rolling updates with Portainer can provide zero-downtime deployments when the service has enough capacity and the app handles graceful startup and shutdown. The `start-first` order starts replacement tasks before old tasks are stopped, so replicas briefly overlap. Health checks and the update monitor window help detect unhealthy tasks during rollout. Automatic rollback triggers if failures exceed the threshold. Portainer's Services view gives real-time visibility into the update progress, making it easy to monitor and intervene if needed.
