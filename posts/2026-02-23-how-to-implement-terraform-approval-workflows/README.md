# How to Implement Terraform Approval Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Approval Workflow, DevOps, GitOps, Governance

Description: Learn how to implement robust Terraform approval workflows that balance speed with governance, ensuring infrastructure changes are reviewed and approved before deployment.

---

Infrastructure changes can have far-reaching consequences. A misconfigured security group can expose sensitive data. An accidental resource deletion can cause hours of downtime. Terraform approval workflows provide a safety net by ensuring that changes are reviewed and approved before they are applied to production environments.

In this guide, we will explore how to implement approval workflows that are both rigorous and efficient.

## The Approval Workflow Spectrum

Not every change needs the same level of scrutiny. A developer adding a tag to a resource in a dev environment does not need the same approval process as someone modifying a production database. Design your workflows with this in mind:

```yaml
# approval-config.yaml
# Define approval requirements based on risk level

approval_rules:
  # Low risk: auto-approve after passing automated checks
  low_risk:
    conditions:
      - environment: ["dev", "sandbox"]
      - change_type: ["add_only"]
      - resource_count_max: 5
    approvers: []
    auto_approve: true

  # Medium risk: single reviewer required
  medium_risk:
    conditions:
      - environment: ["staging"]
      - change_type: ["add", "modify"]
      - resource_count_max: 20
    approvers:
      - team_lead
    required_approvals: 1

  # High risk: multiple reviewers required
  high_risk:
    conditions:
      - environment: ["production"]
      - change_type: ["any"]
    approvers:
      - team_lead
      - security_team
      - platform_team
    required_approvals: 2

  # Critical risk: requires security and management approval
  critical_risk:
    conditions:
      - resource_types: ["aws_iam_*", "aws_kms_*", "aws_organizations_*"]
      - change_type: ["destroy"]
      - environment: ["production"]
    approvers:
      - security_lead
      - engineering_director
    required_approvals: 2
```

## Implementing GitHub-Based Approval Workflows

For teams using GitHub, pull request reviews are a natural fit for Terraform approvals:

```yaml
# .github/workflows/terraform-approval.yaml
name: Terraform Approval Workflow

on:
  pull_request:
    paths: ['infrastructure/**']

jobs:
  classify-risk:
    runs-on: ubuntu-latest
    outputs:
      risk_level: ${{ steps.classify.outputs.risk_level }}
    steps:
      - uses: actions/checkout@v4

      - name: Terraform Plan
        id: plan
        run: |
          terraform init
          terraform plan -out=tfplan -json > plan.json
          terraform show -json tfplan > plan-details.json

      - name: Classify Risk Level
        id: classify
        run: |
          # Analyze the plan to determine risk level
          python scripts/classify-risk.py plan-details.json

      - name: Post Plan Summary
        uses: actions/github-script@v7
        with:
          script: |
            const plan = require('./plan-summary.json');
            const riskLevel = '${{ steps.classify.outputs.risk_level }}';

            const body = `## Terraform Plan Summary

            **Risk Level:** ${riskLevel}

            | Action | Count |
            |--------|-------|
            | Add    | ${plan.add} |
            | Change | ${plan.change} |
            | Destroy | ${plan.destroy} |

            ### Required Approvals
            ${riskLevel === 'critical' ? '- Security Lead\n- Engineering Director' :
              riskLevel === 'high' ? '- Team Lead\n- Platform Team' :
              riskLevel === 'medium' ? '- Team Lead' :
              'Auto-approved (low risk)'}`;

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });

  enforce-approvals:
    needs: classify-risk
    runs-on: ubuntu-latest
    if: needs.classify-risk.outputs.risk_level != 'low'
    steps:
      - name: Check Required Approvals
        uses: actions/github-script@v7
        with:
          script: |
            const riskLevel = '${{ needs.classify-risk.outputs.risk_level }}';
            const reviews = await github.rest.pulls.listReviews({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number
            });

            const approvals = reviews.data.filter(
              r => r.state === 'APPROVED'
            );

            const requiredCount = {
              'medium': 1,
              'high': 2,
              'critical': 2
            }[riskLevel];

            if (approvals.length < requiredCount) {
              core.setFailed(
                `Need ${requiredCount} approvals, have ${approvals.length}`
              );
            }
```

## Building a Risk Classification Engine

Automatically classify the risk level of each Terraform change:

```python
# scripts/classify-risk.py
# Classify the risk level of a Terraform plan

import json
import sys

# Resources that always require extra review
SENSITIVE_RESOURCES = [
    "aws_iam_role",
    "aws_iam_policy",
    "aws_kms_key",
    "aws_security_group",
    "aws_db_instance",
    "aws_rds_cluster",
    "aws_s3_bucket",
    "aws_organizations_account"
]

def classify_risk(plan_file):
    """Determine the risk level of a Terraform plan."""
    with open(plan_file) as f:
        plan = json.load(f)

    changes = plan.get("resource_changes", [])

    # Count operations
    adds = len([c for c in changes if "create" in c["change"]["actions"]])
    modifies = len([c for c in changes if "update" in c["change"]["actions"]])
    destroys = len([c for c in changes if "delete" in c["change"]["actions"]])

    # Check for sensitive resources
    sensitive_changes = [
        c for c in changes
        if any(c["type"].startswith(s.replace("*", ""))
               for s in SENSITIVE_RESOURCES)
    ]

    # Determine risk level
    if destroys > 10 or len(sensitive_changes) > 5:
        return "critical"
    elif destroys > 0 or len(sensitive_changes) > 0:
        return "high"
    elif modifies > 0:
        return "medium"
    else:
        return "low"

if __name__ == "__main__":
    risk = classify_risk(sys.argv[1])
    print(f"::set-output name=risk_level::{risk}")
```

## Implementing Slack-Based Approvals

For organizations that want approvals outside of Git, integrate with Slack:

```python
# scripts/slack-approval.py
# Send approval requests via Slack and wait for responses

import requests
import json
import time

def request_approval(plan_summary, workspace, approvers, webhook_url):
    """Send an approval request to Slack."""
    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"Terraform Approval Request: {workspace}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*Changes:* +{plan_summary['add']} "
                    f"~{plan_summary['change']} "
                    f"-{plan_summary['destroy']}\n"
                    f"*Requested by:* {plan_summary['user']}\n"
                    f"*PR:* {plan_summary['pr_url']}"
                )
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Approve"},
                    "style": "primary",
                    "action_id": "approve_terraform",
                    "value": plan_summary["plan_id"]
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Reject"},
                    "style": "danger",
                    "action_id": "reject_terraform",
                    "value": plan_summary["plan_id"]
                }
            ]
        }
    ]

    # Send to each approver channel
    for approver in approvers:
        requests.post(webhook_url, json={
            "channel": approver,
            "blocks": blocks
        })
```

## Time-Bound Approvals

Implement expiring approvals so that stale plans do not get applied:

```python
# scripts/approval-manager.py
# Manage time-bound approval states

from datetime import datetime, timedelta

class ApprovalManager:
    def __init__(self, store):
        self.store = store

    def create_approval_request(self, plan_id, plan_hash, ttl_hours=4):
        """Create a new approval request with expiration."""
        expiry = datetime.utcnow() + timedelta(hours=ttl_hours)

        self.store.put({
            "plan_id": plan_id,
            "plan_hash": plan_hash,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expiry.isoformat(),
            "approvals": [],
            "rejections": []
        })

    def approve(self, plan_id, approver):
        """Record an approval if the request has not expired."""
        request = self.store.get(plan_id)

        if datetime.utcnow() > datetime.fromisoformat(request["expires_at"]):
            raise ValueError("Approval request has expired. Please re-plan.")

        request["approvals"].append({
            "approver": approver,
            "timestamp": datetime.utcnow().isoformat()
        })

        self.store.update(plan_id, request)

    def is_approved(self, plan_id, required_count=2):
        """Check if a plan has enough valid approvals."""
        request = self.store.get(plan_id)

        if datetime.utcnow() > datetime.fromisoformat(request["expires_at"]):
            return False

        return len(request["approvals"]) >= required_count
```

## Implementing Emergency Override Procedures

Sometimes you need to bypass the approval process for emergencies. Build this in as a controlled exception:

```yaml
# .github/workflows/emergency-apply.yaml
name: Emergency Terraform Apply

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for emergency apply'
        required: true
      incident_id:
        description: 'Incident ticket ID'
        required: true

jobs:
  emergency-apply:
    runs-on: ubuntu-latest
    environment: emergency-production
    steps:
      - uses: actions/checkout@v4

      # Log the emergency override
      - name: Log Emergency Override
        run: |
          python scripts/audit-logger.py log-emergency \
            --user "${{ github.actor }}" \
            --reason "${{ github.event.inputs.reason }}" \
            --incident "${{ github.event.inputs.incident_id }}"

      - name: Terraform Apply
        run: terraform apply -auto-approve

      # Notify security team about the emergency override
      - name: Notify Security Team
        run: |
          curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"Emergency Terraform apply by ${{ github.actor }}. Reason: ${{ github.event.inputs.reason }}. Incident: ${{ github.event.inputs.incident_id }}\"}"
```

## Best Practices for Approval Workflows

Scale approvals to risk, not to habit. Low-risk changes should flow quickly. Reserve multi-person approvals for changes that truly warrant them.

Make the plan output easy to review. A reviewer who cannot understand what is changing cannot provide meaningful approval. Invest in plan summarization tools that highlight the important parts.

Ensure plan and apply consistency. The plan that was reviewed must be the same plan that gets applied. Use plan files and hash verification to prevent drift between review and deployment.

Track approval metrics. Measure how long approvals take, how often they are rejected, and what the common reasons for rejection are. Use this data to improve both your processes and your modules.

Always provide an emergency escape hatch. Incidents happen, and sometimes you need to apply changes immediately. Build a controlled emergency override process that logs everything and notifies the right people.

## Conclusion

Terraform approval workflows are about finding the right balance between speed and safety. By automatically classifying risk, routing approvals to the right people, and providing clear plan summaries, you can maintain strong governance without creating bottlenecks. The goal is not to slow things down but to ensure that the right eyes see the right changes before they hit production.
