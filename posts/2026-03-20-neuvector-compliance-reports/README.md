# How to Generate NeuVector Compliance Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Compliance, Reporting, CIS Benchmark, Kubernetes

Description: Generate comprehensive compliance reports from NeuVector covering CIS Benchmarks, PCI DSS, HIPAA, and other regulatory frameworks for auditors and stakeholders.

## Introduction

NeuVector's compliance reporting capabilities enable you to generate auditor-ready reports that demonstrate your container security posture against regulatory frameworks. This guide covers generating compliance reports via the UI, REST API, and automated scripting for regular reporting cycles.

## Report Types Available

NeuVector can generate reports covering:

- **CIS Docker Benchmark**: Host-level container security
- **CIS Kubernetes Benchmark**: Kubernetes cluster hardening
- **PCI DSS**: Payment card industry requirements
- **HIPAA**: Healthcare data protection controls
- **GDPR**: Data privacy controls
- **NIST 800-190**: Container security guide
- **Custom compliance checks**: Organization-specific requirements

## Prerequisites

- NeuVector with Enforcer running
- Compliance scans completed (run scans if needed)
- NeuVector Manager access

## Step 1: Run Compliance Scans

Before generating reports, ensure fresh scan data. NeuVector exposes Docker and Kubernetes CIS benchmarks per host, so iterate over the host list:

```bash
# Trigger Docker and Kubernetes compliance scans on each host
for HOST_ID in $(curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[].id'); do

  curl -sk -X POST \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/docker" \
    -H "X-Auth-Token: ${TOKEN}"

  curl -sk -X POST \
    "https://neuvector-manager:8443/v1/bench/host/${HOST_ID}/kubernetes" \
    -H "X-Auth-Token: ${TOKEN}"
done

# Wait for scans to complete
sleep 60

# Check scan status (docker_bench_status / kube_bench_status are reported per host)
curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.hosts[] | {
    name: .name,
    docker_bench_status: .docker_bench_status,
    kube_bench_status: .kube_bench_status
  }'
```

## Step 2: Export Compliance Report from UI

1. Navigate to **Security Risks** > **Compliance**
2. Select the compliance framework from the dropdown:
   - CIS, PCI, HIPAA, GDPR, NIST
3. Use filters to scope the report:
   - Namespace
   - Node
   - Severity level
4. Click **Export** (top right) to download CSV

## Step 3: Generate Reports via API

```bash
#!/bin/bash
# generate-compliance-report.sh

NV_URL="https://neuvector-manager:8443"
REPORT_DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="/reports/neuvector/${REPORT_DATE}"
mkdir -p "${OUTPUT_DIR}"

# Authenticate
TOKEN=$(curl -sk -X POST "${NV_URL}/v1/auth" \
  -H "Content-Type: application/json" \
  -d '{"password":{"username":"admin","password":"yourpassword"}}' \
  | jq -r '.token.token')

# Cache the host list once
HOSTS_JSON=$(curl -sk "${NV_URL}/v1/host" \
  -H "X-Auth-Token: ${TOKEN}")

# Generate Docker CIS Benchmark Report
echo "Generating Docker CIS Benchmark report..."
{
  echo "Docker CIS Benchmark Report - ${REPORT_DATE}"
  printf '=%.0s' $(seq 1 60); echo
  echo ""
  echo "SUMMARY"
  printf -- '-%.0s' $(seq 1 40); echo

  for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
    HOST_NAME=$(echo "${HOSTS_JSON}" | \
      jq -r --arg id "${HOST_ID}" '.hosts[] | select(.id == $id) | .name')

    curl -sk "${NV_URL}/v1/bench/host/${HOST_ID}/docker" \
      -H "X-Auth-Token: ${TOKEN}" | \
      jq -r --arg host "${HOST_NAME}" '
        "Host: \($host)",
        "  Pass:   \([.items[] | select(.level == "PASS")] | length)",
        "  Warn:   \([.items[] | select(.level == "WARN")] | length)",
        "  Info:   \([.items[] | select(.level == "INFO")] | length)",
        "  Manual: \([.items[] | select(.level == "MANUAL")] | length)",
        "  Total:  \(.items | length)",
        ""
      '
  done
} > "${OUTPUT_DIR}/cis-docker-benchmark.txt"

echo "Generating detailed CIS checks..."
for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
  HOST_NAME=$(echo "${HOSTS_JSON}" | \
    jq -r --arg id "${HOST_ID}" '.hosts[] | select(.id == $id) | .name')

  curl -sk "${NV_URL}/v1/bench/host/${HOST_ID}/docker" \
    -H "X-Auth-Token: ${TOKEN}" | \
    jq -r --arg host "${HOST_NAME}" '
      "Host: \($host)",
      (.items[] | select(.level != "PASS") |
        "[\(.level)] \(.test_number): \(.description)",
        "  Remediation: \(.remediation)",
        ""
      )' >> "${OUTPUT_DIR}/cis-detailed-findings.txt"
done

echo "Reports saved to ${OUTPUT_DIR}"
```

> Note: NeuVector benchmark items use the levels `PASS`, `WARN`, `INFO`, `MANUAL`, `HIGH`, `NOTE`, and `ERROR`. Failed CIS checks are reported as `WARN` (there is no `FAIL` level).

## Step 4: Generate CSV Compliance Reports

For spreadsheet-based reporting:

```bash
# Cache the host list
HOSTS_JSON=$(curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}")

# Generate CSV report of all compliance findings (Docker + Kubernetes + custom)
{
  echo '"Host","Check ID","Description","Level","Category","Remediation"'
  for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
    HOST_NAME=$(echo "${HOSTS_JSON}" | \
      jq -r --arg id "${HOST_ID}" '.hosts[] | select(.id == $id) | .name')

    curl -sk \
      "https://neuvector-manager:8443/v1/host/${HOST_ID}/compliance" \
      -H "X-Auth-Token: ${TOKEN}" | \
      jq -r --arg host "${HOST_NAME}" '.items[]? |
        [$host, .test_number, .description, .level, .category, .remediation] |
        @csv'
  done
} > compliance-all-findings.csv

# Filter only failed checks (level == "WARN") for executive summary
{
  echo '"Host","Check ID","Description","Category","Remediation"'
  for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
    HOST_NAME=$(echo "${HOSTS_JSON}" | \
      jq -r --arg id "${HOST_ID}" '.hosts[] | select(.id == $id) | .name')

    curl -sk \
      "https://neuvector-manager:8443/v1/host/${HOST_ID}/compliance" \
      -H "X-Auth-Token: ${TOKEN}" | \
      jq -r --arg host "${HOST_NAME}" '.items[]? |
        select(.level == "WARN") |
        [$host, .test_number, .description, .category, .remediation] |
        @csv'
  done
} > compliance-failures-only.csv

echo "CSV reports generated"
```

## Step 5: Generate a PCI DSS Compliance Report

```bash
#!/bin/bash
# pci-compliance-report.sh

echo "# PCI DSS Compliance Assessment Report" > pci-report.md
echo "Date: $(date +%Y-%m-%d)" >> pci-report.md
echo "" >> pci-report.md
echo "## PCI DSS Requirement Coverage" >> pci-report.md
echo "" >> pci-report.md

# PCI DSS requirement mapping
echo "### Requirement 2: Do not use vendor-supplied defaults" >> pci-report.md

HOSTS_JSON=$(curl -sk "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}")

for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
  HOST_NAME=$(echo "${HOSTS_JSON}" | \
    jq -r --arg id "${HOST_ID}" '.hosts[] | select(.id == $id) | .name')

  curl -sk "https://neuvector-manager:8443/v1/host/${HOST_ID}/compliance" \
    -H "X-Auth-Token: ${TOKEN}" | \
    jq -r --arg host "${HOST_NAME}" '.items[]? |
      select(.tags[]? == "PCI") |
      select(.level == "WARN") |
      "- [WARN] Host: \($host) | \(.test_number): \(.description)"' >> pci-report.md
done

echo "" >> pci-report.md
echo "### Requirement 6: Protect systems against known vulnerabilities" >> pci-report.md

# Vulnerability check (workload scan summaries embed the CVE counts)
curl -sk "https://neuvector-manager:8443/v1/workload" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '
    "Total containers: \(.workloads | length)",
    "Containers with critical CVEs: \([.workloads[] | select(.scan_summary.critical > 0)] | length)",
    "Containers with high CVEs: \([.workloads[] | select(.scan_summary.high > 0)] | length)"' >> pci-report.md

echo "" >> pci-report.md
echo "Report saved: pci-report.md"
```

## Step 6: Schedule Automated Compliance Reports

```yaml
# compliance-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: neuvector-compliance-report
  namespace: neuvector
spec:
  schedule: "0 6 1 * *"  # First day of each month at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: report-generator
              image: alpine/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Run compliance scan
                  TOKEN=$(curl -sk -X POST \
                    "https://neuvector-svc-controller:10443/v1/auth" \
                    -H "Content-Type: application/json" \
                    -d "{\"password\":{\"username\":\"${NV_USER}\",\"password\":\"${NV_PASSWORD}\"}}" \
                    | jq -r '.token.token')

                  # Trigger Docker + Kubernetes bench on every host
                  HOSTS=$(curl -sk \
                    "https://neuvector-svc-controller:10443/v1/host" \
                    -H "X-Auth-Token: ${TOKEN}" | jq -r '.hosts[].id')

                  for HOST_ID in ${HOSTS}; do
                    curl -sk -X POST \
                      "https://neuvector-svc-controller:10443/v1/bench/host/${HOST_ID}/docker" \
                      -H "X-Auth-Token: ${TOKEN}"
                    curl -sk -X POST \
                      "https://neuvector-svc-controller:10443/v1/bench/host/${HOST_ID}/kubernetes" \
                      -H "X-Auth-Token: ${TOKEN}"
                  done

                  sleep 60  # Wait for scans

                  # Export per-host compliance reports
                  MONTH=$(date +%Y-%m)
                  mkdir -p "/reports/${MONTH}"
                  for HOST_ID in ${HOSTS}; do
                    curl -sk \
                      "https://neuvector-svc-controller:10443/v1/host/${HOST_ID}/compliance" \
                      -H "X-Auth-Token: ${TOKEN}" \
                      > "/reports/${MONTH}/compliance-${HOST_ID}.json"
                  done

                  echo "Monthly compliance report saved"
          restartPolicy: OnFailure
```

## Step 7: Generate Executive Summary

Create a high-level summary for management:

```bash
#!/bin/bash
# executive-summary.sh

TOKEN="your-token"
DATE=$(date +%Y-%m-%d)

HOSTS_JSON=$(curl -sk \
  "https://neuvector-manager:8443/v1/host" \
  -H "X-Auth-Token: ${TOKEN}")

TOTAL_HOSTS=$(echo "${HOSTS_JSON}" | jq '.hosts | length')

TOTAL_PASS=0
TOTAL_FAIL=0
for HOST_ID in $(echo "${HOSTS_JSON}" | jq -r '.hosts[].id'); do
  COUNTS=$(curl -sk \
    "https://neuvector-manager:8443/v1/host/${HOST_ID}/compliance" \
    -H "X-Auth-Token: ${TOKEN}" | \
    jq -r '"\([.items[] | select(.level == "PASS")] | length) \([.items[] | select(.level == "WARN")] | length)"')
  TOTAL_PASS=$((TOTAL_PASS + $(echo "${COUNTS}" | awk '{print $1}')))
  TOTAL_FAIL=$((TOTAL_FAIL + $(echo "${COUNTS}" | awk '{print $2}')))
done

if [ $((TOTAL_PASS + TOTAL_FAIL)) -gt 0 ]; then
  SCORE=$(echo "scale=0; ${TOTAL_PASS} * 100 / (${TOTAL_PASS} + ${TOTAL_FAIL})" | bc)
else
  SCORE=0
fi

cat << EOF
=== NeuVector Security Compliance Executive Summary ===
Date: ${DATE}

Infrastructure: ${TOTAL_HOSTS} hosts scanned
Compliance Score: ${SCORE}% (${TOTAL_PASS} passed / ${TOTAL_FAIL} failed)

Recommendation: $([ ${SCORE} -ge 80 ] && echo "ACCEPTABLE" || echo "ACTION REQUIRED - Score below 80%")
EOF
```

## Conclusion

NeuVector's compliance reporting capabilities enable you to demonstrate a documented, measurable security posture to auditors and stakeholders. By scheduling regular automated scans and generating standardized reports, you maintain continuous compliance evidence rather than scrambling before audits. For regulated industries like healthcare (HIPAA) or finance (PCI DSS), these automated reports are essential for demonstrating due diligence in container security controls.
