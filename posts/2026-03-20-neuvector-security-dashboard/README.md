# How to Monitor NeuVector Security Dashboard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Dashboard, Security Monitoring, Kubernetes, Container Security

Description: Use the NeuVector security dashboard to monitor your cluster's security posture, track vulnerabilities, and visualize container activity in real time.

## Introduction

The NeuVector Manager dashboard provides a comprehensive view of your Kubernetes cluster's security posture. It displays real-time security events, vulnerability statistics, compliance scores, and network activity - all in one place. This guide explains how to effectively use the dashboard for security monitoring and incident triage.

## Dashboard Sections Overview

The NeuVector dashboard is organized into several key sections:

- **Summary**: High-level security status and statistics
- **Security Events**: Recent violations and threats
- **Vulnerabilities**: CVE distribution and trends
- **Compliance**: Benchmark scores and findings
- **Network Activity**: Traffic visualization and anomalies
- **Risk Reports**: Aggregate risk scoring

## Prerequisites

- NeuVector installed and running
- Workloads monitored for at least 24 hours
- NeuVector Manager access

## Step 1: Access the Dashboard

```bash
# Get the NeuVector Manager URL

kubectl get svc neuvector-service-webui -n neuvector

# Access via browser at:
# https://<manager-ip>:<nodeport>
# Default credentials: admin/admin (change immediately)
```

## Step 2: Understand the Summary Panel

The main dashboard shows:

```text
Security Risk Score: A number from 0-100 (lower is better)
├── Critical CVEs: Count of critical vulnerabilities in running containers
├── High CVEs: Count of high severity vulnerabilities
├── Security Events: Count of recent violations
├── Compliance Issues: Failed compliance checks
└── Groups in Protect Mode: Percentage of protected workloads
```

Key metrics to monitor:

```bash
# Get summary metrics via API
curl -sk \
  "https://neuvector-svc-controller:10443/v1/system/summary" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    running_pods: .summary.running_pods,
    running_workloads: .summary.running_workloads,
    services: .summary.services,
    policy_rules: .summary.policy_rules,
    enforcers: .summary.enforcers,
    disconnected_enforcers: .summary.disconnected_enforcers,
    cvedb_version: .summary.cvedb_version
  }'
```

## Step 3: Monitor Security Events in Real Time

Use the Security Events panel to track violations:

1. Go to **Notifications** > **Security Events**
2. Use filters to focus on:
   - **Level**: Critical, High, Warning
   - **Type**: Process, Network, File, Package
   - **Namespace**: Filter by application namespace
   - **Time Range**: Last hour, 24 hours, 7 days

```bash
# Get recent security events via API
curl -sk \
  "https://neuvector-svc-controller:10443/v1/log/security" \
  -H "X-Auth-Token: ${TOKEN}" | jq '
  [.threats[]?, .incidents[]?, .violations[]?] |
  group_by(.level) |
  map({level: .[0].level, count: length})'
```

## Step 4: Monitor Vulnerability Trends

Track CVE counts over time:

```bash
# Get vulnerability statistics across all scanned workloads
curl -sk -X POST \
  "https://neuvector-svc-controller:10443/v1/scan/workloads/scan_report" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{}' | jq '{
    total_scanned: (.workloads | length),
    high_total: [.workloads[].high] | add,
    medium_total: [.workloads[].medium] | add
  }'

# Find most vulnerable containers
curl -sk -X POST \
  "https://neuvector-svc-controller:10443/v1/scan/workloads/scan_report" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{}' | jq '[
    .workloads[] |
    select(.high > 5) |
    {name: .display_name, namespace: .domain, high: .high, medium: .medium}
  ] | sort_by(.high) | reverse | .[0:10]'
```

## Step 5: Monitor Network Activity

The Network Activity view shows real-time container communications:

1. Navigate to **Network Activity**
2. Select a namespace or group to visualize
3. Look for:
   - Unexpected connections to external IPs
   - Unusual port usage
   - New connection patterns not seen before
4. Click on a connection line to see details:
   - Protocol and port
   - Bytes transferred
   - Policy action (allowed/blocked/alerted)

## Step 6: Use the Risk Reports View

NeuVector generates risk reports that aggregate security findings:

1. Go to **Security Risks** > **Vulnerability View**
2. Filter by:
   - CVE name (search for specific CVEs)
   - Severity
   - Namespace
   - Package name
3. Click any CVE to see all affected containers

```bash
# Get risk score metrics
curl -sk \
  "https://neuvector-svc-controller:10443/v1/system/score/metrics" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.'
```

## Step 7: Set Up Dashboard Alerts

Configure the dashboard to highlight specific conditions:

```bash
# Create a response rule to alert on critical events
curl -sk -X PATCH \
  "https://neuvector-svc-controller:10443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [{
        "event": "security-event",
        "comment": "Alert on critical container security events",
        "conditions": [{"type": "level", "value": "critical"}],
        "actions": ["webhook"],
        "webhooks": ["slack-security-channel"],
        "disable": false
      }]
    }
  }'
```

## Step 8: Export Dashboard Data for Reporting

```bash
#!/bin/bash
# generate-security-report.sh

DATE=$(date +%Y-%m-%d)

echo "# NeuVector Security Report - ${DATE}" > report.md
echo "" >> report.md

# Vulnerability summary
echo "## Vulnerability Summary" >> report.md
curl -sk -X POST \
  "https://neuvector-svc-controller:10443/v1/scan/workloads/scan_report" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{}' | jq -r '"
Total Containers Scanned: \(.workloads | length)
High CVEs: \([.workloads[].high] | add)
Medium CVEs: \([.workloads[].medium] | add)
"' >> report.md

# Security events count
echo "" >> report.md
echo "## Security Events (Last 24 Hours)" >> report.md
curl -sk \
  "https://neuvector-svc-controller:10443/v1/log/security" \
  -H "X-Auth-Token: ${TOKEN}" | jq -r '
  ([.threats[]?, .incidents[]?, .violations[]?]) as $events |
  "Total Events: \($events | length)
Critical: \([$events[] | select(.level == "Critical")] | length)
High: \([$events[] | select(.level == "High")] | length)"' >> report.md

echo "Report generated: report.md"
```

## Conclusion

The NeuVector security dashboard provides the visibility needed to maintain a strong security posture across your Kubernetes clusters. By regularly monitoring the summary metrics, investigating security events promptly, and tracking vulnerability trends over time, you can identify security improvements and demonstrate compliance to stakeholders. Set up automated exports for weekly reports to track your security posture improvement over time.
