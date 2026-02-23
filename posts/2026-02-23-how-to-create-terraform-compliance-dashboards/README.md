# How to Create Terraform Compliance Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Compliance, Monitoring, DevOps, Security

Description: Learn how to build comprehensive Terraform compliance dashboards that give your organization real-time visibility into infrastructure compliance status across all teams and environments.

---

Compliance in infrastructure management is not just about passing audits. It is about having continuous visibility into whether your infrastructure meets the standards your organization has set. Terraform compliance dashboards provide that visibility, giving security teams, platform engineers, and management a clear picture of where things stand at any given moment.

In this guide, we will cover how to design and build Terraform compliance dashboards that provide actionable insights.

## Understanding Compliance Requirements

Before building dashboards, define what compliance means for your organization. Common compliance dimensions include security standards like CIS benchmarks, regulatory requirements like HIPAA or SOC2, organizational policies like tagging standards, and cost governance rules like budget limits per team.

Each of these dimensions needs specific checks and corresponding dashboard visualizations.

## Setting Up Compliance Scanning

The foundation of any compliance dashboard is automated scanning. Use tools like terraform-compliance, Checkov, or OPA to scan your Terraform code:

```python
# scripts/compliance-scanner.py
# Scans all Terraform configurations and generates compliance data

import json
import subprocess
import os
from datetime import datetime

def scan_workspace(workspace_path):
    """Run compliance checks against a Terraform workspace."""
    results = {
        "workspace": workspace_path,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": []
    }

    # Run Checkov scan
    checkov_output = subprocess.run(
        ["checkov", "-d", workspace_path, "--output", "json", "--quiet"],
        capture_output=True, text=True
    )

    checkov_results = json.loads(checkov_output.stdout)

    for check in checkov_results.get("results", {}).get("passed_checks", []):
        results["checks"].append({
            "id": check["check_id"],
            "name": check["check_name"],
            "status": "PASSED",
            "resource": check["resource"],
            "severity": check.get("severity", "MEDIUM")
        })

    for check in checkov_results.get("results", {}).get("failed_checks", []):
        results["checks"].append({
            "id": check["check_id"],
            "name": check["check_name"],
            "status": "FAILED",
            "resource": check["resource"],
            "severity": check.get("severity", "MEDIUM")
        })

    return results

def generate_compliance_report(all_results):
    """Generate aggregate compliance metrics."""
    total_checks = sum(len(r["checks"]) for r in all_results)
    passed_checks = sum(
        len([c for c in r["checks"] if c["status"] == "PASSED"])
        for r in all_results
    )

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "total_workspaces": len(all_results),
        "total_checks": total_checks,
        "passed_checks": passed_checks,
        "failed_checks": total_checks - passed_checks,
        "compliance_score": round(
            (passed_checks / total_checks * 100) if total_checks > 0 else 0, 2
        ),
        "workspaces": all_results
    }
```

## Designing the Dashboard Data Model

Structure your compliance data for efficient querying and visualization:

```json
{
  "compliance_data": {
    "organization_score": 87.3,
    "trend": "improving",
    "by_team": {
      "platform": {
        "score": 94.2,
        "total_resources": 342,
        "compliant_resources": 322,
        "critical_violations": 2,
        "high_violations": 8,
        "medium_violations": 10
      },
      "backend": {
        "score": 85.1,
        "total_resources": 218,
        "compliant_resources": 185,
        "critical_violations": 5,
        "high_violations": 12,
        "medium_violations": 16
      }
    },
    "by_category": {
      "encryption": {"score": 92.0, "total": 150, "passed": 138},
      "networking": {"score": 88.5, "total": 200, "passed": 177},
      "iam": {"score": 79.0, "total": 100, "passed": 79},
      "logging": {"score": 85.0, "total": 120, "passed": 102},
      "tagging": {"score": 95.0, "total": 500, "passed": 475}
    },
    "by_environment": {
      "production": {"score": 91.5},
      "staging": {"score": 86.2},
      "development": {"score": 78.4}
    }
  }
}
```

## Building Custom Compliance Policies

Define your organization's specific compliance policies as code:

```hcl
# compliance/policies/tagging.rego
# OPA policy for tag compliance

package terraform.compliance.tagging

# Required tags for all resources
required_tags := {"Environment", "Team", "ManagedBy", "CostCenter"}

# Check that all taggable resources have required tags
deny[msg] {
    resource := input.resource_changes[_]
    resource.change.after.tags != null

    # Find missing tags
    existing_tags := {tag | resource.change.after.tags[tag]}
    missing := required_tags - existing_tags

    count(missing) > 0
    msg := sprintf(
        "Resource %s is missing required tags: %v",
        [resource.address, missing]
    )
}

# Ensure Environment tag has valid values
deny[msg] {
    resource := input.resource_changes[_]
    resource.change.after.tags != null
    env := resource.change.after.tags["Environment"]

    valid_environments := {"production", "staging", "development", "sandbox"}
    not valid_environments[env]

    msg := sprintf(
        "Resource %s has invalid Environment tag: %s",
        [resource.address, env]
    )
}
```

## Creating the Dashboard Frontend

Build a dashboard that visualizes compliance data effectively:

```html
<!-- compliance-dashboard/index.html -->
<!-- Terraform Compliance Dashboard -->
<!DOCTYPE html>
<html>
<head>
    <title>Terraform Compliance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="dashboard">
        <div class="score-card">
            <h2>Organization Compliance Score</h2>
            <div id="org-score" class="big-number"></div>
        </div>

        <div class="chart-container">
            <canvas id="team-scores"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="category-breakdown"></canvas>
        </div>

        <div id="violations-table">
            <!-- Critical violations listed here -->
        </div>
    </div>

    <script>
    // Fetch compliance data and render charts
    async function loadDashboard() {
        const response = await fetch('/api/compliance/latest');
        const data = await response.json();

        // Display organization score
        document.getElementById('org-score').textContent =
            data.organization_score + '%';

        // Render team comparison chart
        new Chart(document.getElementById('team-scores'), {
            type: 'bar',
            data: {
                labels: Object.keys(data.by_team),
                datasets: [{
                    label: 'Compliance Score',
                    data: Object.values(data.by_team).map(t => t.score),
                    backgroundColor: Object.values(data.by_team).map(
                        t => t.score >= 90 ? '#4CAF50' :
                             t.score >= 80 ? '#FF9800' : '#F44336'
                    )
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
    loadDashboard();
    </script>
</body>
</html>
```

## Automating Compliance Data Collection

Set up a scheduled pipeline that collects compliance data regularly:

```yaml
# .github/workflows/compliance-scan.yaml
name: Compliance Dashboard Update

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  scan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        workspace:
          - infrastructure/production
          - infrastructure/staging
          - infrastructure/development
    steps:
      - uses: actions/checkout@v4

      - name: Run Compliance Scan
        run: |
          # Run checkov against the workspace
          checkov -d ${{ matrix.workspace }} \
            --output json \
            --output-file compliance-results.json

      - name: Upload Results
        run: |
          # Push results to your compliance data store
          python scripts/upload-compliance-data.py \
            --workspace ${{ matrix.workspace }} \
            --results compliance-results.json
```

## Tracking Compliance Trends Over Time

Store historical compliance data to show improvement trends:

```python
# scripts/compliance-trends.py
# Generate trend data for compliance dashboards

import json
from datetime import datetime, timedelta

def calculate_weekly_trends(compliance_history):
    """Calculate compliance trends over time."""
    weeks = []
    current_date = datetime.utcnow()

    for i in range(12):  # Last 12 weeks
        week_start = current_date - timedelta(weeks=i+1)
        week_end = current_date - timedelta(weeks=i)

        # Filter data points within this week
        week_data = [
            d for d in compliance_history
            if week_start <= datetime.fromisoformat(d["timestamp"]) < week_end
        ]

        if week_data:
            avg_score = sum(d["score"] for d in week_data) / len(week_data)
            weeks.append({
                "week": week_start.strftime("%Y-%m-%d"),
                "average_score": round(avg_score, 1),
                "total_violations": sum(d["violations"] for d in week_data),
                "critical_violations": sum(
                    d["critical_violations"] for d in week_data
                )
            })

    return list(reversed(weeks))
```

## Setting Up Alerts for Compliance Violations

Configure alerts that notify teams when compliance scores drop below thresholds:

```hcl
# compliance/alerting.tf
# Alert configuration for compliance violations

resource "aws_cloudwatch_metric_alarm" "compliance_score_low" {
  alarm_name          = "terraform-compliance-score-below-threshold"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ComplianceScore"
  namespace           = "Terraform/Compliance"
  period              = 21600  # 6 hours
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Overall compliance score has dropped below 85%"

  alarm_actions = [aws_sns_topic.compliance_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "critical_violations" {
  alarm_name          = "terraform-critical-compliance-violations"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CriticalViolations"
  namespace           = "Terraform/Compliance"
  period              = 3600  # 1 hour
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "New critical compliance violations detected"

  alarm_actions = [aws_sns_topic.security_alerts.arn]
}
```

## Creating Executive Summary Reports

Management needs a different view than engineers. Generate executive-friendly summaries:

```python
# scripts/executive-report.py
# Generate executive compliance summary

def generate_executive_summary(data):
    """Create a high-level compliance summary for leadership."""
    return {
        "report_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "headline": f"Organization compliance score: {data['score']}%",
        "summary": (
            f"We are managing {data['total_resources']} resources "
            f"across {data['total_teams']} teams. "
            f"Our overall compliance score has {'improved' if data['trend'] > 0 else 'declined'} "
            f"by {abs(data['trend'])}% this month."
        ),
        "key_metrics": {
            "compliance_score": data["score"],
            "month_over_month_change": data["trend"],
            "critical_issues": data["critical_count"],
            "teams_above_90": data["teams_above_threshold"],
            "audit_readiness": "READY" if data["score"] >= 90 else "AT RISK"
        },
        "top_risks": data["top_risks"][:5],
        "recommended_actions": data["recommendations"][:3]
    }
```

## Best Practices for Compliance Dashboards

Start with the most important compliance categories and expand over time. Do not try to track everything at once. Focus on critical security checks first, then add tagging, cost, and operational compliance.

Make the dashboard actionable. Every violation shown should link to documentation on how to fix it. A dashboard that shows problems without solutions just creates frustration.

Automate remediation where possible. For common violations like missing tags, consider adding automated fix scripts that teams can run with one click.

Review and update compliance policies regularly. Standards evolve, new services launch, and organizational requirements change. Schedule quarterly reviews of your compliance rules.

## Conclusion

Terraform compliance dashboards turn compliance from a periodic audit exercise into a continuous practice. By automating compliance scanning, visualizing results in an accessible dashboard, and setting up alerts for violations, you create an environment where compliance is maintained proactively rather than reactively. The result is fewer surprises during audits, faster remediation of issues, and a more secure infrastructure overall.
