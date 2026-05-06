# How to Implement Blue-Green Deployments with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Blue-Green Deployment, CI/CD, Zero Downtime, DevOps

Description: Implement zero-downtime blue-green deployments using Docker networks and Traefik with Portainer for instant traffic switching.

## Introduction

Blue-green deployment maintains two identical environments: Blue (current production) and Green (new version). Traffic is routed to Blue while Green is deployed and tested. When ready, traffic switches instantly to Green - achieving zero-downtime deployments with an instant rollback capability. This guide implements blue-green with Docker and Portainer.

## Architecture

```text
           Traffic Router (Traefik)
                  │
         ┌────────┴────────┐
         ▼
    [ACTIVE: Blue]     [Standby: Green]
    app-blue:8080      app-green:8080
    v1.0.0             v1.1.0 (being tested)
```

## Step 1: Create the Blue-Green Stack

```yaml
# docker-compose.yml - Blue-Green deployment setup

networks:
  # Network for traffic router
  public:
    external: true
  # Internal network shared by both environments
  app_internal:
    driver: bridge

services:
  # Traffic router - Traefik
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      # Directory on the Docker host that stores the live routing config
      - /opt/blue-green/dynamic:/etc/traefik/dynamic:ro
    command:
      - "--api.insecure=true"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--providers.file.watch=true"
      - "--entrypoints.web.address=:80"
    networks:
      - public
      - app_internal

  # Blue environment (current production)
  app_blue:
    image: myapp:${BLUE_IMAGE_TAG:-1.0.0}
    container_name: app_blue
    restart: unless-stopped
    environment:
      - VERSION=blue
      - COLOR=blue
    networks:
      - app_internal

  # Green environment (new version, initially inactive)
  app_green:
    image: myapp:${GREEN_IMAGE_TAG:-1.1.0}
    container_name: app_green
    restart: unless-stopped
    environment:
      - VERSION=green
      - COLOR=green
    networks:
      - app_internal
```

```yaml
# /opt/blue-green/dynamic/app-routing.yml

http:
  routers:
    app:
      rule: Host(`app.yourdomain.com`)
      entryPoints:
        - web
      service: app-blue
    app-green-test:
      rule: Host(`green.yourdomain.com`)
      entryPoints:
        - web
      service: app-green
  services:
    app-blue:
      loadBalancer:
        servers:
          - url: http://app_blue:8080
    app-green:
      loadBalancer:
        servers:
          - url: http://app_green:8080
```

## Step 2: Deploy via Portainer Stack

1. On the Docker host, create the external network if it does not already exist: `docker network create public`
2. On the Docker host, create `/opt/blue-green/dynamic/app-routing.yml` with the routing config above
3. In Portainer, create a new stack named `app-production`
4. Paste the docker-compose above
5. Deploy the stack
6. Verify Blue is receiving traffic at `http://app.yourdomain.com`
7. Test Green at `http://green.yourdomain.com`

## Step 3: Traffic Switch Script

```bash
#!/bin/bash
# blue-green-switch.sh - Switch traffic between blue and green

set -euo pipefail

ROUTING_FILE="/opt/blue-green/dynamic/app-routing.yml"

# Determine which backend the production router currently targets
CURRENT=$(awk '
  $1 == "app:" { in_app_router=1; next }
  in_app_router && $1 == "service:" { print $2; exit }
' "$ROUTING_FILE")

if [ -z "$CURRENT" ]; then
    echo "ERROR: Could not determine the active environment from $ROUTING_FILE"
    exit 1
fi

if [ "$CURRENT" = "app-blue" ]; then
    TARGET="app-green"
    echo "Switching: Blue -> Green"
else
    TARGET="app-blue"
    echo "Switching: Green -> Blue"
fi

# Update only the production router. Traefik reloads the file automatically.
awk -v target="$TARGET" '
  $1 == "app:" { in_app_router=1 }
  in_app_router && $1 == "service:" {
    sub(/app-(blue|green)/, target)
    in_app_router=0
  }
  { print }
' "$ROUTING_FILE" > "${ROUTING_FILE}.tmp"

mv "${ROUTING_FILE}.tmp" "$ROUTING_FILE"

echo "Traffic switched to ${TARGET#app-}"
```

## Step 4: Automated Blue-Green with Portainer Webhooks

Portainer stack webhooks are available in Portainer Business Edition on non-Edge environments.

```bash
#!/bin/bash
# deploy-green.sh - Deploy new version to green and run tests

set -euo pipefail

if [ $# -ne 1 ]; then
    echo "Usage: $0 <image-tag>"
    exit 1
fi

NEW_VERSION="$1"
STACK_WEBHOOK_URL="https://portainer.yourdomain.com/api/stacks/webhooks/your-webhook-id"

echo "=== Starting Blue-Green Deployment ==="
echo "Deploying version: $NEW_VERSION to Green"

# Step 1: Redeploy the stack with a new Green image tag
curl -fsS -X POST "${STACK_WEBHOOK_URL}?GREEN_IMAGE_TAG=${NEW_VERSION}"

echo "Green deployed. Running health checks..."
sleep 10

# Step 3: Health check Green
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://green.yourdomain.com/health)
if [ "$HEALTH" != "200" ]; then
    echo "ERROR: Green health check failed (HTTP $HEALTH)"
    exit 1
fi

echo "Green is healthy. Running integration tests..."

# Step 4: Run integration tests against Green
if ! ./run-integration-tests.sh http://green.yourdomain.com; then
    echo "ERROR: Integration tests failed"
    exit 1
fi

echo "All tests passed. Switching traffic to Green..."

# Step 5: Switch production traffic to Green
./blue-green-switch.sh

echo "=== Deployment Complete ==="
echo "Green (v$NEW_VERSION) is now serving production traffic"
echo "Blue (previous version) is still running for instant rollback"
```

## Step 5: Instant Rollback

```bash
#!/bin/bash
# rollback.sh - Instantly revert to Blue

set -euo pipefail

ROUTING_FILE="/opt/blue-green/dynamic/app-routing.yml"

echo "=== ROLLBACK: Reverting to Blue ==="

# Restore the production router to Blue. Traefik reloads the file automatically.
awk '
  $1 == "app:" { in_app_router=1 }
  in_app_router && $1 == "service:" {
    sub(/app-(blue|green)/, "app-blue")
    in_app_router=0
  }
  { print }
' "$ROUTING_FILE" > "${ROUTING_FILE}.tmp"

mv "${ROUTING_FILE}.tmp" "$ROUTING_FILE"

echo "Rollback complete. Blue is now serving traffic."
```

## Step 6: Validate Deployment in Portainer

After switching:
1. Check Portainer **Containers** view - both app containers should show as running
2. Verify Traefik dashboard shows the correct active route
3. Monitor container logs in Portainer for errors

```bash
# Confirm which backend the production router targets
grep -A3 '^    app:$' /opt/blue-green/dynamic/app-routing.yml

# Validate traffic is flowing to correct container
curl -I http://app.yourdomain.com
# Check application-specific headers or response content to identify which version is active

# Check container stats in Portainer
# Containers > app_green > Stats
# Should show increasing request count
```

## Conclusion

Blue-green deployments with Docker, Traefik, and Portainer give you zero-downtime releases with instant rollback capability. The pattern is simple: keep both versions running, test the new version before switching traffic, then switch instantly. Portainer makes it easy to manage both containers, view logs, and monitor the transition. The entire process can be automated in a CI/CD pipeline using Portainer's stack webhooks in Business Edition.
