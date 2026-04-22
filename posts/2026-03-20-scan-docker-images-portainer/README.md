# How to Scan Docker Images for Vulnerabilities via Portainer - Docker Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Vulnerability Scanning, Container Security, DevSecOps

Description: Integrate vulnerability scanning into your Portainer workflow using Trivy, Grype, and Docker Scout to identify CVEs in container images before and after deployment.

## Introduction

Container images bundle an OS, runtime, and application libraries - any of which may contain known CVEs. Scanning images before deployment prevents shipping vulnerable software to production. This guide covers using Trivy, Grype, and Docker Scout to scan images in your Portainer environment, with automation patterns for CI/CD pipelines.

## Step 1: Scan Images with Trivy

Trivy is the most popular open-source container vulnerability scanner:

```bash
# Install Trivy

curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Scan a Docker image
trivy image nginx:alpine

# Scan with severity filter (only show HIGH and CRITICAL)
trivy image --severity HIGH,CRITICAL nginx:alpine

# Scan and output JSON for programmatic processing
trivy image --format json --output results.json nginx:alpine

# Scan a locally built image before pushing
docker build -t myapp:latest .
trivy image myapp:latest

# Fail if HIGH or CRITICAL vulnerabilities exist (for CI/CD)
trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest
echo "Exit code: $?"  # Non-zero if vulnerabilities found
```

## Step 2: Run Trivy as a Container

```bash
# Run Trivy without installing it locally
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $HOME/.trivy/cache:/root/.cache \
  aquasec/trivy:latest \
  image --severity HIGH,CRITICAL nginx:alpine

# Scan all running containers
docker ps --format "{{.Image}}" | sort -u | while read img; do
  echo "=== Scanning: $img ==="
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:latest \
    image --severity HIGH,CRITICAL "$img" 2>&1 | tail -5
done
```

## Step 3: Deploy Trivy as a Persistent Scanner in Portainer

```yaml
# docker-compose.yml - Trivy server for team use
services:
  trivy-server:
    image: aquasec/trivy:latest
    container_name: trivy_server
    restart: unless-stopped
    command: ["server", "--listen", "0.0.0.0:4954"]
    volumes:
      - trivy_cache:/root/.cache
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "4954:4954"
    environment:
      - TRIVY_CACHE_DIR=/root/.cache

  # Scheduled scanner - scans configured images daily
  trivy-cron:
    image: aquasec/trivy:latest
    container_name: trivy_cron
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - trivy_cache:/root/.cache
      - ./scan-results:/results
    environment:
      - TRIVY_CACHE_DIR=/root/.cache
      - IMAGES=nginx:alpine myapp/api:latest
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        while true; do
          echo "Starting daily scan at $(date)"
          for img in $IMAGES; do
            echo "Scanning $img..."
            trivy image --format json --output /results/$(echo $img | tr '/:' '--').json \
              --severity HIGH,CRITICAL "$img"
          done
          echo "Scan complete. Sleeping 24h..."
          sleep 86400
        done

volumes:
  trivy_cache:
```

## Step 4: Scan with Grype (Alternative Scanner)

```bash
# Install Grype
curl -sSfL https://get.anchore.io/grype | sudo sh -s -- -b /usr/local/bin

# Scan an image
grype nginx:alpine

# Fail if high or critical vulnerabilities exist
grype nginx:alpine --fail-on high

# Compare two image versions to see new vulnerabilities
grype myapp:1.0 > scan_v1.txt
grype myapp:2.0 > scan_v2.txt
diff scan_v1.txt scan_v2.txt
```

## Step 5: Docker Scout (Built-in Docker Scanning)

```bash
# Docker Scout is integrated into Docker Desktop and CLI
# Quick vulnerability overview
docker scout quickview myapp:latest

# Detailed CVE list
docker scout cves myapp:latest

# Get recommendations for base image upgrades
docker scout recommendations myapp:latest

# Compare with previous version
docker scout compare --to myapp:previous myapp:latest

# Policy evaluation (fails if policy violated)
docker scout policy --exit-code myapp:latest
```

## Step 6: Automate Scanning in CI/CD with Portainer Webhooks

```bash
#!/bin/bash
# scan-and-deploy.sh - Scan before deploying to Portainer

IMAGE="myapp/api:${BUILD_TAG}"
PORTAINER_WEBHOOK="https://portainer.example.com/api/stacks/webhooks/abc123"
SEVERITY_THRESHOLD="CRITICAL"

echo "Building image: $IMAGE"
docker build -t "$IMAGE" .

echo "Scanning for vulnerabilities..."
trivy image \
  --exit-code 1 \
  --severity "$SEVERITY_THRESHOLD" \
  --no-progress \
  "$IMAGE"

SCAN_EXIT=$?

if [ $SCAN_EXIT -ne 0 ]; then
  echo "FAILED: Critical vulnerabilities found. Deployment blocked."
  exit 1
fi

echo "Scan passed. Pushing image..."
docker push "$IMAGE"

echo "Triggering Portainer deployment..."
curl -s -X POST "$PORTAINER_WEBHOOK"

echo "Deployment triggered successfully."
```

## Conclusion

Vulnerability scanning should happen at every stage: during development, in CI/CD pipelines, and periodically on running images. Trivy's `--exit-code 1` flag makes it easy to fail builds with critical vulnerabilities. Running Trivy as a persistent service in Portainer gives your team a shared vulnerability database endpoint without requiring each client to download and maintain its own database. Regular scheduled scans catch newly published CVEs in images that were clean when originally deployed, ensuring your running containers stay secure over time.
