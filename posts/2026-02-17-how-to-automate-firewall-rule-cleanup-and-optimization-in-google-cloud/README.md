# How to Automate Firewall Rule Cleanup and Optimization in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall, Networking, Security, Automation

Description: Automate the process of identifying and cleaning up unused or overly permissive firewall rules in your Google Cloud VPC networks.

---

Firewall rules accumulate over time. Someone creates a rule for a quick test, another gets added for a migration that finished months ago, and before you know it, you have hundreds of rules with overlapping ranges and no clear owner. Some of them are way more permissive than they need to be.

Cleaning this up manually is tedious and risky. You do not want to delete a rule that something depends on. In this post, I will show you how to build an automated system that identifies unused rules, finds overly permissive configurations, and safely cleans things up.

## Understanding Firewall Rule Usage Data

Google Cloud tracks which firewall rules are actually being matched by traffic. This data is available through the Firewall Insights API and through firewall rule logging. This is the foundation of any cleanup effort.

First, enable firewall rule logging on your VPC network:

```hcl
# firewall-logging.tf
# Enable logging on all firewall rules for usage tracking

resource "google_compute_firewall" "example_rule" {
  name    = "allow-internal"
  network = google_compute_network.vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["10.0.0.0/8"]

  # Enable logging to track rule hits
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
```

## Identifying Unused Firewall Rules

This Python script uses the Compute API and Recommender API to find firewall rules that have not been hit in the past 30 days:

```python
# firewall_analyzer.py
# Identifies unused and overly permissive firewall rules
from google.cloud import compute_v1
from google.cloud import recommender_v2
import json
from datetime import datetime

def get_all_firewall_rules(project_id):
    """Retrieve all firewall rules in the project."""
    client = compute_v1.FirewallsClient()
    rules = []

    for rule in client.list(project=project_id):
        rules.append({
            "name": rule.name,
            "network": rule.network,
            "direction": rule.direction,
            "priority": rule.priority,
            "source_ranges": list(rule.source_ranges),
            "allowed": [
                {"protocol": a.I_p_protocol, "ports": list(a.ports)}
                for a in rule.allowed
            ],
            "disabled": rule.disabled,
            "creation_timestamp": rule.creation_timestamp,
        })

    return rules


def get_firewall_insights(project_id):
    """Get firewall insights from the Recommender API."""
    client = recommender_v2.RecommenderClient()
    parent = (
        f"projects/{project_id}/locations/global/"
        f"insightTypes/google.compute.firewall.Insight"
    )

    insights = []
    for insight in client.list_insights(request={"parent": parent}):
        insights.append({
            "name": insight.name,
            "category": insight.category,
            "description": insight.description,
            "severity": str(insight.severity),
            "state": str(insight.state_info.state),
            "content": dict(insight.content),
        })

    return insights


def find_unused_rules(project_id):
    """Find firewall rules with no hits in the observation period."""
    insights = get_firewall_insights(project_id)

    unused_rules = []
    for insight in insights:
        # Firewall insights with UNUSED category
        if "UNUSED" in insight.get("description", "").upper():
            unused_rules.append(insight)

    return unused_rules


def find_overly_permissive_rules(rules):
    """Identify rules that are more permissive than necessary."""
    issues = []

    for rule in rules:
        problems = []

        # Check for 0.0.0.0/0 source range
        if "0.0.0.0/0" in rule.get("source_ranges", []):
            problems.append("Allows traffic from the entire internet")

        # Check for rules that allow all protocols
        for allow in rule.get("allowed", []):
            if allow["protocol"] == "all":
                problems.append("Allows all protocols")
            elif not allow.get("ports"):
                problems.append(
                    f"Allows all ports for {allow['protocol']}"
                )

        # Check for very low priority rules that might be shadowed
        if rule.get("priority", 1000) > 60000:
            problems.append(
                f"Very low priority ({rule['priority']}) - may never match"
            )

        if problems:
            issues.append({
                "rule_name": rule["name"],
                "problems": problems,
                "direction": rule["direction"],
                "source_ranges": rule.get("source_ranges", []),
            })

    return issues


def generate_cleanup_report(project_id):
    """Generate a comprehensive firewall cleanup report."""
    rules = get_all_firewall_rules(project_id)
    unused = find_unused_rules(project_id)
    permissive = find_overly_permissive_rules(rules)

    report = {
        "generated_at": datetime.now().isoformat(),
        "project": project_id,
        "total_rules": len(rules),
        "unused_rules": unused,
        "overly_permissive_rules": permissive,
        "summary": {
            "unused_count": len(unused),
            "permissive_count": len(permissive),
            "disabled_count": sum(1 for r in rules if r["disabled"]),
        }
    }

    return report


if __name__ == "__main__":
    project = "your-project-id"
    report = generate_cleanup_report(project)
    print(json.dumps(report, indent=2, default=str))
```

## Safe Cleanup Process

Never delete firewall rules directly. Instead, use a staged approach: disable first, wait, then delete.

This script implements a safe cleanup workflow:

```python
# firewall_cleanup.py
# Safely cleans up unused firewall rules using a staged approach
from google.cloud import compute_v1
from google.cloud import storage
import json
import time
from datetime import datetime, timedelta

def stage_rule_for_cleanup(project_id, rule_name, reason):
    """Stage 1: Disable the rule and tag it for future deletion."""
    client = compute_v1.FirewallsClient()

    # Get the current rule
    rule = client.get(project=project_id, firewall=rule_name)

    # Skip if already disabled
    if rule.disabled:
        print(f"Rule {rule_name} is already disabled, skipping")
        return

    # Disable the rule instead of deleting it
    rule.disabled = True

    # Add description noting when it was disabled and why
    disable_note = (
        f" [DISABLED {datetime.now().isoformat()} - {reason}]"
    )
    rule.description = (rule.description or "") + disable_note

    # Apply the change
    operation = client.patch(
        project=project_id,
        firewall=rule_name,
        firewall_resource=rule
    )
    operation.result()  # Wait for completion

    print(f"Disabled rule: {rule_name}")

    # Store a backup of the rule for rollback
    backup_rule(project_id, rule_name, rule)


def backup_rule(project_id, rule_name, rule):
    """Backup a firewall rule before cleanup for easy rollback."""
    client = storage.Client()
    bucket = client.bucket(f"{project_id}-firewall-backups")

    # Serialize the rule to JSON
    rule_data = {
        "name": rule.name,
        "network": rule.network,
        "direction": str(rule.direction),
        "priority": rule.priority,
        "source_ranges": list(rule.source_ranges),
        "allowed": [
            {"protocol": a.I_p_protocol, "ports": list(a.ports)}
            for a in rule.allowed
        ],
        "disabled_at": datetime.now().isoformat(),
    }

    blob = bucket.blob(f"backups/{rule_name}.json")
    blob.upload_from_string(json.dumps(rule_data, indent=2))

    print(f"Backed up rule {rule_name} to GCS")


def delete_stale_disabled_rules(project_id, days_threshold=14):
    """Stage 2: Delete rules that have been disabled for N days."""
    client = compute_v1.FirewallsClient()

    for rule in client.list(project=project_id):
        if not rule.disabled:
            continue

        # Check if the rule was disabled long enough ago
        description = rule.description or ""
        if "[DISABLED" not in description:
            continue

        # Parse the disable date from the description
        try:
            date_str = description.split("[DISABLED ")[1].split(" -")[0]
            disabled_date = datetime.fromisoformat(date_str)

            if datetime.now() - disabled_date > timedelta(days=days_threshold):
                print(f"Deleting rule {rule.name} - disabled for {days_threshold}+ days")
                operation = client.delete(
                    project=project_id,
                    firewall=rule.name
                )
                operation.result()
        except (IndexError, ValueError):
            # Could not parse date, skip this rule
            continue


def rollback_rule(project_id, rule_name):
    """Restore a previously disabled or deleted rule from backup."""
    client = storage.Client()
    bucket = client.bucket(f"{project_id}-firewall-backups")
    blob = bucket.blob(f"backups/{rule_name}.json")

    rule_data = json.loads(blob.download_as_string())

    compute_client = compute_v1.FirewallsClient()
    firewall = compute_v1.Firewall()
    firewall.name = rule_data["name"]
    firewall.network = rule_data["network"]
    firewall.priority = rule_data["priority"]
    firewall.source_ranges = rule_data["source_ranges"]
    firewall.disabled = False

    operation = compute_client.insert(
        project=project_id,
        firewall_resource=firewall
    )
    operation.result()
    print(f"Restored rule {rule_name} from backup")
```

## Scheduling Automated Cleanup

Run the analysis weekly and the cleanup on a schedule:

```yaml
# cloudbuild-firewall-cleanup.yaml
# Weekly firewall rule analysis and cleanup
steps:
  # Generate the cleanup report
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        pip install google-cloud-compute google-cloud-recommender google-cloud-storage
        python firewall_analyzer.py > report.json

  # Disable unused rules (stage 1)
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        python -c "
        import json
        from firewall_cleanup import stage_rule_for_cleanup
        report = json.load(open('report.json'))
        for rule in report['unused_rules']:
            stage_rule_for_cleanup('${PROJECT_ID}', rule['name'], 'Unused per Firewall Insights')
        "

  # Delete rules disabled more than 14 days ago (stage 2)
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        python -c "
        from firewall_cleanup import delete_stale_disabled_rules
        delete_stale_disabled_rules('${PROJECT_ID}', days_threshold=14)
        "

  # Upload report to GCS for review
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        gsutil cp report.json gs://${PROJECT_ID}-firewall-reports/$(date +%Y-%m-%d).json
```

## Optimizing Existing Rules

Beyond cleanup, you can also tighten rules that are too broad. This function suggests more restrictive source ranges based on actual traffic:

```python
def suggest_tighter_ranges(project_id, rule_name, days=30):
    """Analyze actual traffic to suggest tighter source ranges."""
    from google.cloud import bigquery

    bq_client = bigquery.Client()

    # Query firewall log data for actual source IPs
    query = f"""
    SELECT
      jsonPayload.connection.src_ip AS source_ip,
      COUNT(*) AS hit_count
    FROM `{project_id}.firewall_logs.*`
    WHERE
      jsonPayload.rule_details.reference LIKE '%{rule_name}%'
      AND _TABLE_SUFFIX >= FORMAT_DATE(
        '%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
      )
    GROUP BY source_ip
    ORDER BY hit_count DESC
    LIMIT 100
    """

    results = bq_client.query(query).result()
    actual_sources = [row.source_ip for row in results]

    # Suggest CIDR ranges that cover the actual traffic
    # In practice, you would aggregate these into minimal CIDR blocks
    return actual_sources
```

## Monitoring Rule Changes

Set up an alert for when new firewall rules are created, so they do not slip through without review:

```hcl
# monitoring.tf
# Alert on firewall rule creation or modification

resource "google_logging_metric" "firewall_changes" {
  name    = "firewall-rule-changes"
  project = var.project_id
  filter  = <<-EOT
    resource.type="gce_firewall_rule"
    AND (
      protoPayload.methodName="v1.compute.firewalls.insert"
      OR protoPayload.methodName="v1.compute.firewalls.update"
      OR protoPayload.methodName="v1.compute.firewalls.patch"
    )
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}

resource "google_monitoring_alert_policy" "firewall_change_alert" {
  display_name = "Firewall Rule Modified"
  project      = var.project_id

  conditions {
    display_name = "Firewall rule created or modified"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/firewall-rule-changes\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_COUNT"
      }
    }
  }

  notification_channels = var.notification_channels
  alert_strategy {
    auto_close = "1800s"
  }
}
```

## Wrapping Up

Firewall rule cleanup is one of those tasks that everyone knows is important but nobody wants to do manually. Automating the process with a staged disable-wait-delete approach gives you the safety of manual review with the consistency of automation. Start by generating a report of your current rules, identify the low-hanging fruit, and build up to a fully automated weekly cleanup cycle. Your security posture and your network team will both be better for it.
