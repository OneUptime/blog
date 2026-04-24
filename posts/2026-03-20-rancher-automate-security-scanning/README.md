# How to Automate Security Scanning in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Security-scanning, CIS, NeuVector, Trivy, Automation

Description: A guide to automating container image scanning, CIS benchmark scanning, and runtime security monitoring in Rancher environments.

## Overview

Security scanning in Rancher environments encompasses multiple dimensions: container image vulnerability scanning in CI/CD pipelines, CIS benchmark compliance scanning for cluster configurations, and runtime security monitoring for threats. Automating these scans provides continuous security assurance and helps teams catch vulnerabilities before they reach production. This guide covers setting up automated security scanning across all layers.

## Level 1: Image Vulnerability Scanning

### Trivy in CI/CD Pipelines

```yaml
# GitHub Actions: Scan images on every push

name: Security Scan
on: [push, pull_request]

jobs:
  image-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy vulnerability scan
        uses: aquasecurity/trivy-action@0.36.0
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'    # Fail build on critical/high CVEs

      - name: Upload Trivy scan results to GitHub Security
        uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

### NeuVector Image Scanning in CI/CD

```bash
#!/bin/bash
# neuvector-scan.sh - Scan an image with the NeuVector controller REST API
set -euo pipefail

CONTROLLER="${NEUVECTOR_URL:?Set NEUVECTOR_URL to https://<controller>:10443}"
USERNAME="${NEUVECTOR_USER:-admin}"
PASSWORD="${NEUVECTOR_PASS:?Set NEUVECTOR_PASS}"
IMAGE="${1:?Usage: $0 <repository> <tag> [registry] }"
TAG="${2:?Usage: $0 <repository> <tag> [registry] }"
REGISTRY="${3:-https://registry.example.com/}"
REGISTRY_USERNAME="${REGISTRY_USERNAME:-}"
REGISTRY_PASSWORD="${REGISTRY_PASSWORD:-}"
BASE_IMAGE="${BASE_IMAGE:-}"

AUTH_PAYLOAD=$(jq -n \
  --arg user "${USERNAME}" \
  --arg pass "${PASSWORD}" \
  '{password: {username: $user, password: $pass}}')

TOKEN=$(curl -s -k \
  -H "Content-Type: application/json" \
  -d "${AUTH_PAYLOAD}" \
  "${CONTROLLER}/v1/auth" | jq -r '.token.token')

trap 'if [ -n "${TOKEN:-}" ]; then curl -s -k -X DELETE -H "X-Auth-Token: ${TOKEN}" "${CONTROLLER}/v1/auth" >/dev/null; fi' EXIT

SCAN_PAYLOAD=$(jq -n \
  --arg source "github" \
  --arg user "${GITHUB_ACTOR:-ci}" \
  --arg job "${GITHUB_JOB:-image-scan}" \
  --arg workspace "${GITHUB_WORKSPACE:-$(pwd)}" \
  --arg function "image-scan" \
  --arg region "global" \
  --arg registry "${REGISTRY}" \
  --arg registryUser "${REGISTRY_USERNAME}" \
  --arg registryPassword "${REGISTRY_PASSWORD}" \
  --arg repository "${IMAGE}" \
  --arg tag "${TAG}" \
  --arg baseImage "${BASE_IMAGE}" \
  '{
    request: {
      metadata: {
        source: $source,
        user: $user,
        job: $job,
        workspace: $workspace,
        function: $function,
        region: $region
      },
      registry: $registry,
      username: $registryUser,
      password: $registryPassword,
      repository: $repository,
      tag: $tag,
      scan_layers: false,
      base_image: $baseImage
    }
  }')

RESULT=$(curl -s -k \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "${SCAN_PAYLOAD}" \
  "${CONTROLLER}/v1/scan/repository")

CRITICAL=$(echo "${RESULT}" | jq '[.report.vulnerabilities[]? | select(.severity == "Critical")] | length')
HIGH=$(echo "${RESULT}" | jq '[.report.vulnerabilities[]? | select(.severity == "High")] | length')

echo "Scan complete: Critical=${CRITICAL}, High=${HIGH}"

if [ "${CRITICAL}" -gt 0 ] || [ "${HIGH}" -gt 5 ]; then
  echo "FAIL: Too many vulnerabilities (Critical: ${CRITICAL}, High: ${HIGH})"
  exit 1
fi
```

## Level 2: CIS Benchmark Scanning

### Automated CIS Scans with Rancher

```yaml
# Schedule a weekly CIS benchmark scan
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-compliance-scan
spec:
  scanProfileName: cis-1.10-profile
  scheduledScanConfig:
    cronSchedule: "0 2 * * 0"   # Sunday 2 AM
    retentionCount: 12          # Keep 12 weeks of reports
```

### Export CIS Scan Results

```bash
#!/bin/bash
# export-compliance-report.sh - Export and send Rancher compliance scan results
set -euo pipefail

SCAN_NAME=$(
  kubectl get clusterscans.compliance.cattle.io \
    --sort-by=.status.lastRunTimestamp \
    -o name | tail -n 1 | cut -d/ -f2
)

if [ -z "${SCAN_NAME}" ]; then
  echo "FAIL: No compliance scans found"
  exit 1
fi

SCAN_JSON=$(kubectl get clusterscans.compliance.cattle.io "${SCAN_NAME}" -o json)
LAST_RUN_TIMESTAMP=$(echo "${SCAN_JSON}" | jq -r '.status.lastRunTimestamp')

PASS=$(echo "${SCAN_JSON}" | jq -r '.status.summary.pass')
FAIL=$(echo "${SCAN_JSON}" | jq -r '.status.summary.fail')
WARN=$(echo "${SCAN_JSON}" | jq -r '.status.summary.warn')
TOTAL=$(echo "${SCAN_JSON}" | jq -r '.status.summary.total')

echo "Compliance Scan Results for ${SCAN_NAME}: Pass=${PASS}, Fail=${FAIL}, Warn=${WARN}, Total=${TOTAL}"

if [ "${TOTAL}" -eq 0 ]; then
  echo "FAIL: The latest compliance scan did not produce any results"
  exit 1
fi

# Calculate pass percentage
PASS_PCT=$(echo "scale=1; ${PASS} * 100 / ${TOTAL}" | bc)

# Alert if pass rate is below 90%
if (( $(echo "${PASS_PCT} < 90" | bc -l) )); then
  curl -X POST "${SLACK_WEBHOOK}" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\":warning: Compliance scan ${SCAN_NAME}: ${PASS_PCT}% pass rate (${FAIL} failures)\"}"
fi

REPORT_NAME=$(
  kubectl get clusterscanreports.compliance.cattle.io -o json \
    | jq -r --arg ts "${LAST_RUN_TIMESTAMP}" '.items[] | select(.spec.lastRunTimestamp == $ts) | .metadata.name' \
    | tail -n 1
)

if [ -z "${REPORT_NAME}" ]; then
  echo "FAIL: No ClusterScanReport matched the latest scan timestamp"
  exit 1
fi

# Export the verbose report JSON from the latest ClusterScanReport
kubectl get clusterscanreports.compliance.cattle.io "${REPORT_NAME}" -o json \
  | jq -r '.spec.reportJSON | fromjson | .actual_value_map_data' \
  | base64 -d | gunzip > "compliance-report-$(date +%Y%m%d).json"
```

## Level 3: Runtime Security with NeuVector

### Automated Policy Learning and Enforcement

NeuVector already supports automatic mode promotion for learned groups, so configure it through the init ConfigMap instead of patching groups with a custom script.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: neuvector-init
  namespace: neuvector   # Use the namespace where NeuVector is installed
data:
  sysinitcfg.yaml: |
    always_reload: true

    # Promote learned groups from Discover to Monitor after 7 days
    Mode_Auto_D2M: true
    Mode_Auto_D2M_Duration: 604800

    # Promote quiet groups from Monitor to Protect after 14 days
    Mode_Auto_M2P: true
    Mode_Auto_M2P_Duration: 1209600
```

## Level 4: Kubernetes Audit Log Analysis

```yaml
# values-k8saudit.yaml for Helm-based Falco deployment
driver:
  enabled: false

collectors:
  enabled: false

controller:
  kind: deployment
  deployment:
    replicas: 1

falcoctl:
  artifact:
    install:
      enabled: true
    follow:
      enabled: true
  config:
    artifact:
      install:
        resolveDeps: true
        refs: [k8saudit-rules:0.5]
      follow:
        refs: [k8saudit-rules:0.5]

services:
  - name: k8saudit-webhook
    type: NodePort
    ports:
      - port: 9765
        nodePort: 30007
        protocol: TCP

falco:
  rules_files:
    - /etc/falco/k8s_audit_rules.yaml
    - /etc/falco/rules.d
  plugins:
    - name: k8saudit
      library_path: libk8saudit.so
      init_config: ""
      open_params: "http://:9765/k8s-audit"
    - name: json
      library_path: libjson.so
      init_config: ""
  load_plugins: [k8saudit, json]
```

## Aggregated Security Dashboard

For Rancher compliance scans, enable Rancher's built-in scan alerting for scheduled runs. The PrometheusRule below covers NeuVector exporter metrics.

```yaml
# PrometheusRule for NeuVector exporter metrics
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: security-scanning-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: security-scanning
      rules:
        - alert: NeuVectorHighImageVulnerability
          expr: sum(nv_image_vulnerabilityHigh) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High-severity vulnerability found in scanned image"
        - alert: NeuVectorHighRunningContainerVulnerability
          expr: sum(nv_container_vulnerabilityHigh) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High-severity vulnerability found in running container"
```

## Conclusion

Automating security scanning in Rancher requires a multi-layered approach: image scanning in CI/CD pipelines catches vulnerabilities before deployment, CIS benchmark scanning ensures cluster configurations meet compliance standards, and runtime security monitoring with NeuVector and Falco detects threats in production. Schedule regular automated scans, integrate results into your monitoring dashboards, and set up alerts for critical findings. Security scanning should be continuous, not a one-time activity.
