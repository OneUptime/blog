# How to Establish Error Budget Policies for Release Gating on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, SRE, Error Budget, Release Gating, SLO, Cloud Monitoring, Google Cloud

Description: Set up error budget policies that gate production releases based on SLO health, preventing deployments when reliability is already compromised.

---

The concept behind error budgets is simple: if your SLO says 99.9% availability, you have a 0.1% error budget. When that budget is spent, you stop shipping new features and focus on reliability. But implementing this as an actual automated gate in your release pipeline is where most teams get stuck. This guide shows you how to build error budget policies that automatically control your release velocity on Google Cloud.

## How Error Budget Gating Works

The idea is straightforward. Before every release, check how much error budget remains. If the budget is healthy, the release proceeds. If the budget is depleted or nearly depleted, the release is blocked until reliability recovers.

```mermaid
graph TD
    A[Developer Pushes Release] --> B[CI/CD Pipeline]
    B --> C[Check Error Budget]
    C --> D{Budget Remaining?}
    D -->|> 25% remaining| E[Release Approved]
    D -->|10-25% remaining| F[Requires SRE Approval]
    D -->|< 10% remaining| G[Release Blocked]
    E --> H[Deploy to Production]
    F --> I[SRE Reviews]
    I -->|Approved| H
    I -->|Denied| G
    G --> J[Focus on Reliability]
```

## Step 1: Define Your SLOs in Cloud Monitoring

First, set up SLOs that your error budget policies will reference:

```bash
# Create a Cloud Monitoring SLO for your service with the Monitoring API

# This example creates an availability SLO based on good/total request ratio
PROJECT_ID="your-project-id"
SERVICE_ID="your-service-id"
ACCESS_TOKEN="$(gcloud auth print-access-token)"

curl --http1.1 \
    --header "Authorization: Bearer ${ACCESS_TOKEN}" \
    --header "Content-Type: application/json" \
    --request POST \
    --data '{
      "displayName": "API Availability SLO",
      "goal": 0.999,
      "rollingPeriod": "2592000s",
      "serviceLevelIndicator": {
        "requestBased": {
          "goodTotalRatio": {
            "goodServiceFilter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"2xx\"",
            "totalServiceFilter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\""
          }
        }
      }
    }' \
    "https://monitoring.googleapis.com/v3/projects/${PROJECT_ID}/services/${SERVICE_ID}/serviceLevelObjectives?serviceLevelObjectiveId=availability-slo"
```

You can also create SLOs programmatically:

```python
# create_slos.py - Set up SLOs for error budget tracking
from google.cloud import monitoring_v3

client = monitoring_v3.ServiceMonitoringServiceClient()
project_name = "projects/your-project-id"

# Create a service first if it does not exist
service = client.create_service(
    request=monitoring_v3.CreateServiceRequest(
        parent=project_name,
        service_id="api-service",
        service=monitoring_v3.Service(
            display_name="API Service",
            custom=monitoring_v3.Service.Custom(),
        ),
    )
)

service_name = service.name

# Create an availability SLO - 99.9% of requests should succeed
availability_slo = client.create_service_level_objective(
    request=monitoring_v3.CreateServiceLevelObjectiveRequest(
        parent=service_name,
        service_level_objective_id="availability-slo",
        service_level_objective=monitoring_v3.ServiceLevelObjective(
            display_name="API Availability - 99.9%",
            goal=0.999,
            rolling_period={"seconds": 30 * 24 * 3600},  # 30-day rolling window
            service_level_indicator=monitoring_v3.ServiceLevelIndicator(
                request_based=monitoring_v3.RequestBasedSli(
                    good_total_ratio=monitoring_v3.TimeSeriesRatio(
                        good_service_filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="2xx"',
                        total_service_filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"',
                    ),
                ),
            ),
        ),
    )
)

# Create a latency SLO - 99% of requests under 500ms
latency_slo = client.create_service_level_objective(
    request=monitoring_v3.CreateServiceLevelObjectiveRequest(
        parent=service_name,
        service_level_objective_id="latency-slo",
        service_level_objective=monitoring_v3.ServiceLevelObjective(
            display_name="API Latency - 99% under 500ms",
            goal=0.99,
            rolling_period={"seconds": 30 * 24 * 3600},
            service_level_indicator=monitoring_v3.ServiceLevelIndicator(
                request_based=monitoring_v3.RequestBasedSli(
                    distribution_cut=monitoring_v3.DistributionCut(
                        distribution_filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"',
                        range=monitoring_v3.Range(max=500),  # 500ms threshold
                    ),
                ),
            ),
        ),
    )
)

print(f"Availability SLO: {availability_slo.name}")
print(f"Latency SLO: {latency_slo.name}")
```

## Step 2: Build the Error Budget Checker

Create a module that queries current error budget status:

```python
# error_budget_checker.py - Query error budget status from Cloud Monitoring
from datetime import datetime, timedelta, timezone

from google.cloud import monitoring_v3

service_client = monitoring_v3.ServiceMonitoringServiceClient()
metric_client = monitoring_v3.MetricServiceClient()

def get_error_budget_status(project_id, service_id, slo_id):
    """Query the current error budget status for an SLO.
    Returns the remaining error budget as a percentage."""

    slo_name = f"projects/{project_id}/services/{service_id}/serviceLevelObjectives/{slo_id}"

    # Get the SLO definition to know the goal.
    slo = service_client.get_service_level_objective(name=slo_name)
    goal = slo.goal

    # Query Cloud Monitoring's SLO budget-fraction time series.
    now = datetime.now(timezone.utc)
    interval = monitoring_v3.TimeInterval(
        {
            "end_time": {"seconds": int(now.timestamp())},
            "start_time": {"seconds": int((now - timedelta(hours=1)).timestamp())},
        }
    )

    results = metric_client.list_time_series(
        request={
            "name": f"projects/{project_id}",
            "filter": f'select_slo_budget_fraction("{slo_name}")',
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        }
    )

    points = [
        point
        for time_series in results
        for point in time_series.points
    ]
    if not points:
        raise RuntimeError(f"No SLO budget data returned for {slo_name}")

    latest_point = max(points, key=lambda point: point.interval.end_time.seconds)
    budget_remaining_fraction = latest_point.value.double_value
    budget_remaining_pct = budget_remaining_fraction * 100

    return {
        "slo_name": slo_id,
        "goal": goal,
        "budget_remaining_fraction": round(budget_remaining_fraction, 4),
        "budget_remaining_pct": round(budget_remaining_pct, 2),
        "is_budget_exhausted": budget_remaining_fraction <= 0,
    }
```

## Step 3: Implement the Release Gate

Create the release gate that integrates with your CI/CD pipeline:

```python
# release_gate.py - Error budget-based release gate
from datetime import datetime

from error_budget_checker import get_error_budget_status

class ReleaseGate:
    """Controls release approvals based on error budget status.
    Enforces three tiers: auto-approve, require approval, and block."""

    def __init__(self, project_id, service_id, slos):
        self.project_id = project_id
        self.service_id = service_id
        self.slos = slos  # List of SLO IDs to check

        # Policy thresholds - customize these for your org
        self.policy = {
            "auto_approve_threshold": 25,   # Auto-approve if > 25% budget remaining
            "approval_required_threshold": 10,  # Require SRE approval between 10-25%
            "block_threshold": 10,          # Block releases if < 10% remaining
        }

    def check_release(self, release_name, release_type="standard"):
        """Check if a release should be allowed based on current error budgets.
        Returns a decision with reasoning."""

        budget_statuses = []
        for slo_id in self.slos:
            status = get_error_budget_status(
                self.project_id, self.service_id, slo_id
            )
            budget_statuses.append(status)

        # The release decision is based on the worst-case SLO
        min_budget = min(s["budget_remaining_pct"] for s in budget_statuses)
        worst_slo = min(budget_statuses, key=lambda s: s["budget_remaining_pct"])

        # Determine the decision
        if min_budget > self.policy["auto_approve_threshold"]:
            decision = "approved"
            reason = f"Error budget healthy at {min_budget:.1f}% remaining"
        elif min_budget > self.policy["block_threshold"]:
            decision = "approval_required"
            reason = f"Error budget at {min_budget:.1f}% - SRE approval required"
        else:
            decision = "blocked"
            reason = f"Error budget depleted at {min_budget:.1f}% for SLO '{worst_slo['slo_name']}'"

        # Emergency releases can bypass the gate with documentation
        if release_type == "emergency" and decision == "blocked":
            decision = "approval_required"
            reason += " - Emergency release requires VP approval"

        result = {
            "release_name": release_name,
            "decision": decision,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat(),
            "budget_statuses": budget_statuses,
            "min_budget_remaining_pct": min_budget,
        }

        return result

    def log_decision(self, result):
        """Log the release gate decision for audit trail."""
        print(f"\nRelease Gate Decision: {result['release_name']}")
        print(f"  Decision: {result['decision'].upper()}")
        print(f"  Reason: {result['reason']}")
        print(f"  Error Budgets:")
        for status in result['budget_statuses']:
            print(f"    {status['slo_name']}: {status['budget_remaining_pct']:.1f}% remaining")
```

## Step 4: Integrate with Cloud Build

Add the error budget check as a step in your Cloud Build pipeline:

```yaml
# cloudbuild.yaml - CI/CD pipeline with error budget gate
steps:
  # Step 1: Run tests
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'pip install -r requirements.txt && pytest tests/'

  # Step 2: Build the container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-service:$SHORT_SHA', '.']

  # Step 3: Check error budget before deploying
  - name: 'python:3.11'
    entrypoint: 'python'
    args: ['scripts/check_error_budget.py', '--release-name=$SHORT_SHA']
    env:
      - 'PROJECT_ID=$PROJECT_ID'

  # Step 4: Deploy (only runs if error budget check passes)
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'my-service'
      - '--image=gcr.io/$PROJECT_ID/my-service:$SHORT_SHA'
      - '--region=us-central1'
```

The error budget check script:

```python
# scripts/check_error_budget.py - Cloud Build error budget gate
import sys
import os
import argparse

from release_gate import ReleaseGate

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-name", required=True)
    args = parser.parse_args()

    project_id = os.environ.get("PROJECT_ID")

    gate = ReleaseGate(
        project_id=project_id,
        service_id="api-service",
        slos=["availability-slo", "latency-slo"],
    )

    result = gate.check_release(args.release_name)
    gate.log_decision(result)

    if result["decision"] == "blocked":
        print("\nRelease BLOCKED - error budget depleted")
        print("Fix reliability issues before releasing new features")
        sys.exit(1)  # Fail the build
    elif result["decision"] == "approval_required":
        print("\nRelease requires manual SRE approval")
        # In practice, send a Slack notification or create a ticket
        # For now, proceed but log the warning
        sys.exit(0)
    else:
        print("\nRelease APPROVED - error budget healthy")
        sys.exit(0)

if __name__ == "__main__":
    main()
```

## Step 5: Set Up Error Budget Alerts

Create alerts that fire as the error budget gets consumed faster than expected:

```python
# Create tiered alerts for error budget consumption
from google.cloud import monitoring_v3

alert_client = monitoring_v3.AlertPolicyServiceClient()

def create_error_budget_alert(project_id, slo_name, lookback_period, burn_rate_threshold, severity):
    """Create an alert that fires when the SLO burn rate exceeds a threshold."""

    policy = monitoring_v3.AlertPolicy(
        display_name=f"Error Budget Burn Rate Alert - {lookback_period}",
        conditions=[
            monitoring_v3.AlertPolicy.Condition(
                display_name=f"Burn rate above {burn_rate_threshold}x",
                condition_threshold=monitoring_v3.AlertPolicy.Condition.MetricThreshold(
                    filter=f'select_slo_burn_rate("{slo_name}", "{lookback_period}")',
                    comparison=monitoring_v3.ComparisonType.COMPARISON_GT,
                    threshold_value=burn_rate_threshold,
                    duration={"seconds": 0},
                    trigger=monitoring_v3.AlertPolicy.Condition.Trigger(count=1),
                ),
            ),
        ],
        combiner=monitoring_v3.AlertPolicy.ConditionCombinerType.OR,
        notification_channels=["projects/your-project-id/notificationChannels/CHANNEL_ID"],
        severity=monitoring_v3.AlertPolicy.Severity[severity],
    )

    result = alert_client.create_alert_policy(
        parent=f"projects/{project_id}",
        alert_policy=policy,
    )
    return result

# Create tiered alerts
create_error_budget_alert("your-project-id", "slo-name", "24h", 3, "WARNING")
create_error_budget_alert("your-project-id", "slo-name", "6h", 6, "ERROR")
create_error_budget_alert("your-project-id", "slo-name", "1h", 14.4, "CRITICAL")
```

## Step 6: Error Budget Reporting

Create a weekly error budget report for stakeholders:

```sql
-- Weekly error budget consumption report
-- Track how quickly error budget is being consumed
SELECT
    week,
    slo_name,
    budget_remaining_pct,
    budget_consumed_this_week,
    releases_this_week,
    releases_blocked_this_week
FROM `your-project.sre_metrics.weekly_error_budget_report`
ORDER BY week DESC, slo_name;
```

## Monitoring the Gate Itself

Use OneUptime to monitor your error budget checking infrastructure. If the release gate itself is down, releases either get blocked unnecessarily or bypass the gate entirely. Both outcomes are bad. Monitor the availability of your Cloud Monitoring queries, the gate function, and the notification channels.

## Summary

Error budget policies turn the abstract concept of reliability targets into concrete release decisions. The key components are well-defined SLOs in Cloud Monitoring, an automated gate that checks budget status before each release, tiered policies (auto-approve, require approval, block), and alerting that warns you as budgets get consumed. Start with a single critical SLO, implement the gate in your CI/CD pipeline, and expand to more SLOs as your team gets comfortable with the process.
