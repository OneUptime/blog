# How to Automate Compliance Reporting in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Compliance, Reporting, CIS, Automation, PCI-DSS

Description: A guide to automating compliance reporting in Rancher for CIS benchmarks, PCI DSS, HIPAA, and custom compliance frameworks using scheduled scans and report generation.

## Overview

Compliance reporting is a critical requirement for organizations in regulated industries. Manually generating compliance reports is time-consuming and error-prone. Rancher provides compliance scanning capabilities through the `rancher-compliance` app, and combined with NeuVector's compliance features and custom reporting scripts, you can automate the generation, aggregation, and distribution of compliance reports. This guide covers building an automated compliance reporting pipeline.

## Automated CIS Benchmark Reports

### Schedule Recurring CIS Scans

```yaml
# Schedule recurring compliance scans for an RKE2 cluster

apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: monthly-compliance-scan
spec:
  scanProfileName: rke2-cis-1.11-profile   # Example built-in profile for RKE2 1.29+
  scheduledScanConfig:
    cronSchedule: "0 1 1 * *"   # Monthly on the 1st
    retentionCount: 13          # 13 months for annual comparison
```

### Collect and Aggregate CIS Results

```python
#!/usr/bin/env python3
# generate-compliance-report.py
import subprocess
import json
import datetime
from typing import List, Dict

def get_scan_results() -> List[Dict]:
    """Get compliance scan results from the current cluster"""
    result = subprocess.run(
        ['kubectl', 'get', 'clusterscans',
         '-o', 'json'],
        capture_output=True, text=True, check=True
    )
    scans = json.loads(result.stdout)
    return scans.get('items', [])


def generate_summary_report(scans: List[Dict]) -> str:
    """Generate a markdown compliance summary report"""
    today = datetime.date.today().isoformat()

    report = f"""# Kubernetes Compliance Report
Generated: {today}

## Executive Summary

"""
    total_pass = 0
    total_tests = 0
    scan_results = []

    for scan in scans:
        scan_name = scan.get('metadata', {}).get('name', 'unknown')
        summary = scan.get('status', {}).get('summary', {})

        if summary:
            pass_count = summary.get('pass', 0)
            fail_count = summary.get('fail', 0)
            warn_count = summary.get('warn', 0)
            total = summary.get('total', 0)

            pass_pct = (pass_count / total * 100) if total > 0 else 0

            total_pass += pass_count
            total_tests += total

            status_emoji = "✅" if pass_pct >= 90 else "⚠️" if pass_pct >= 80 else "❌"

            scan_results.append({
                'name': scan_name,
                'pass': pass_count,
                'fail': fail_count,
                'warn': warn_count,
                'total': total,
                'pass_pct': pass_pct,
                'status': status_emoji
            })

    # Summary table
    report += "| Scan | Pass | Fail | Warn | Pass % | Status |\n"
    report += "|------|------|------|------|--------|--------|\n"

    for sr in scan_results:
        report += f"| {sr['name']} | {sr['pass']} | {sr['fail']} | {sr['warn']} | {sr['pass_pct']:.1f}% | {sr['status']} |\n"

    overall_pct = (total_pass / total_tests * 100) if total_tests > 0 else 0

    report += f"\n**Overall Pass Rate: {overall_pct:.1f}%**\n"

    return report


def get_failed_controls(report: Dict) -> List[str]:
    """Extract failed CIS controls from a ClusterScanReport"""
    failed = []
    report_json = report.get('spec', {}).get('reportJSON', '')
    if not report_json:
        return failed

    try:
        parsed = json.loads(report_json)
    except json.JSONDecodeError:
        return failed

    for group in parsed.get('results', []):
        for check in group.get('checks', []):
            if check.get('state') == 'fail':
                failed.append(check.get('id', 'unknown'))

    return failed


if __name__ == '__main__':
    scans = get_scan_results()
    report = generate_summary_report(scans)

    # Save report
    filename = f"compliance-report-{datetime.date.today().isoformat()}.md"
    with open(filename, 'w') as f:
        f.write(report)

    print(f"Report generated: {filename}")
    print(report)
```

## NeuVector Compliance Automation

### Schedule NeuVector Compliance Scans

You can run the following script from cron or a Kubernetes CronJob to trigger recurring NeuVector platform scans and archive the JSON report.

```bash
#!/bin/bash
# run-neuvector-compliance.sh
set -euo pipefail

NEUVECTOR_URL="${NEUVECTOR_URL%/}"
NEUVECTOR_USER="${NEUVECTOR_USER:-admin}"

# Authenticate
TOKEN=$(curl -s -k \
  -H "Content-Type: application/json" \
  -d "{\"password\": {\"username\": \"${NEUVECTOR_USER}\", \"password\": \"${NEUVECTOR_PASS}\"}}" \
  "${NEUVECTOR_URL}/v1/auth" \
  | jq -r '.token.token')

if [ -z "${TOKEN}" ] || [ "${TOKEN}" = "null" ]; then
  echo "Failed to authenticate to NeuVector" >&2
  exit 1
fi

# Trigger a platform scan
curl -s -k \
  -X POST \
  -H "X-Auth-Token: ${TOKEN}" \
  "${NEUVECTOR_URL}/v1/scan/platform/platform" >/dev/null

# Wait for the scan to complete (poll global scan status)
for i in $(seq 1 20); do
  SCANNING=$(curl -s -k \
    -H "X-Auth-Token: ${TOKEN}" \
    "${NEUVECTOR_URL}/v1/scan/status" \
    | jq -r '.status.scanning')

  if [ "${SCANNING}" = "0" ]; then
    break
  fi
  sleep 15
done

# Download the platform scan report
curl -s -k \
  -H "X-Auth-Token: ${TOKEN}" \
  "${NEUVECTOR_URL}/v1/scan/platform/platform" \
  -o "neuvector-platform-scan-$(date +%Y%m%d).json"

# End the authenticated session
curl -s -k \
  -X DELETE \
  -H "X-Auth-Token: ${TOKEN}" \
  "${NEUVECTOR_URL}/v1/auth" >/dev/null

echo "NeuVector platform scan report saved"
```

## Kubernetes Audit Report Generator

```python
#!/usr/bin/env python3
# audit-report.py - Generate access audit report from Kubernetes audit logs

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

def analyze_audit_logs(log_file: str, days: int = 30) -> dict:
    """Analyze Kubernetes audit logs for compliance evidence"""

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stats = {
        'total_events': 0,
        'users': defaultdict(int),
        'resources': defaultdict(int),
        'verbs': defaultdict(int),
        'sensitive_operations': [],
        'failed_auth': 0
    }

    with open(log_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
            except json.JSONDecodeError:
                continue

            # Parse timestamp
            timestamp = event.get('requestReceivedTimestamp')
            if not timestamp:
                continue

            try:
                ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                continue

            if ts < cutoff:
                continue

            stats['total_events'] += 1

            # Track users
            user = event.get('user', {}).get('username', 'unknown')
            stats['users'][user] += 1

            # Track resource operations
            resource = event.get('objectRef', {}).get('resource', 'unknown')
            verb = event.get('verb', 'unknown')
            stats['resources'][resource] += 1
            stats['verbs'][verb] += 1

            # Flag sensitive operations
            if resource in ['secrets', 'serviceaccounts'] and verb in ['get', 'list']:
                stats['sensitive_operations'].append({
                    'time': event.get('requestReceivedTimestamp'),
                    'user': user,
                    'resource': resource,
                    'verb': verb
                })

            # Track failed authentications
            status_code = event.get('responseStatus', {}).get('code', 0)
            if status_code in [401, 403]:
                stats['failed_auth'] += 1

    return dict(stats)


if __name__ == '__main__':
    log_file = sys.argv[1] if len(sys.argv) > 1 else '/var/log/kubernetes/audit/audit.log'
    stats = analyze_audit_logs(log_file)

    print(f"Total events (30 days): {stats['total_events']}")
    print(f"Failed auth attempts: {stats['failed_auth']}")
    print(f"Unique users: {len(stats['users'])}")
    print(f"Sensitive operations: {len(stats['sensitive_operations'])}")
```

## Automated Report Distribution

```yaml
# CronJob: Generate and email monthly compliance report
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-compliance-report
  namespace: compliance
spec:
  schedule: "0 9 1 * *"    # 9 AM on the 1st of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: compliance-reporter
          containers:
            - name: reporter
              image: registry.example.com/compliance-tools:latest
              env:
                - name: EMAIL_TO
                  value: "ciso@example.com,compliance@example.com"
                - name: S3_BUCKET
                  value: "compliance-reports"
              command:
                - /bin/sh
                - -c
                - |
                  set -e
                  REPORT_FILE="compliance-report-$(date +%F).md"
                  python3 /scripts/generate-compliance-report.py
                  aws s3 cp "${REPORT_FILE}" "s3://${S3_BUCKET}/"
                  python3 /scripts/send-email.py "${REPORT_FILE}"
          restartPolicy: OnFailure
```

## Compliance Dashboard in Grafana

Grafana can visualize the aggregated results if your reporting pipeline publishes custom Prometheus metrics alongside NeuVector's exporter metrics.

```yaml
# ConfigMap with Grafana dashboard for custom compliance metrics and NeuVector exporter data
apiVersion: v1
kind: ConfigMap
metadata:
  name: compliance-dashboard
  namespace: cattle-monitoring-system
  labels:
    grafana_dashboard: "1"
data:
  compliance.json: |
    {
      "title": "Kubernetes Compliance Dashboard",
      "panels": [
        {
          "title": "Aggregated Compliance Pass Rate",
          "type": "stat",
          "targets": [{"expr": "compliance_report_pass_percentage"}]
        },
        {
          "title": "High Vulnerabilities Across Services",
          "type": "stat",
          "targets": [{"expr": "sum(nv_container_vulnerabilityHigh)"}]
        }
      ]
    }
```

## Conclusion

Automating compliance reporting in Rancher transforms what would be a manual, time-consuming process into a reliable, scheduled workflow. Automated CIS benchmark scans, NeuVector compliance checks, and Kubernetes audit log analysis together provide comprehensive compliance evidence. Scheduling monthly report generation, distributing reports to stakeholders, and maintaining a compliance dashboard in Grafana ensures that your compliance posture is always visible and actionable. Always map your automated checks back to specific regulatory requirements (PCI DSS, HIPAA, FedRAMP) to demonstrate coverage to auditors.
