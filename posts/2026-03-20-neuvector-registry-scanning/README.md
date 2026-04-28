# How to Configure NeuVector Registry Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Registry Scanning, Container Security, Vulnerability Management, Kubernetes

Description: Configure NeuVector to automatically scan container registries for vulnerabilities across all stored images on a scheduled basis.

## Introduction

Registry scanning in NeuVector allows you to periodically scan all images stored in your container registries - not just the ones currently running. This gives you a complete inventory of vulnerabilities across your entire image library, enabling proactive remediation before images are deployed.

## Prerequisites

- NeuVector with Scanner component running
- Access credentials for your container registries
- NeuVector Manager access

## Step 1: Configure Registry Credentials

### Add Docker Hub Registry

In the NeuVector UI:
1. Go to **Assets** > **Registries**
2. Click **Add Registry**
3. Fill in the form:

```text
Name: dockerhub
Registry: https://registry-1.docker.io
Username: your-dockerhub-username
Password: your-dockerhub-token
Scan Layers: Enabled
Rescan After CVE DB Update: Enabled
```

Via API:

```bash
# Add Docker Hub registry

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "dockerhub",
      "registry_type": "Docker Registry",
      "registry": "https://registry-1.docker.io",
      "username": "your-username",
      "password": "your-token",
      "scan_layers": true,
      "rescan_after_db_update": true,
      "cfg_type": "user"
    }
  }'
```

### Add Private Registry (e.g., Harbor)

```bash
# Add private Harbor registry
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-prod",
      "registry_type": "Harbor Registry",
      "registry": "https://harbor.company.com",
      "username": "scan-robot",
      "password": "robot-token",
      "filters": ["production/*", "staging/*"],
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {
        "schedule": "periodical",
        "interval": 86400
      },
      "cfg_type": "user"
    }
  }'
```

### Add Amazon ECR Registry

```bash
# Add AWS ECR registry (uses IAM access keys)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "aws-ecr",
      "registry_type": "Amazon ECR Registry",
      "registry": "https://123456789.dkr.ecr.us-east-1.amazonaws.com",
      "aws_key": {
        "id": "ecr-scan",
        "access_key_id": "AKIAIOSFODNN7EXAMPLE",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        "region": "us-east-1"
      },
      "scan_layers": true,
      "rescan_after_db_update": true,
      "schedule": {
        "schedule": "periodical",
        "interval": 86400
      },
      "cfg_type": "user"
    }
  }'
```

### Add Google Artifact Registry

```bash
# Add Google Artifact Registry (uses a service account JSON key)
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "$(jq -n \
        --arg key "$(cat /path/to/service-account.json)" \
        '{
          config: {
            name: "google-gar",
            registry_type: "Google Container Registry",
            registry: "https://us-central1-docker.pkg.dev",
            gcr_key: { json_key: $key },
            filters: ["my-project/production/*"],
            scan_layers: true,
            rescan_after_db_update: true,
            cfg_type: "user"
          }
        }')"
```

## Step 2: Configure Scan Filters

Use filters to control which repositories and tags are scanned:

```bash
# Update registry with specific filters
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-prod",
      "registry_type": "Harbor Registry",
      "filters": [
        "production/myapp:*",
        "production/nginx:*",
        "staging/myapp:latest"
      ]
    }
  }'
```

## Step 3: Schedule Automatic Scans

Configure scan schedules:

The `schedule` field accepts `manual`, `auto` (scan every image as soon as it is detected), or `periodical` (rescan on a fixed interval). For `periodical`, `interval` is in seconds and must be between 300 (5 minutes) and 604800 (7 days).

```bash
# Schedule periodical scans every 24 hours
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-prod",
      "registry_type": "Harbor Registry",
      "schedule": {
        "schedule": "periodical",
        "interval": 86400
      }
    }
  }'

# Schedule periodical scans every 7 days
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-prod",
      "registry_type": "Harbor Registry",
      "schedule": {
        "schedule": "periodical",
        "interval": 604800
      }
    }
  }'
```

## Step 4: Trigger a Manual Scan

```bash
# Start a manual scan of a registry
curl -sk -X POST \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod/scan" \
  -H "X-Auth-Token: ${TOKEN}"

# Check scan status (response is wrapped in a "summary" object)
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    name: .summary.name,
    status: .summary.status,
    scanned: .summary.scanned,
    scheduled: .summary.scheduled,
    scanning: .summary.scanning,
    failed: .summary.failed
  }'
```

## Step 5: View Registry Scan Results

```bash
# Get scan results for all images in a registry
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod/images" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.images[] | {
    image_id: .image_id,
    repository: .repository,
    tag: .tag,
    critical: .critical,
    high: .high,
    medium: .medium,
    scanned_at: .scanned_at
  }'
```

In the UI:
1. Go to **Assets** > **Registries**
2. Click a registry name to see all scanned images
3. Click an image to view detailed vulnerability report

## Step 6: Export Registry Scan Report

```bash
# Export all high and critical CVEs from a registry
curl -sk \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod/images" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.images[] |
    .repository + ":" + .tag + "," +
    (.critical|tostring) + "," +
    (.high|tostring) + "," +
    (.medium|tostring)' | \
  awk 'BEGIN {print "Image,Critical,High,Medium"} {print}' > registry-scan-summary.csv
```

## Step 7: Configure Rescan on CVE Database Update

Enable automatic rescanning when the CVE database is updated:

```bash
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/harbor-prod" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "name": "harbor-prod",
      "registry_type": "Harbor Registry",
      "rescan_after_db_update": true
    }
  }'
```

## Conclusion

Registry scanning gives you a complete picture of vulnerabilities across all your stored images, not just those currently running. By scheduling regular scans with automatic rescan on CVE database updates, you ensure that images are continuously evaluated against the latest threat intelligence. Use registry scan results to prioritize image updates, remove outdated images, and prevent vulnerable images from being used in new deployments.
