# How to Deploy Trivy as an Image Scanner with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Trivy, Security Scanning, Vulnerability Scanner, Docker, Container Security

Description: Learn how to deploy Trivy as a persistent scanning service with Portainer, providing on-demand image vulnerability scanning via a REST API.

---

Trivy can run as a server, enabling other Trivy clients and scripts to submit images for scanning without downloading the vulnerability database each time. This guide deploys Trivy as a Portainer stack with a persistent vulnerability database cache.

## Stack Definition

Deploy Trivy in server mode:

```yaml
services:
  trivy:
    image: aquasec/trivy:latest
    command: server --listen 0.0.0.0:4954
    ports:
      - "4954:4954"
    volumes:
      - trivy_cache:/root/.cache/trivy
    environment:
      TRIVY_CACHE_DIR: /root/.cache/trivy
      TRIVY_NO_PROGRESS: "true"
    networks:
      - scanner_net

volumes:
  trivy_cache:    # Persistent vulnerability database cache

networks:
  scanner_net:
    driver: bridge
```

## Initial Database Download

On first run, Trivy downloads its vulnerability database automatically and refreshes it in the background. If you want to pre-warm the cache before the first scan:

```bash
# Trigger database download

docker exec -it $(docker ps -qf name=trivy) \
  trivy server --download-db-only

# Verify the server and database metadata
curl -s http://localhost:4954/version | jq .
```

## Scanning Images via Trivy Client/Server Mode

Use a Trivy client to scan images through the server:

```bash
# Scan an image through the server
trivy image --server http://localhost:4954 --scanners vuln --format json nginx:latest | jq .

# Scan with severity filter
trivy image --server http://localhost:4954 --scanners vuln --severity CRITICAL,HIGH --format json python:3.11-alpine | \
  jq '[.Results[]?.Vulnerabilities[]?] | length'
```

## Automated Scanning Script

Scan images from a Portainer stack before deployment:

```bash
#!/bin/bash
# scan-with-trivy-server.sh <image>

IMAGE="${1:?Usage: $0 <image>}"
TRIVY_URL="${TRIVY_URL:-http://localhost:4954}"

echo "Scanning: $IMAGE"

RESULT=$(trivy image --server "$TRIVY_URL" --scanners vuln --format json "$IMAGE")

CRITICAL_COUNT=$(echo "$RESULT" | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length')
HIGH_COUNT=$(echo "$RESULT" | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity=="HIGH")] | length')

echo "CRITICAL: $CRITICAL_COUNT, HIGH: $HIGH_COUNT"

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "Blocking deployment - CRITICAL vulnerabilities found:"
  echo "$RESULT" | jq '.Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL") | {ID: .VulnerabilityID, Title: .Title, Package: .PkgName}'
  exit 1
fi

echo "Scan passed"
exit 0
```

## Scheduling Regular Scans

Run daily scans on all deployed images:

```bash
#!/bin/bash
# daily-scan.sh - scan all running container images

TRIVY_URL="http://localhost:4954"
REPORT_DIR="/var/reports/trivy"
mkdir -p "$REPORT_DIR"
DATE=$(date +%Y%m%d)

docker ps --format '{{.Image}}' | sort -u | while read image; do
  safe_name="${image//\//-}"
  echo "Scanning: $image"
  trivy image --server "$TRIVY_URL" --scanners vuln --format json "$image" \
    > "$REPORT_DIR/$safe_name-$DATE.json"
done

# Alert if any CRITICAL CVEs found
CRITICAL_TOTAL=$(cat "$REPORT_DIR/"*-"$DATE.json" | \
  jq -s '[.[].Results[]?.Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length')

if [ "$CRITICAL_TOTAL" -gt 0 ]; then
  echo "Alert: $CRITICAL_TOTAL CRITICAL CVEs found in deployed images"
  # Send to OneUptime, Slack, or email
fi
```

## Trivy Operator for Kubernetes

For Kubernetes environments managed via Portainer, deploy the Trivy Operator for continuous background scanning:

```bash
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/trivy-operator/v0.30.1/deploy/static/trivy-operator.yaml
```

Trivy Operator automatically scans new Pods and populates `VulnerabilityReport` custom resources, which Portainer Business Edition admins can inspect under the Custom Resource view.
