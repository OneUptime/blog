# How to Handle Terraform Incident Post-Mortems

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Incident Management, Post-Mortem, DevOps, Reliability

Description: Learn how to conduct effective post-mortems for Terraform-related incidents, including investigation techniques, root cause analysis, and systematic approaches to preventing recurrence.

---

When a Terraform change causes an outage, the post-mortem process is your opportunity to learn from the incident and prevent similar issues in the future. Terraform-related incidents have unique characteristics that require specialized investigation techniques. The declarative nature of Terraform, its state management, and the gap between plan and apply all create specific categories of failures that need to be understood.

In this guide, we will cover how to conduct thorough post-mortems for Terraform-related incidents.

## The Terraform Incident Landscape

Terraform incidents typically fall into several categories. State file corruption or loss, unexpected resource destruction, drift between planned and actual changes, provider bugs, race conditions with concurrent operations, and permission escalation through misconfigured IAM resources. Each category requires different investigation approaches.

## Setting Up the Post-Mortem Framework

Create a structured template specifically for Terraform incidents:

```yaml
# post-mortem/template.yaml
# Terraform Incident Post-Mortem Template

incident:
  id: "INC-XXXX"
  date: "YYYY-MM-DD"
  severity: "P1/P2/P3"
  duration: "X hours Y minutes"
  impact: "Description of customer/business impact"

timeline:
  detected: "HH:MM UTC - How was it detected?"
  acknowledged: "HH:MM UTC - Who acknowledged?"
  mitigated: "HH:MM UTC - What was the mitigation?"
  resolved: "HH:MM UTC - How was it fully resolved?"

terraform_context:
  workspace: "Which workspace was affected?"
  operation: "plan/apply/destroy/import"
  resources_affected: "Which resources were impacted?"
  state_impact: "Was state corrupted or lost?"
  plan_output: "Link to the plan that was approved"
  apply_log: "Link to the apply log"
  commit_sha: "Which commit triggered the change?"
  pr_url: "Link to the PR that was merged"

root_cause:
  category: "state/config/provider/permission/process"
  description: "Detailed root cause explanation"
  contributing_factors:
    - "Factor 1"
    - "Factor 2"

action_items:
  - id: "ACTION-001"
    description: "What needs to be done"
    owner: "Who is responsible"
    due_date: "When is it due"
    priority: "P1/P2/P3"
    status: "open/in-progress/done"
```

## Investigation Techniques

When investigating a Terraform incident, follow a systematic approach:

```bash
#!/bin/bash
# scripts/investigate-incident.sh
# Systematic investigation script for Terraform incidents

WORKSPACE=$1
TIMESTAMP=$2

echo "=== Investigating Terraform Incident ==="
echo "Workspace: $WORKSPACE"
echo "Timeframe: around $TIMESTAMP"

# Step 1: Check state file history
echo "--- State File History ---"
aws s3api list-object-versions \
  --bucket myorg-terraform-state \
  --prefix "$WORKSPACE/terraform.tfstate" \
  --query 'Versions[].{VersionId:VersionId,LastModified:LastModified,Size:Size}' \
  --output table

# Step 2: Check DynamoDB lock history
echo "--- Lock Table Activity ---"
aws dynamodb query \
  --table-name terraform-locks \
  --key-condition-expression "LockID = :lid" \
  --expression-attribute-values "{\":lid\":{\"S\":\"myorg-terraform-state/$WORKSPACE/terraform.tfstate\"}}"

# Step 3: Check CloudTrail for API calls
echo "--- CloudTrail Events ---"
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=sts.amazonaws.com \
  --start-time "$TIMESTAMP" \
  --max-results 50

# Step 4: Check CI/CD pipeline logs
echo "--- Recent Pipeline Runs ---"
gh run list --workflow=terraform-deploy.yml --limit=10
```

## Analyzing State File Changes

State file analysis is critical for many Terraform incidents:

```python
# scripts/analyze-state-diff.py
# Compare two versions of a Terraform state file

import json
import sys

def analyze_state_diff(old_state_file, new_state_file):
    """Compare two state files and identify changes."""
    with open(old_state_file) as f:
        old_state = json.load(f)
    with open(new_state_file) as f:
        new_state = json.load(f)

    old_resources = {
        r["module"] + "." + r["type"] + "." + r["name"]: r
        for r in flatten_resources(old_state)
    }
    new_resources = {
        r["module"] + "." + r["type"] + "." + r["name"]: r
        for r in flatten_resources(new_state)
    }

    # Find resources that were removed
    removed = set(old_resources.keys()) - set(new_resources.keys())
    if removed:
        print("REMOVED RESOURCES:")
        for r in removed:
            print(f"  - {r}")

    # Find resources that were added
    added = set(new_resources.keys()) - set(old_resources.keys())
    if added:
        print("ADDED RESOURCES:")
        for r in added:
            print(f"  + {r}")

    # Find resources that were modified
    common = set(old_resources.keys()) & set(new_resources.keys())
    for r in common:
        if old_resources[r] != new_resources[r]:
            print(f"MODIFIED: {r}")
            diff_attributes(old_resources[r], new_resources[r])

def flatten_resources(state):
    """Flatten resources from state file."""
    resources = []
    for resource in state.get("resources", []):
        module = resource.get("module", "root")
        for instance in resource.get("instances", []):
            resources.append({
                "module": module,
                "type": resource["type"],
                "name": resource["name"],
                "attributes": instance.get("attributes", {})
            })
    return resources

def diff_attributes(old, new):
    """Show attribute-level differences."""
    old_attrs = old.get("attributes", {})
    new_attrs = new.get("attributes", {})

    for key in set(list(old_attrs.keys()) + list(new_attrs.keys())):
        old_val = old_attrs.get(key)
        new_val = new_attrs.get(key)
        if old_val != new_val:
            print(f"    {key}: {old_val} -> {new_val}")
```

## Common Root Causes and Prevention

Document the most common root causes for organizational learning:

```yaml
# post-mortem/common-root-causes.yaml
# Catalog of common Terraform incident root causes

root_causes:
  state_corruption:
    description: "State file became inconsistent with actual infrastructure"
    common_triggers:
      - "Concurrent terraform apply operations"
      - "Manual resource modifications outside Terraform"
      - "State file edited directly"
    prevention:
      - "Use DynamoDB locking for all state operations"
      - "Implement drift detection pipeline"
      - "Lock down console access for Terraform-managed resources"

  unexpected_destruction:
    description: "Resources were destroyed that should have been preserved"
    common_triggers:
      - "Renaming resources without using moved blocks"
      - "Changing resource keys in for_each"
      - "Removing resources from configuration without state rm"
    prevention:
      - "Use lifecycle prevent_destroy on critical resources"
      - "Implement destroy protection in CI/CD"
      - "Review plan output for any destroy operations"

  permission_escalation:
    description: "IAM changes granted broader access than intended"
    common_triggers:
      - "Wildcard resource ARNs in IAM policies"
      - "Copy-paste of overly permissive policy templates"
      - "Missing condition clauses in trust policies"
    prevention:
      - "Automated IAM policy analysis in CI"
      - "Require security team review for IAM changes"
      - "Use OPA policies to check IAM configurations"

  provider_behavior_change:
    description: "Provider update changed resource behavior"
    common_triggers:
      - "Provider version upgrade with breaking changes"
      - "API behavior change from cloud provider"
      - "Deprecated attribute removed in new version"
    prevention:
      - "Pin provider versions"
      - "Test provider upgrades in staging first"
      - "Subscribe to provider release notes"
```

## Conducting the Post-Mortem Meeting

Structure the post-mortem meeting for maximum learning:

```yaml
# post-mortem/meeting-agenda.yaml
# Post-mortem meeting structure

agenda:
  - item: "Set the tone"
    duration: "5 minutes"
    notes: >
      Remind everyone this is blameless. We are here to
      learn and improve systems, not to assign blame.

  - item: "Timeline review"
    duration: "15 minutes"
    notes: >
      Walk through the timeline of events. Focus on facts,
      not interpretations. Everyone should agree on what happened.

  - item: "Root cause analysis"
    duration: "20 minutes"
    notes: >
      Use the 5 Whys technique to dig into the root cause.
      Look for systemic issues, not individual mistakes.

  - item: "What went well"
    duration: "10 minutes"
    notes: >
      Identify what worked during the incident response.
      Good detection, fast mitigation, or effective communication.

  - item: "What could be improved"
    duration: "15 minutes"
    notes: >
      Identify specific improvements to prevent recurrence.
      Focus on systemic changes, not individual behavior.

  - item: "Action items"
    duration: "10 minutes"
    notes: >
      Define specific, assignable, measurable action items.
      Each item needs an owner and due date.
```

## Implementing Action Items

Ensure post-mortem action items actually get implemented:

```python
# scripts/track-action-items.py
# Track post-mortem action items to completion

action_items = {
    "INC-1234": [
        {
            "id": "ACTION-001",
            "description": "Add lifecycle prevent_destroy to all RDS instances",
            "owner": "alice",
            "due_date": "2026-03-15",
            "status": "in-progress",
            "pr_url": "https://github.com/myorg/infra/pull/456"
        },
        {
            "id": "ACTION-002",
            "description": "Add CI check that flags any plan with destroy operations on production databases",
            "owner": "bob",
            "due_date": "2026-03-22",
            "status": "open",
            "pr_url": None
        },
        {
            "id": "ACTION-003",
            "description": "Update onboarding guide with resource renaming best practices",
            "owner": "charlie",
            "due_date": "2026-03-08",
            "status": "done",
            "pr_url": "https://github.com/myorg/infra/pull/450"
        }
    ]
}

# Calculate completion rate
for incident_id, items in action_items.items():
    total = len(items)
    done = len([i for i in items if i["status"] == "done"])
    overdue = len([
        i for i in items
        if i["status"] != "done" and i["due_date"] < "2026-02-23"
    ])
    print(f"{incident_id}: {done}/{total} complete, {overdue} overdue")
```

## Building Institutional Knowledge

Share lessons learned across the organization:

```yaml
# post-mortem/knowledge-base.yaml
# Lessons learned from Terraform incidents

lessons:
  - lesson: "Always use moved blocks when renaming resources"
    incident: "INC-1234"
    date: "2026-01-15"
    impact: "30 minutes production downtime"
    details: >
      Renaming an aws_instance resource caused Terraform to
      destroy the old resource and create a new one. Using a
      moved block would have preserved the resource.

  - lesson: "Test provider upgrades in staging before production"
    incident: "INC-1198"
    date: "2025-12-03"
    impact: "2 hours degraded performance"
    details: >
      AWS provider 5.30 changed default behavior for
      aws_security_group rules. Testing in staging first
      would have caught this.

  - lesson: "Never run terraform apply from your laptop"
    incident: "INC-1156"
    date: "2025-11-15"
    impact: "15 minutes production outage"
    details: >
      An engineer ran terraform apply locally with stale
      state, causing drift. All applies should go through CI/CD.
```

## Best Practices

Keep post-mortems blameless. The goal is to improve systems, not to punish people. If an engineer made a mistake, the question is "why did the system allow this mistake to have this impact?"

Investigate even near-misses. If a plan would have caused an outage but was caught in review, that is still worth a post-mortem to understand how the problematic plan was created.

Track action item completion. Post-mortems without follow-through are just meetings. Assign owners, set deadlines, and track progress.

Share lessons broadly. A lesson learned by one team should benefit all teams. Publish post-mortem summaries and add common root causes to your onboarding materials.

Review past incidents periodically. Quarterly reviews of past incidents help identify patterns that individual post-mortems might miss.

## Conclusion

Terraform incident post-mortems are essential for building reliable infrastructure practices. By using structured investigation techniques, conducting blameless post-mortem meetings, and systematically implementing action items, you transform each incident into an opportunity to strengthen your infrastructure management practices. The investment in thorough post-mortems pays dividends in fewer and less severe incidents over time.
