# How to Scan Docker Images for Vulnerabilities via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security Scanning, Vulnerability, Docker Images, Trivy, Container Security

Description: Learn how to scan Docker images for known vulnerabilities using Trivy and integrate scanning into your Portainer deployment workflow.

---

Container image scanning identifies known CVEs (Common Vulnerabilities and Exposures) in OS packages and language dependencies before you deploy them. This guide covers on-demand scanning and CI pipeline integration.

## Quick Scan with Trivy

Run Trivy as a Docker container to scan any image without installing it:

```bash
# Scan an image from Docker Hub

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image nginx:latest

# Scan a local image
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image my-app:latest

# Scan and output only HIGH and CRITICAL findings
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity HIGH,CRITICAL nginx:latest
```

## Scanning Before Deployment in CI

Add an image scan step to your pipeline before pushing or deploying:

```bash
#!/bin/bash
# scan-before-deploy.sh

IMAGE="myregistry.example.com/my-app:$IMAGE_TAG"

echo "Scanning $IMAGE for vulnerabilities..."

# Run scan and exit with non-zero code if CRITICAL CVEs are found
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image \
  --exit-code 1 \
  --severity CRITICAL \
  --ignore-unfixed \
  "$IMAGE"

if [ $? -ne 0 ]; then
  echo "CRITICAL vulnerabilities found - blocking deployment"
  exit 1
fi

echo "Scan passed - proceeding with deployment"
curl -X POST "$PORTAINER_WEBHOOK"
```

## Scanning in GitHub Actions

```yaml
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@v0.35.0
  with:
    image-ref: 'ghcr.io/${{ github.repository }}:${{ github.sha }}'
    format: 'table'
    exit-code: '1'
    ignore-unfixed: true
    severity: 'CRITICAL,HIGH'
```

## Scanning a Compose Stack's Images

Scan all images in a stack before deploying:

```bash
#!/bin/bash
# scan-stack.sh docker-compose.yml

COMPOSE_FILE="${1:-docker-compose.yml}"
FAILED=0

# Extract all image names
IMAGES=$(grep -E '^\s+image:' "$COMPOSE_FILE" | awk '{print $2}')

for image in $IMAGES; do
  echo "Scanning: $image"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:latest image \
    --exit-code 1 \
    --severity CRITICAL \
    --ignore-unfixed \
    "$image" || FAILED=$((FAILED + 1))
done

if [ $FAILED -gt 0 ]; then
  echo "$FAILED image(s) have CRITICAL vulnerabilities"
  exit 1
fi

echo "All images passed vulnerability scan"
```

## Generating Scan Reports

Save scan results as JSON or SARIF for security dashboards:

```bash
# JSON report
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/reports":/reports \
  aquasec/trivy:latest image \
  --format json \
  --output /reports/scan-$(date +%Y%m%d).json \
  my-app:latest

# SARIF report for later upload to GitHub code scanning
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd)/reports":/reports \
  aquasec/trivy:latest image \
  --format sarif \
  --output /reports/results.sarif \
  my-app:latest
```

## Ignoring Accepted Vulnerabilities

Create a `.trivyignore` file to acknowledge accepted risk:

```text
# .trivyignore
# Not exploitable in our configuration - review by 2026-06-01
CVE-2023-12345 exp:2026-06-01
# No fix available yet
CVE-2023-67890
```

## Portainer Business Edition Deployment Integration

Portainer Business Edition supports webhook-driven redeployments for stacks and applications, but vulnerability scanning itself remains external to Portainer. Run Trivy before triggering a Portainer webhook or deployment.
