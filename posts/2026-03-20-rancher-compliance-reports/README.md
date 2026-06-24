# How to Generate Compliance Reports in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Compliance, Reporting, CIS, Security

Description: Learn how to generate, export, and present compliance reports from Rancher's CIS scanning tool for audits and security reviews.

Compliance reporting is a critical requirement for organizations operating Kubernetes clusters in regulated industries. Rancher's Compliance Scans feature provides downloadable CSV reports in the UI, and the underlying scan data can also be retrieved with `kubectl` for custom reporting workflows. This guide covers how to generate comprehensive compliance reports from Rancher.

## Prerequisites

- Rancher with the `rancher-compliance` app installed and scans configured
- Completed compliance scans with results
- Cluster-owner or administrator access, or equivalent permissions to view and download `ClusterScanReport` resources
- Python 3 installed (for report processing scripts)

## Step 1: Access Scan Reports in Rancher UI

1. In the Rancher UI, go to **Cluster Management**
2. Open your cluster with **Explore**
3. Go to **Compliance** → **Scan**
4. Click on a completed scan to view results
5. The report shows:
   - Overall pass/fail summary
   - Detailed results by CIS section
   - Remediation guidance for failed checks
6. Click **Download** to export the report as CSV

## Step 2: Retrieve Reports via kubectl

```bash
# List all scan reports
kubectl get clusterscanreports.compliance.cattle.io

# Get the most recent scan report name
LATEST_REPORT=$(kubectl get clusterscanreports.compliance.cattle.io \
  --sort-by='.metadata.creationTimestamp' \
  -o jsonpath='{.items[-1].metadata.name}')

echo "Latest report: $LATEST_REPORT"

# Export the full report as JSON
kubectl get clusterscanreports.compliance.cattle.io "$LATEST_REPORT" \
  -o jsonpath='{.spec.reportJSON}' > compliance-report.json

echo "Report exported to compliance-report.json"
```

## Step 3: Generate a Summary Report

```python
#!/usr/bin/env python3
# generate-compliance-summary.py - Generate a human-readable compliance summary

import json
import sys
from datetime import datetime

def generate_summary(report_file):
    with open(report_file, encoding='utf-8') as f:
        report = json.load(f)

    total_pass = report.get('pass', 0)
    total_fail = report.get('fail', 0)
    total_skip = report.get('skip', 0)
    total_warn = report.get('warn', 0)
    total_not_applicable = report.get('notApplicable', 0)
    total = report.get(
        'total',
        total_pass + total_fail + total_skip + total_warn + total_not_applicable
    )
    checks_requiring_review = []

    for result in report.get('results', []):
        for check in result.get('checks', []):
            state = check.get('state', '')
            if state in {'fail', 'mixed'}:
                checks_requiring_review.append({
                    'id': check.get('id'),
                    'state': state,
                    'description': check.get('description'),
                    'remediation': check.get('remediation', 'No remediation provided')
                })

    pass_rate = (total_pass / total * 100) if total > 0 else 0

    print("=" * 60)
    print("CIS KUBERNETES BENCHMARK COMPLIANCE REPORT")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print(f"\nSUMMARY")
    print(f"  Total Checks: {total}")
    print(f"  Passed:       {total_pass} ({pass_rate:.1f}%)")
    print(f"  Failed:       {total_fail}")
    print(f"  Skipped:      {total_skip}")
    print(f"  Warnings:     {total_warn}")
    print(f"  Not Applicable: {total_not_applicable}")
    print(f"\nCOMPLIANCE STATUS: {'COMPLIANT' if total_fail == 0 else 'NON-COMPLIANT'}")

    if checks_requiring_review:
        print(f"\nCHECKS REQUIRING REVIEW ({len(checks_requiring_review)} items):")
        print("-" * 60)
        for check in checks_requiring_review:
            remediation = check['remediation']
            if len(remediation) > 200:
                remediation = remediation[:200] + "..."
            print(f"\n[{check['id']}] ({check['state']}) {check['description']}")
            print(f"  Remediation: {remediation}")

if __name__ == '__main__':
    generate_summary(sys.argv[1] if len(sys.argv) > 1 else 'compliance-report.json')
```

```bash
# Run the summary generator
python3 generate-compliance-summary.py compliance-report.json
```

## Step 4: Generate an HTML Compliance Report

```python
#!/usr/bin/env python3
# generate-html-report.py - Generate an HTML compliance report

import html as html_lib
import json
from datetime import datetime

def generate_html_report(report_file, output_file='compliance-report.html'):
    with open(report_file, encoding='utf-8') as f:
        report = json.load(f)

    checks_by_state = {
        'pass': [],
        'fail': [],
        'skip': [],
        'warn': [],
        'notApplicable': [],
        'mixed': [],
        'other': [],
    }

    for result in report.get('results', []):
        for check in result.get('checks', []):
            state = check.get('state', 'skip')
            if state not in checks_by_state:
                state = 'other'
            checks_by_state[state].append(check)

    checks_requiring_review = checks_by_state['fail'] + checks_by_state['mixed']
    total_pass = report.get('pass', len(checks_by_state['pass']))
    total_fail = report.get('fail', len(checks_by_state['fail']))
    total_skip = report.get('skip', len(checks_by_state['skip']))
    total_warn = report.get('warn', len(checks_by_state['warn']))
    total_not_applicable = report.get('notApplicable', len(checks_by_state['notApplicable']))

    html_output = f"""<!DOCTYPE html>
<html>
<head>
    <title>CIS Compliance Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .pass {{ color: green; }}
        .fail {{ color: red; }}
        .skip {{ color: gray; }}
        .warn {{ color: orange; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <h1>CIS Kubernetes Benchmark Compliance Report</h1>
    <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

    <h2>Summary</h2>
    <table>
        <tr>
            <th>Status</th>
            <th>Count</th>
        </tr>
        <tr class="pass"><td>Pass</td><td>{total_pass}</td></tr>
        <tr class="fail"><td>Fail</td><td>{total_fail}</td></tr>
        <tr class="skip"><td>Skip</td><td>{total_skip}</td></tr>
        <tr class="warn"><td>Warn</td><td>{total_warn}</td></tr>
        <tr class="skip"><td>Not Applicable</td><td>{total_not_applicable}</td></tr>
    </table>

    <h2>Checks Requiring Review</h2>
    <table>
        <tr>
            <th>State</th>
            <th>Check ID</th>
            <th>Description</th>
            <th>Remediation</th>
        </tr>"""

    for check in checks_requiring_review:
        remediation = check.get('remediation', 'N/A')
        if len(remediation) > 300:
            remediation = remediation[:300] + "..."
        html_output += f"""
        <tr>
            <td>{html_lib.escape(check.get('state', ''))}</td>
            <td>{html_lib.escape(check.get('id', ''))}</td>
            <td>{html_lib.escape(check.get('description', ''))}</td>
            <td>{html_lib.escape(remediation)}</td>
        </tr>"""

    if not checks_requiring_review:
        html_output += """
        <tr>
            <td colspan="4">No failing or mixed checks found.</td>
        </tr>"""

    html_output += """
    </table>
</body>
</html>"""

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_output)

    print(f"HTML report generated: {output_file}")

if __name__ == '__main__':
    generate_html_report('compliance-report.json')
```

## Step 5: Schedule Automated Report Generation

```bash
# Create a scheduled scan that generates a new report every Monday at 8 AM
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: weekly-compliance-scan
spec:
  # Leave scanProfileName unset to use Rancher's default profile for this cluster type
  scheduledScanConfig:
    cronSchedule: "0 8 * * 1"
    retentionCount: 4
EOF
```

## Conclusion

Generating comprehensive compliance reports from Rancher's Compliance Scans feature provides the documentation needed for security audits and ongoing compliance monitoring. By automating report generation and combining JSON exports with custom reporting scripts, you can create audit-ready compliance documentation that satisfies regulatory requirements. These reports serve as evidence of your organization's commitment to Kubernetes security best practices.
