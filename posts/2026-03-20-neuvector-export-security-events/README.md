# How to Export NeuVector Security Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Security Events, Export, SIEM, Compliance

Description: Learn how to export NeuVector security events using the REST API, syslog, and webhooks for SIEM integration, compliance reporting, and forensic analysis.

## Introduction

Exporting security events from NeuVector is essential for compliance reporting, forensic analysis, and SIEM integration. NeuVector stores security events, audit logs, and compliance findings that can be exported through the REST API. This guide covers the REST API for on-demand export and automation scripts for scheduled exports.

## Event Types Available

NeuVector tracks these event categories:

| Category | Description |
|---|---|
| Security Events | Process, network, and file violations |
| Vulnerabilities | CVE scan results |
| Compliance | Benchmark check results |
| Audit | User actions and config changes |
| Incidents | Correlated threat incidents |
| Risk Reports | Risk assessment summaries |

## Prerequisites

- NeuVector running with Manager access
- Authentication token with at least Reader role
- Storage destination (S3, local storage, SIEM, etc.)

## Step 1: Export Security Events via REST API

```bash
#!/bin/bash
# export-security-events.sh

NV_URL="https://neuvector-manager:8443"
NV_USER="admin"
NV_PASS="yourpassword"

# Authenticate

TOKEN=$(curl -sk -X POST \
  "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASS}\"}}" \
  | jq -r '.token.token')

# Export security events (paginated)
PAGE_SIZE=100
START=0
ALL_EVENTS=()

while true; do
  RESPONSE=$(curl -sk \
    "${NV_URL}/v1/log/event?start=${START}&limit=${PAGE_SIZE}&category=security" \
    -H "X-Auth-Token: ${TOKEN}")

  COUNT=$(echo "${RESPONSE}" | jq '.events | length')
  echo "Fetched ${COUNT} events starting at ${START}"

  if [ "${COUNT}" -eq "0" ]; then
    break
  fi

  echo "${RESPONSE}" | jq '.events[]' >> events-export.jsonl
  START=$((START + PAGE_SIZE))

  # Stop if we got fewer than page size (last page)
  if [ "${COUNT}" -lt "${PAGE_SIZE}" ]; then
    break
  fi
done

echo "Export complete. Total events saved to events-export.jsonl"
```

## Step 2: Export Events with Time Filtering

```bash
# Export events from the last 24 hours
NOW=$(date +%s)
YESTERDAY=$((NOW - 86400))

curl -sk \
  "${NV_URL}/v1/log/event?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --argjson since "${YESTERDAY}" \
    '[.events[] | select(.reported_timestamp >= $since)]' \
  > last-24h-events.json

echo "Events from last 24 hours exported"
```

## Step 3: Export Vulnerability Reports

```bash
# Export per-workload vulnerability summary (high/medium counts come from scan_summary)
curl -sk \
  "${NV_URL}/v1/workload" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.workloads[] | {
    name: .display_name,
    namespace: .domain,
    image: .image,
    high: .scan_summary.high,
    medium: .scan_summary.medium,
    scanned_at: .scan_summary.scanned_at
  }]' > vulnerability-export.json

# Export detailed CVE list by iterating over each workload
echo "Container,Namespace,CVE,Severity,Score,Package,Fixed Version" > cve-export.csv

curl -sk "${NV_URL}/v1/workload" -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.workloads[] | [.id, .display_name, .domain] | @tsv' | \
  while IFS=$'\t' read -r WL_ID WL_NAME WL_NS; do
    curl -sk "${NV_URL}/v1/scan/workload/${WL_ID}" \
      -H "X-Auth-Token: ${TOKEN}" | \
      jq -r --arg name "${WL_NAME}" --arg ns "${WL_NS}" \
        '.report.vulnerabilities[]? |
         [$name, $ns, .name, .severity, (.score_v3|tostring), .package_name, .fixed_version] |
         @csv' >> cve-export.csv
  done
```

## Step 4: Export Compliance Reports

```bash
# Export Kubernetes compliance check results for every host
echo "Host,Check ID,Description,Level,Remediation" > compliance-export.csv

curl -sk "${NV_URL}/v1/host" -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.hosts[] | [.id, .name] | @tsv' | \
  while IFS=$'\t' read -r HOST_ID HOST_NAME; do
    curl -sk "${NV_URL}/v1/bench/host/${HOST_ID}/kubernetes" \
      -H "X-Auth-Token: ${TOKEN}" | \
      jq -r --arg host "${HOST_NAME}" \
        '.items[]? |
         select(.level != "PASS") |
         [$host, .test_number, .description, .level, .remediation] |
         @csv' >> compliance-export.csv
  done
```

## Step 5: Export Audit Logs

```bash
# Export the audit log
curl -sk \
  "${NV_URL}/v1/log/audit?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.audits[] | {
    timestamp: .reported_at,
    name: .name,
    level: .level,
    user: .user,
    host: .host_name,
    workload: .workload_name,
    image: .image,
    message: .message
  }]' > audit-export.json
```

## Step 6: Automate Daily Exports

Set up a CronJob for automated daily exports:

```yaml
# automated-export-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-daily-export
  namespace: neuvector
spec:
  schedule: "0 1 * * *"  # Daily at 1 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: exporter
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Authenticate
                  TOKEN=$(curl -sk -X POST \
                    "https://neuvector-svc-controller:10443/v1/auth" \
                    -H "Content-Type: application/json" \
                    -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASSWORD}\"}}" \
                    | jq -r '.token.token')

                  DATE=$(date +%Y-%m-%d)

                  # Export security events
                  curl -sk \
                    "https://neuvector-svc-controller:10443/v1/log/event?start=0&limit=5000" \
                    -H "X-Auth-Token: ${TOKEN}" \
                    > /exports/security-events-${DATE}.json

                  echo "Export complete for ${DATE}"
              env:
                - name: NV_USER
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-credentials
                      key: username
                - name: NV_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: neuvector-credentials
                      key: password
              volumeMounts:
                - name: exports
                  mountPath: /exports
          volumes:
            - name: exports
              persistentVolumeClaim:
                claimName: security-exports-pvc
          restartPolicy: OnFailure
```

## Step 7: Push Events to AWS S3

```bash
#!/bin/bash
# export-to-s3.sh

DATE=$(date +%Y-%m-%d)
BUCKET="company-security-logs"

# Export events
./export-security-events.sh

# Upload to S3
aws s3 cp events-export.jsonl \
  "s3://${BUCKET}/neuvector/$(date +%Y/%m/%d)/security-events-${DATE}.jsonl" \
  --storage-class STANDARD_IA

echo "Exported to s3://${BUCKET}/neuvector/$(date +%Y/%m/%d)/"
```

## Conclusion

Exporting NeuVector security events ensures you have a complete audit trail for compliance, forensic investigation, and historical analysis. By combining on-demand API exports with automated CronJob exports, you can meet the event retention requirements of PCI DSS, HIPAA, SOC 2, and other compliance frameworks. Store exports in an immutable storage backend (AWS S3, Azure Blob with immutability policies) to prevent tampering.
