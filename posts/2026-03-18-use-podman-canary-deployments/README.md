# How to Use Podman for Canary Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Canary Deployment, CI/CD, Deployment Strategies

Description: Learn how to implement canary deployments using Podman to gradually roll out new container versions with traffic splitting and automated health checks.

---

> Canary deployments let you test new container versions with a small percentage of traffic before committing to a full rollout, catching issues before they affect all users.

A canary deployment rolls out a new version to a small subset of users or traffic before deploying to the entire infrastructure. Podman is used in the CI pipeline to build the canary image, and the deployment strategy handles the gradual rollout. This guide shows how to implement canary deployments using Podman for image building and various orchestration approaches for traffic management.

---

## Understanding Canary Deployments

In a canary deployment, you run the new version alongside the current version and gradually shift traffic to the new version while monitoring for issues.

```bash
#!/bin/bash
# Canary deployment workflow:

# 1. Build the new version image with Podman
# 2. Deploy the canary alongside the stable version
# 3. Route a small percentage of traffic to the canary
# 4. Monitor metrics and health checks
# 5. If healthy, increase traffic to the canary
# 6. If unhealthy, roll back the canary

# Build both versions for testing
podman build -t myapp:stable -f Containerfile.stable .
podman build -t myapp:canary .
```

## Building Canary Images with Podman

Build and tag images specifically for canary deployments in CI.

```bash
#!/bin/bash
# Build canary and stable images in CI

REGISTRY="registry.example.com"
APP="myapp"
COMMIT="${CI_COMMIT_SHA:0:8}"

# Build the canary image from the current code
podman build \
  --tag "${REGISTRY}/${APP}:canary" \
  --tag "${REGISTRY}/${APP}:${COMMIT}" \
  --label "deployment.type=canary" \
  --label "deployment.version=${COMMIT}" \
  .

# Log in and push the canary image
echo "${REGISTRY_TOKEN}" | podman login "${REGISTRY}" \
  -u "${REGISTRY_USER}" --password-stdin

podman push "${REGISTRY}/${APP}:canary"
podman push "${REGISTRY}/${APP}:${COMMIT}"

echo "Canary image pushed: ${REGISTRY}/${APP}:canary"
```

## Simple Canary with Podman and Nginx

Implement a basic canary deployment using Podman containers and Nginx for traffic splitting.
This example assumes the application image listens on port `8080`, exposes a `/health` endpoint, and includes `wget` so the container health check can run inside the container.

```bash
#!/bin/bash
# Simple canary deployment using Podman and Nginx on a single host
# This demonstrates the concept with a straightforward setup

# Create a network for the deployment
podman network create canary-net

# Run the stable version (handles 90% of traffic)
podman run -d \
  --name app-stable \
  --network canary-net \
  --health-cmd 'wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1' \
  --health-interval 10s \
  --health-retries 3 \
  --health-timeout 3s \
  --health-start-period 15s \
  myapp:stable

# Run the canary version (handles 10% of traffic)
podman run -d \
  --name app-canary \
  --network canary-net \
  --health-cmd 'wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1' \
  --health-interval 10s \
  --health-retries 3 \
  --health-timeout 3s \
  --health-start-period 15s \
  myapp:canary

# Create Nginx configuration for traffic splitting
cat > /tmp/nginx-canary.conf << 'NGINX'
upstream backend {
    # 90% of traffic goes to stable
    server app-stable:8080 weight=9;
    # 10% of traffic goes to canary
    server app-canary:8080 weight=1;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        access_log off;
        proxy_pass http://backend;
    }
}
NGINX

# Run Nginx as the load balancer
podman run -d \
  --name lb \
  --network canary-net \
  -p 80:80 \
  -v /tmp/nginx-canary.conf:/etc/nginx/conf.d/default.conf:ro,Z \
  docker.io/library/nginx:alpine

echo "Canary deployment active: 90% stable, 10% canary"
```

## Health Checking the Canary

Monitor the canary deployment and decide whether to promote or rollback using Podman's health check support.

```bash
#!/bin/bash
# Health check script for canary deployments
# Monitors the canary container and decides promotion or rollback

CANARY_CONTAINER="app-canary"
CHECK_INTERVAL=10
CHECK_COUNT=30
FAILURE_THRESHOLD=3

failures=0
checks=0

echo "Starting canary health monitoring..."
echo "Will check ${CHECK_COUNT} times, every ${CHECK_INTERVAL} seconds"
echo "Failure threshold: ${FAILURE_THRESHOLD}"

for i in $(seq 1 $CHECK_COUNT); do
  checks=$((checks + 1))

  # Check if the canary container is running
  if ! podman inspect "$CANARY_CONTAINER" --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
    echo "CHECK ${checks}: FAIL - Container not running"
    failures=$((failures + 1))
  else
    # Inspect the canary container's health status
    HEALTH_STATUS=$(podman inspect "$CANARY_CONTAINER" \
      --format '{{.State.Health.Status}}' 2>/dev/null)
    if [ "$HEALTH_STATUS" = "healthy" ]; then
      echo "CHECK ${checks}: PASS"
    elif [ "$HEALTH_STATUS" = "starting" ]; then
      echo "CHECK ${checks}: STARTING"
    else
      echo "CHECK ${checks}: FAIL - Health status: ${HEALTH_STATUS:-unknown}"
      failures=$((failures + 1))
    fi
  fi

  # Check if we exceeded the failure threshold
  if [ $failures -ge $FAILURE_THRESHOLD ]; then
    echo "ROLLBACK: Failure threshold reached (${failures}/${FAILURE_THRESHOLD})"
    exit 1
  fi

  sleep $CHECK_INTERVAL
done

echo "PROMOTE: Canary passed all health checks (${failures} failures)"
exit 0
```

## Promoting or Rolling Back the Canary

Scripts for promoting a successful canary or rolling back a failed one.

```bash
#!/bin/bash
# promote-canary.sh
# Promote the canary to become the new stable version

REGISTRY="registry.example.com"
APP="myapp"
CANARY_TAG="${1:-canary}"

echo "Promoting canary to stable..."

# Tag the canary image as the new stable
podman tag "${REGISTRY}/${APP}:${CANARY_TAG}" \
  "${REGISTRY}/${APP}:stable"

# Push the new stable tag
podman push "${REGISTRY}/${APP}:stable"

# Replace the stable container with the canary version
podman stop app-stable
podman rm app-stable

podman run -d \
  --name app-stable \
  --network canary-net \
  --health-cmd 'wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1' \
  --health-interval 10s \
  --health-retries 3 \
  --health-timeout 3s \
  --health-start-period 15s \
  "${REGISTRY}/${APP}:stable"

# Update Nginx to send all traffic to the new stable container
cat > /tmp/nginx-canary.conf << 'NGINX'
upstream backend {
    server app-stable:8080;
}
server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
NGINX

podman exec lb nginx -s reload

# Remove the canary container after traffic has been shifted away from it
podman stop app-canary
podman rm app-canary

echo "Canary promoted to stable successfully"
```

```bash
#!/bin/bash
# rollback-canary.sh
# Roll back a failed canary deployment

echo "Rolling back canary deployment..."

# Stop and remove the canary container
podman stop app-canary 2>/dev/null
podman rm app-canary 2>/dev/null

# Update Nginx to send all traffic to stable
cat > /tmp/nginx-canary.conf << 'NGINX'
upstream backend {
    server app-stable:8080;
}
server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
NGINX

# Reload Nginx configuration
podman exec lb nginx -s reload

echo "Canary rolled back. All traffic going to stable."
```

## Kubernetes Canary with Podman-Built Images

Use Podman in CI to build images for Kubernetes canary workloads. In Kubernetes, traffic shifting is typically handled by a Service selector, an Ingress or Gateway, or a service mesh rather than by the `Deployment` object alone.

```yaml
# k8s/canary-deployment.yaml
# Canary workload in Kubernetes using Podman-built images
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  labels:
    app: myapp
    track: canary
spec:
  replicas: 1  # Small number for canary
  selector:
    matchLabels:
      app: myapp
      track: canary
  template:
    metadata:
      labels:
        app: myapp
        track: canary
    spec:
      containers:
        - name: myapp
          image: registry.example.com/myapp:canary
          ports:
            - containerPort: 8080
```

If you want the stable Service to send some traffic to the canary, the Service selector should match the shared `app: myapp` label and omit the `track` label.

```bash
#!/bin/bash
# CI script: Build and deploy canary to Kubernetes

# Build with Podman
podman build -t registry.example.com/myapp:canary .
podman push registry.example.com/myapp:canary

# Deploy the canary to Kubernetes
kubectl apply -f k8s/canary-deployment.yaml

# Monitor canary health
kubectl rollout status deployment/myapp-canary --timeout=120s
```

## Summary

Canary deployments reduce the risk of releasing new versions by gradually exposing them to production traffic. Podman handles the image building and tagging in CI, while the deployment strategy manages traffic splitting between stable and canary versions. Whether you use a simple Nginx-based approach or Kubernetes with Services, Ingress or Gateway resources, or service meshes, the workflow remains the same: build with Podman, deploy the canary, monitor health, and either promote or rollback. Automated health checks are essential for making this process reliable and fast.
