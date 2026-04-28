# How to Configure NeuVector Scanner

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Kubernetes, Container Security, Vulnerability Scanning, Scanner

Description: Learn how to configure the NeuVector Scanner component for automated vulnerability detection in container images and registries.

## Introduction

The NeuVector Scanner is the component responsible for detecting vulnerabilities in container images. It uses regularly updated CVE databases to scan images in registries, running containers, and admission control checks. Proper configuration ensures accurate, up-to-date scanning with minimal resource impact.

## Prerequisites

- NeuVector installed and running
- Access to NeuVector Manager UI or REST API
- Images stored in accessible registries

## Understanding the Scanner Architecture

NeuVector's scanning infrastructure consists of:

- **Scanner Pods**: Perform the actual image analysis
- **Updater CronJob**: Fetches and updates the CVE database
- **Controller**: Coordinates scan requests and stores results

## Step 1: Configure Scanner Replicas

For production environments, run multiple scanner replicas to handle concurrent scan requests:

```yaml
# scanner-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: neuvector-scanner-pod
  namespace: neuvector
spec:
  replicas: 3  # Increase for higher throughput
  selector:
    matchLabels:
      app: neuvector-scanner-pod
  template:
    metadata:
      labels:
        app: neuvector-scanner-pod
    spec:
      containers:
        - name: neuvector-scanner-pod
          image: neuvector/scanner:latest
          imagePullPolicy: Always
          env:
            - name: CLUSTER_JOIN_ADDR
              value: neuvector-svc-controller.neuvector
          resources:
            requests:
              cpu: "200m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "2Gi"
```

```bash
kubectl apply -f scanner-deployment.yaml
```

## Step 2: Configure the CVE Database Updater

The updater keeps the vulnerability database current. Configure it as a CronJob:

```yaml
# scanner-updater.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-updater-pod
  namespace: neuvector
spec:
  # Run daily at midnight
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: neuvector-updater
              image: neuvector/updater:latest
              imagePullPolicy: Always
              env:
                - name: CLUSTER_JOIN_ADDR
                  value: neuvector-svc-controller.neuvector
          restartPolicy: Never
```

```bash
kubectl apply -f scanner-updater.yaml

# Trigger an immediate update
kubectl create job --from=cronjob/neuvector-updater-pod manual-update -n neuvector
```

## Step 3: Configure Auto-Scan Settings via the UI

1. Log in to the NeuVector Manager UI
2. Navigate to **Assets** > **Registries** or **Policy** > **Admission Control**
3. Click **Configuration** in the top menu
4. Under **Scanning**, configure:

```text
Auto-Scan New Images: Enabled
Scan Secrets: Enabled
Scan Layers: Enabled
CVE Score Threshold: 7.0 (High)
```

## Step 4: Configure Scanner via REST API

Use the NeuVector REST API to configure scanner settings programmatically:

```bash
# Authenticate and get a token
TOKEN=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

# Configure auto-scan settings
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "auto_scan": true,
      "enable_auto_scan_workload": true,
      "enable_auto_scan_host": true
    }
  }'
```

## Step 5: Set Up Scanner Resource Limits

For large clusters, tune scanner resources based on your workload:

```bash
# Scale the scanner deployment
kubectl scale deployment neuvector-scanner-pod \
  --replicas=5 \
  -n neuvector

# Update resource limits
kubectl patch deployment neuvector-scanner-pod \
  -n neuvector \
  --patch '{
    "spec": {
      "template": {
        "spec": {
          "containers": [{
            "name": "neuvector-scanner-pod",
            "resources": {
              "limits": {
                "cpu": "2000m",
                "memory": "4Gi"
              }
            }
          }]
        }
      }
    }
  }'
```

## Step 6: Configure Unused Group Aging

Configure how long unused groups are retained before being aged out (in hours, range 0-168):

```bash
# Set unused group aging via API
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/system/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "unused_group_aging": 24
    }
  }'
```

## Step 7: Monitor Scanner Performance

Track scanner health and throughput:

```bash
# Check scanner pod logs
kubectl logs -n neuvector -l app=neuvector-scanner-pod --tail=100

# Check updater job status
kubectl get jobs -n neuvector

# View updater cronjob history
kubectl get cronjob neuvector-updater-pod -n neuvector
```

## Step 8: Verify CVE Database Version

Confirm the scanner is using an up-to-date CVE database:

```bash
# Check scanner status via API
curl -sk \
  "https://neuvector-manager:8443/v1/scan/scanner" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.scanners[].cvedb_version'
```

## Conclusion

Proper scanner configuration is the foundation of an effective container security posture with NeuVector. By running multiple scanner replicas, keeping the CVE database current, and enabling auto-scan, you ensure that every image deployed to your cluster is checked against the latest known vulnerabilities. Combine scanner results with admission control to block vulnerable images before they reach production.
