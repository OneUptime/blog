# How to Integrate NeuVector with CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, CI/CD, DevSecOps, Vulnerability Scanning, Kubernetes

Description: Integrate NeuVector into GitHub Actions, GitLab CI, Jenkins, and other CI/CD pipelines to shift container security left and prevent vulnerable images from reaching production.

## Introduction

Integrating NeuVector into your CI/CD pipeline creates automated security gates that evaluate every container image before deployment. This "shift left" approach catches vulnerabilities at build time rather than at runtime, reducing the cost and risk of security issues. This guide covers integration patterns for major CI/CD platforms.

## Integration Points

NeuVector can be integrated at multiple pipeline stages:

1. **Build stage**: Scan images immediately after building
2. **Registry push gate**: Scan before pushing to registry
3. **Deploy gate**: Scan before Kubernetes deployment
4. **Runtime**: Admission control as a final safety net

## Prerequisites

- NeuVector with Scanner running and accessible from CI
- CI/CD platform of your choice
- Registry for storing images

## Step 1: Create a CI/CD Service Account

```bash
# Create dedicated CI/CD user with minimal permissions

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/user" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${ADMIN_TOKEN}" \
  -d '{
    "user": {
      "fullname": "ci-pipeline",
      "password": "CIPipelineSecure456!",
      "role": "ciops",
      "timeout": 300
    }
  }'
```

## Step 2: Reusable Scan Script

Create a reusable scan script for any CI system:

```bash
#!/bin/bash
# neuvector-scan.sh
# Usage: ./neuvector-scan.sh <image:tag> <max-critical> <max-high>

IMAGE="${1}"
MAX_CRITICAL="${2:-0}"
MAX_HIGH="${3:-5}"

# Split <repository>:<tag> for the NeuVector API, which requires the
# repository and tag as separate fields.
REPOSITORY="${IMAGE%:*}"
TAG="${IMAGE##*:}"

NV_URL="${NEUVECTOR_URL}"
NV_USER="${NEUVECTOR_USER:-ci-pipeline}"
NV_PASS="${NEUVECTOR_PASSWORD}"

# Authenticate
TOKEN=$(curl -sk -X POST \
  "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASS}\"}}" \
  | jq -r '.token.token')

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "ERROR: Failed to authenticate with NeuVector"
  exit 1
fi

echo "Scanning image: ${IMAGE}"

# Submit scan request. POST /v1/scan/repository is a long-poll request that
# returns the scan report synchronously in the response body.
SCAN_RESULT=$(curl -sk -X POST \
  "${NV_URL}/v1/scan/repository" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "{
    \"request\": {
      \"repository\": \"${REPOSITORY}\",
      \"tag\": \"${TAG}\",
      \"registry\": \"${REGISTRY_URL}\",
      \"username\": \"${REGISTRY_USER}\",
      \"password\": \"${REGISTRY_PASSWORD}\"
    }
  }")

# Parse results
CRITICAL=$(echo "${SCAN_RESULT}" | jq '[.report.vulnerabilities[] | select(.severity=="Critical")] | length // 0')
HIGH=$(echo "${SCAN_RESULT}" | jq '[.report.vulnerabilities[] | select(.severity=="High")] | length // 0')
MEDIUM=$(echo "${SCAN_RESULT}" | jq '[.report.vulnerabilities[] | select(.severity=="Medium")] | length // 0')
LOW=$(echo "${SCAN_RESULT}" | jq '[.report.vulnerabilities[] | select(.severity=="Low")] | length // 0')

echo ""
echo "=== Vulnerability Scan Results ==="
echo "Image: ${IMAGE}"
echo "Critical: ${CRITICAL}"
echo "High:     ${HIGH}"
echo "Medium:   ${MEDIUM}"
echo "Low:      ${LOW}"
echo "=================================="

# Evaluate policy
PASS=true

if [ "${CRITICAL}" -gt "${MAX_CRITICAL}" ]; then
  echo "FAILED: ${CRITICAL} critical CVEs found (max allowed: ${MAX_CRITICAL})"
  PASS=false
fi

if [ "${HIGH}" -gt "${MAX_HIGH}" ]; then
  echo "FAILED: ${HIGH} high CVEs found (max allowed: ${MAX_HIGH})"
  PASS=false
fi

if [ "${PASS}" = "true" ]; then
  echo "PASSED: Image meets security requirements"
  exit 0
else
  echo "FAILED: Image does not meet security requirements"
  exit 1
fi
```

## Step 3: GitHub Actions Integration

```yaml
# .github/workflows/container-security.yml
name: Container Security Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-scan-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image
        uses: docker/build-push-action@v5
        with:
          context: .
          load: true
          tags: ${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Run NeuVector scan
        id: scan
        env:
          NEUVECTOR_URL: ${{ secrets.NEUVECTOR_URL }}
          NEUVECTOR_PASSWORD: ${{ secrets.NEUVECTOR_PASSWORD }}
        run: |
          chmod +x ./neuvector-scan.sh
          ./neuvector-scan.sh \
            "${{ env.IMAGE_NAME }}:${{ github.sha }}" \
            0 \
            5

      - name: Login to registry
        if: github.ref == 'refs/heads/main' && steps.scan.outcome == 'success'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push image
        if: github.ref == 'refs/heads/main' && steps.scan.outcome == 'success'
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

## Step 4: GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - build
  - security-scan
  - push
  - deploy

variables:
  NEUVECTOR_URL: "https://neuvector.company.com"
  MAX_CRITICAL: "0"
  MAX_HIGH: "5"

build:
  stage: build
  script:
    - docker build -t $CI_PROJECT_NAME:$CI_COMMIT_SHA .

security-scan:
  stage: security-scan
  image: curlimages/curl:latest
  script:
    - |
      TOKEN=$(curl -sk -X POST "${NEUVECTOR_URL}/v1/auth" \
        -H "Content-Type: application/json" \
        -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASSWORD}\"}}" \
        | jq -r '.token.token')

      RESULT=$(curl -sk -X POST "${NEUVECTOR_URL}/v1/scan/repository" \
        -H "Content-Type: application/json" \
        -H "X-Auth-Token: ${TOKEN}" \
        -d "{\"request\":{\"repository\":\"$CI_PROJECT_NAME\",\"tag\":\"$CI_COMMIT_SHA\",\"registry\":\"$CI_REGISTRY\",\"username\":\"$CI_REGISTRY_USER\",\"password\":\"$CI_REGISTRY_PASSWORD\"}}")

      CRITICAL=$(echo "$RESULT" | jq '[.report.vulnerabilities[] | select(.severity=="Critical")] | length')
      HIGH=$(echo "$RESULT" | jq '[.report.vulnerabilities[] | select(.severity=="High")] | length')

      echo "Critical: $CRITICAL, High: $HIGH"

      if [ "$CRITICAL" -gt "$MAX_CRITICAL" ] || [ "$HIGH" -gt "$MAX_HIGH" ]; then
        echo "Security gate FAILED"
        exit 1
      fi
      echo "Security gate PASSED"
  artifacts:
    when: always
    paths:
      - scan-results.json

push:
  stage: push
  needs: ["security-scan"]
  only:
    - main
  script:
    - docker tag $CI_PROJECT_NAME:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Step 5: Tekton Pipeline Integration

```yaml
# tekton-nv-scan-task.yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: neuvector-image-scan
spec:
  params:
    - name: repository
      description: Image repository to scan (e.g. library/nginx)
    - name: tag
      description: Image tag to scan (e.g. 1.24)
    - name: registry
      description: Registry URL
      default: "https://registry-1.docker.io/"
    - name: max-critical
      default: "0"
    - name: max-high
      default: "5"
  steps:
    - name: scan
      image: curlimages/curl:latest
      script: |
        #!/bin/sh
        TOKEN=$(curl -sk -X POST \
          "${NEUVECTOR_URL}/v1/auth" \
          -H "Content-Type: application/json" \
          -d "{\"password\":{\"username\":\"ci-pipeline\",\"password\":\"${NEUVECTOR_PASSWORD}\"}}" \
          | jq -r '.token.token')

        RESULT=$(curl -sk -X POST \
          "${NEUVECTOR_URL}/v1/scan/repository" \
          -H "Content-Type: application/json" \
          -H "X-Auth-Token: ${TOKEN}" \
          -d "{\"request\":{\"repository\":\"$(params.repository)\",\"tag\":\"$(params.tag)\",\"registry\":\"$(params.registry)\"}}")

        CRITICAL=$(echo "${RESULT}" | jq '[.report.vulnerabilities[] | select(.severity=="Critical")] | length')

        if [ "${CRITICAL}" -gt "$(params.max-critical)" ]; then
          echo "Scan FAILED: ${CRITICAL} critical CVEs"
          exit 1
        fi
        echo "Scan PASSED"
      env:
        - name: NEUVECTOR_URL
          valueFrom:
            secretKeyRef:
              name: neuvector-scan-credentials
              key: url
        - name: NEUVECTOR_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neuvector-scan-credentials
              key: password
```

## Conclusion

Integrating NeuVector into CI/CD pipelines creates an automated security checkpoint that scales with your development team. By scanning images at build time and failing pipelines on policy violations, you create a culture where security is a shared responsibility built into the delivery process. Combined with NeuVector's runtime admission control, you have defense in depth - catching vulnerabilities both before deployment and as a last resort at runtime.
