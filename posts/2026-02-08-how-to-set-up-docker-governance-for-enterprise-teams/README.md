# How to Set Up Docker Governance for Enterprise Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, governance, enterprise, policy, standards, security, team management

Description: Establish Docker governance for enterprise teams with standardized base images, naming conventions, security policies, and automated enforcement.

---

When a handful of developers use Docker, informal conventions work fine. When hundreds of engineers across multiple teams build and deploy containers, you need governance. Without it, you end up with wildly different base images, inconsistent security practices, untagged images cluttering registries, and nobody knowing who owns what.

Docker governance establishes the rules, processes, and tooling that keep container usage consistent, secure, and manageable across an enterprise. This guide covers how to build that governance framework from the ground up.

## Defining Your Governance Pillars

Enterprise Docker governance typically covers five areas:

1. **Image standards** - What base images, labels, and build practices are required
2. **Registry management** - How images are organized, stored, and retained
3. **Security policies** - Vulnerability thresholds, scanning requirements, secrets management
4. **Access control** - Who can build, push, pull, and deploy images
5. **Operational standards** - Resource limits, logging, health checks, lifecycle management

Document these as a living policy that teams can reference. Then automate enforcement so the policies are not just suggestions.

## Standardizing Base Images

Create an approved base image catalog that all teams must use. This eliminates the problem of 50 teams using 50 different Python base images with different security profiles.

```dockerfile
# base-images/python/Dockerfile
# Organization-approved Python base image with security hardening
FROM python:3.12.2-slim@sha256:abc123...

LABEL org.example.base-image="python-3.12"
LABEL org.example.maintained-by="platform-team"
LABEL org.example.security-scan-date="2026-02-08"

# Install common security updates and certificates
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user that application images should use
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Set security-conscious defaults
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
USER appuser

ENTRYPOINT ["tini", "--"]
```

Build and publish the approved base images on a regular schedule:

```bash
#!/bin/bash
# build-base-images.sh
# Builds and pushes all approved base images to the internal registry

REGISTRY="registry.example.com/base-images"
DATE=$(date +%Y%m%d)

IMAGES=("python" "node" "go" "java")

for IMG in "${IMAGES[@]}"; do
    echo "Building base image: $IMG"

    # Build with both a dated tag and the latest tag
    docker build \
        -t "${REGISTRY}/${IMG}:${DATE}" \
        -t "${REGISTRY}/${IMG}:latest" \
        -f "base-images/${IMG}/Dockerfile" \
        "base-images/${IMG}/"

    # Scan the image before pushing
    trivy image --exit-code 1 --severity CRITICAL "${REGISTRY}/${IMG}:${DATE}"
    if [ $? -ne 0 ]; then
        echo "SECURITY: Base image $IMG has critical vulnerabilities. Skipping push."
        continue
    fi

    # Push to the registry
    docker push "${REGISTRY}/${IMG}:${DATE}"
    docker push "${REGISTRY}/${IMG}:latest"

    echo "Published: ${REGISTRY}/${IMG}:${DATE}"
done
```

## Enforcing Naming Conventions

Consistent naming prevents confusion and makes automation possible.

```
Registry structure:
registry.example.com/
  base-images/           # Approved base images (platform team only)
    python:latest
    node:latest
  team-alpha/            # Team Alpha's application images
    api-service:v1.2.3
    worker:v1.2.3
  team-beta/             # Team Beta's application images
    frontend:v2.0.1
  shared/                # Shared libraries and tools
    nginx-proxy:v1.0.0
```

Enforce naming with an OPA policy:

```rego
# policy/naming.rego
# Enforces image naming conventions across the organization

package docker.naming

# Image names must follow the pattern: registry/namespace/name:tag
deny[msg] {
    image := input.image
    not regex.match(`^registry\.example\.com/(base-images|team-[a-z]+|shared)/[a-z0-9-]+:[a-z0-9][a-z0-9._-]*$`, image)
    msg := sprintf("Image name '%s' does not follow naming convention: registry/namespace/name:tag", [image])
}

# Tags must not be 'latest' in production
deny[msg] {
    input.environment == "production"
    endswith(input.image, ":latest")
    msg := "The 'latest' tag is not allowed in production deployments"
}
```

## Required Labels

Labels provide metadata that governance tools use for tracking and enforcement.

```dockerfile
# Required labels for all application images
LABEL org.example.team="team-alpha"
LABEL org.example.service="api-service"
LABEL org.example.version="1.2.3"
LABEL org.example.maintainer="alice@example.com"
LABEL org.example.repo="https://github.com/example/api-service"
LABEL org.example.build-date="2026-02-08"
LABEL org.example.commit-sha="abc123def456"
```

Validate labels in CI/CD:

```bash
#!/bin/bash
# validate-labels.sh
# Checks that a Docker image has all required labels

IMAGE="$1"
REQUIRED_LABELS="org.example.team org.example.service org.example.version org.example.maintainer"
MISSING=0

for LABEL in $REQUIRED_LABELS; do
    VALUE=$(docker inspect --format "{{index .Config.Labels \"$LABEL\"}}" "$IMAGE" 2>/dev/null)
    if [ -z "$VALUE" ]; then
        echo "MISSING: Label '$LABEL' is required but not set"
        MISSING=$((MISSING + 1))
    else
        echo "OK: $LABEL = $VALUE"
    fi
done

if [ "$MISSING" -gt 0 ]; then
    echo "FAIL: $MISSING required labels are missing"
    exit 1
fi

echo "PASS: All required labels present"
```

## Resource Limit Policies

Prevent any single container from consuming unbounded resources:

```yaml
# docker-compose.governance.yml
# Example service definition with required resource limits

services:
  api:
    image: registry.example.com/team-alpha/api-service:v1.2.3
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
    # Health check is required for all production containers
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    # Logging configuration is required
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```

Enforce resource limits with a validation script:

```bash
#!/bin/bash
# validate-compose.sh
# Validates that a docker-compose file meets governance requirements

COMPOSE_FILE="$1"
ERRORS=0

if [ -z "$COMPOSE_FILE" ]; then
    echo "Usage: validate-compose.sh <docker-compose.yml>"
    exit 1
fi

# Check that every service has resource limits defined
SERVICES=$(docker compose -f "$COMPOSE_FILE" config --services)

for SERVICE in $SERVICES; do
    # Check memory limit
    MEM_LIMIT=$(docker compose -f "$COMPOSE_FILE" config | \
        yq ".services.${SERVICE}.deploy.resources.limits.memory // \"missing\"")

    if [ "$MEM_LIMIT" = "missing" ] || [ "$MEM_LIMIT" = "null" ]; then
        echo "ERROR: Service '$SERVICE' is missing memory limit"
        ERRORS=$((ERRORS + 1))
    fi

    # Check health check
    HEALTHCHECK=$(docker compose -f "$COMPOSE_FILE" config | \
        yq ".services.${SERVICE}.healthcheck // \"missing\"")

    if [ "$HEALTHCHECK" = "missing" ] || [ "$HEALTHCHECK" = "null" ]; then
        echo "ERROR: Service '$SERVICE' is missing health check"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ "$ERRORS" -gt 0 ]; then
    echo "FAIL: $ERRORS governance violations found"
    exit 1
fi

echo "PASS: All governance checks passed"
```

## Registry Retention and Cleanup Policies

Set rules for how long images are kept:

```bash
#!/bin/bash
# registry-retention.sh
# Enforces retention policies on the Docker registry

REGISTRY="registry.example.com"
RETENTION_DAYS=90
KEEP_LATEST=10

# Get all repositories
REPOS=$(curl -s "https://${REGISTRY}/v2/_catalog" | jq -r '.repositories[]')

for REPO in $REPOS; do
    echo "Processing: $REPO"

    # Get all tags sorted by creation date
    TAGS=$(curl -s "https://${REGISTRY}/v2/${REPO}/tags/list" | jq -r '.tags[]?' | sort)
    TAG_COUNT=$(echo "$TAGS" | wc -l)

    # Skip if we have fewer tags than the minimum to keep
    if [ "$TAG_COUNT" -le "$KEEP_LATEST" ]; then
        echo "  Keeping all $TAG_COUNT tags (below minimum of $KEEP_LATEST)"
        continue
    fi

    # Identify tags to delete (older than retention period, keeping minimum count)
    TAGS_TO_DELETE=$(echo "$TAGS" | head -n -$KEEP_LATEST)
    for TAG in $TAGS_TO_DELETE; do
        echo "  Would delete: ${REPO}:${TAG}"
        # Uncomment to actually delete:
        # curl -s -X DELETE "https://${REGISTRY}/v2/${REPO}/manifests/${TAG}"
    done
done
```

## Governance Dashboard

Create a script that generates a governance compliance overview:

```bash
#!/bin/bash
# governance-report.sh
# Generates a governance compliance report for all running containers

echo "=== Docker Governance Report ==="
echo "Date: $(date)"
echo "Host: $(hostname)"
echo ""

TOTAL=0
COMPLIANT=0

for CONTAINER_ID in $(docker ps -q); do
    TOTAL=$((TOTAL + 1))
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_ID")
    ISSUES=""

    # Check: uses approved registry
    if [[ ! "$IMAGE" =~ ^registry\.example\.com/ ]]; then
        ISSUES="${ISSUES}unapproved-registry "
    fi

    # Check: has required labels
    TEAM=$(docker inspect --format '{{index .Config.Labels "org.example.team"}}' "$CONTAINER_ID" 2>/dev/null)
    if [ -z "$TEAM" ]; then
        ISSUES="${ISSUES}missing-team-label "
    fi

    # Check: has memory limit
    MEM=$(docker inspect --format '{{.HostConfig.Memory}}' "$CONTAINER_ID")
    if [ "$MEM" = "0" ]; then
        ISSUES="${ISSUES}no-memory-limit "
    fi

    # Check: has health check
    HC=$(docker inspect --format '{{.Config.Healthcheck}}' "$CONTAINER_ID" 2>/dev/null)
    if [ -z "$HC" ] || [ "$HC" = "<nil>" ]; then
        ISSUES="${ISSUES}no-healthcheck "
    fi

    if [ -z "$ISSUES" ]; then
        COMPLIANT=$((COMPLIANT + 1))
        echo "PASS: $NAME ($IMAGE)"
    else
        echo "FAIL: $NAME ($IMAGE) - Issues: $ISSUES"
    fi
done

echo ""
echo "Summary: $COMPLIANT/$TOTAL containers compliant ($(( COMPLIANT * 100 / TOTAL ))%)"
```

## Summary

Docker governance for enterprise teams is about establishing clear standards and automating their enforcement. Start with approved base images and mandatory labels. Add naming conventions, resource limits, and security scanning. Enforce everything through CI/CD gates, not just documentation. Build dashboards that give leadership visibility into compliance status. Governance is not about slowing teams down. It is about preventing the chaos that slows everyone down later.
