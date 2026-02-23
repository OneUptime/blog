# How to Use Terraform with Change Advisory Boards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Change Management, CAB, ITIL, DevOps, Compliance

Description: Learn how to integrate Terraform with Change Advisory Board processes to satisfy ITIL requirements while maintaining the speed of infrastructure as code workflows.

---

Change Advisory Boards (CABs) exist in many organizations, especially in regulated industries, to review and approve infrastructure changes before they are applied to production. Terraform workflows need to integrate with these processes so that changes are reviewed, documented, and approved according to organizational policy. The challenge is doing this without turning infrastructure as code into a slow, manual process.

In this guide, we will show you how to integrate Terraform with CAB processes, create automated change requests from Terraform plans, and build approval gates that satisfy compliance requirements while keeping deployments fast.

## Understanding the CAB Process

A typical CAB process follows these steps: someone submits a change request describing what will change, the advisory board reviews the request and assesses the risk, the board approves or rejects the request, the change is implemented during an approved window, and the results are recorded.

The goal of integrating Terraform is to automate as much of this process as possible. Terraform plans contain all the information needed for a change request: what resources will be created, modified, or destroyed, and the specific attribute changes for each resource.

## Generating Change Requests from Terraform Plans

The first step is extracting structured data from a Terraform plan and formatting it as a change request.

```python
#!/usr/bin/env python3
# generate_change_request.py
# Create a CAB change request from a Terraform plan

import json
import subprocess
import sys
from datetime import datetime, timedelta

class ChangeRequestGenerator:
    """Generate change requests from Terraform plans."""

    # Risk classification based on resource types and actions
    RISK_MATRIX = {
        "create": {
            "aws_instance": "medium",
            "aws_rds_instance": "high",
            "aws_vpc": "high",
            "aws_security_group_rule": "high",
            "aws_iam_role": "high",
            "aws_s3_bucket": "medium",
            "aws_lambda_function": "low",
        },
        "update": {
            "aws_instance": "medium",
            "aws_rds_instance": "high",
            "aws_security_group_rule": "critical",
            "aws_iam_policy": "critical",
        },
        "delete": {
            "aws_instance": "high",
            "aws_rds_instance": "critical",
            "aws_vpc": "critical",
            "aws_s3_bucket": "high",
        }
    }

    def __init__(self, plan_json):
        self.plan = plan_json
        self.changes = self._parse_changes()

    def _parse_changes(self):
        """Extract resource changes from the plan."""
        changes = []
        for rc in self.plan.get("resource_changes", []):
            if rc["change"]["actions"] == ["no-op"]:
                continue

            actions = rc["change"]["actions"]
            action_str = "+".join(actions)

            changes.append({
                "address": rc["address"],
                "type": rc["type"],
                "action": action_str,
                "before": rc["change"].get("before", {}),
                "after": rc["change"].get("after", {})
            })
        return changes

    def assess_risk(self):
        """Determine overall risk level of the change."""
        risk_levels = ["low", "medium", "high", "critical"]
        max_risk = "low"

        for change in self.changes:
            for action in change["action"].split("+"):
                resource_risk = self.RISK_MATRIX.get(
                    action, {}
                ).get(change["type"], "medium")

                if risk_levels.index(resource_risk) > risk_levels.index(max_risk):
                    max_risk = resource_risk

        return max_risk

    def generate_summary(self):
        """Create a human-readable summary of changes."""
        creates = [c for c in self.changes if "create" in c["action"]]
        updates = [c for c in self.changes if "update" in c["action"]]
        deletes = [c for c in self.changes if "delete" in c["action"]]

        lines = [
            f"Total changes: {len(self.changes)}",
            f"  Resources to create: {len(creates)}",
            f"  Resources to modify: {len(updates)}",
            f"  Resources to destroy: {len(deletes)}",
            "",
            "Detailed changes:"
        ]

        for change in self.changes:
            lines.append(f"  [{change['action'].upper()}] {change['address']}")

            # Show specific attribute changes for updates
            if "update" in change["action"] and change["before"] and change["after"]:
                before = change["before"] or {}
                after = change["after"] or {}
                for key in set(list(before.keys()) + list(after.keys())):
                    old_val = before.get(key)
                    new_val = after.get(key)
                    if old_val != new_val:
                        lines.append(f"    {key}: {old_val} -> {new_val}")

        return "\n".join(lines)

    def generate_change_request(self, requester, environment):
        """Generate a complete change request document."""
        risk = self.assess_risk()
        summary = self.generate_summary()

        return {
            "title": f"Terraform Infrastructure Change - {environment}",
            "requester": requester,
            "environment": environment,
            "risk_level": risk,
            "category": "Infrastructure",
            "subcategory": "Terraform IaC",
            "summary": summary,
            "resource_count": len(self.changes),
            "implementation_plan": "Automated via Terraform apply",
            "rollback_plan": "Revert Terraform configuration and re-apply",
            "test_plan": "Automated health checks post-apply",
            "scheduled_start": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
            "scheduled_end": (datetime.utcnow() + timedelta(hours=3)).isoformat(),
            "created_at": datetime.utcnow().isoformat(),
            "plan_json": self.plan,
            "requires_cab": risk in ["high", "critical"]
        }

def main():
    # Generate the Terraform plan in JSON format
    result = subprocess.run(
        ["terraform", "show", "-json", "tfplan"],
        capture_output=True, text=True
    )
    plan = json.loads(result.stdout)

    generator = ChangeRequestGenerator(plan)
    cr = generator.generate_change_request(
        requester="platform-team",
        environment="production"
    )

    print(json.dumps(cr, indent=2))

    # Submit to ServiceNow or your change management system
    if cr["requires_cab"]:
        print(f"\nThis change requires CAB approval (risk: {cr['risk_level']})")
    else:
        print(f"\nThis change can be auto-approved (risk: {cr['risk_level']})")

if __name__ == "__main__":
    main()
```

## Submitting Change Requests to ServiceNow

Integrate with ServiceNow to create official change requests.

```python
# servicenow_integration.py
# Submit Terraform change requests to ServiceNow

import requests
import json

class ServiceNowChangeRequest:
    """Create and manage change requests in ServiceNow."""

    def __init__(self, instance_url, username, password):
        self.base_url = f"{instance_url}/api/now/table"
        self.auth = (username, password)
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def create_change_request(self, change_data):
        """Submit a new change request."""
        # Map risk levels to ServiceNow priority
        priority_map = {
            "low": 4,
            "medium": 3,
            "high": 2,
            "critical": 1
        }

        payload = {
            "type": "standard" if change_data["risk_level"] in ["low", "medium"] else "normal",
            "short_description": change_data["title"],
            "description": change_data["summary"],
            "category": change_data["category"],
            "subcategory": change_data["subcategory"],
            "priority": priority_map.get(change_data["risk_level"], 3),
            "risk": change_data["risk_level"],
            "implementation_plan": change_data["implementation_plan"],
            "backout_plan": change_data["rollback_plan"],
            "test_plan": change_data["test_plan"],
            "start_date": change_data["scheduled_start"],
            "end_date": change_data["scheduled_end"],
            "requested_by": change_data["requester"],
            "assignment_group": "Infrastructure Team",
            "u_terraform_plan": json.dumps(change_data.get("plan_json", {}))[:65000]
        }

        response = requests.post(
            f"{self.base_url}/change_request",
            json=payload,
            auth=self.auth,
            headers=self.headers
        )
        response.raise_for_status()

        result = response.json()["result"]
        return {
            "sys_id": result["sys_id"],
            "number": result["number"],
            "state": result["state"]
        }

    def check_approval_status(self, change_number):
        """Check if a change request has been approved."""
        response = requests.get(
            f"{self.base_url}/change_request",
            params={"sysparm_query": f"number={change_number}"},
            auth=self.auth,
            headers=self.headers
        )
        response.raise_for_status()

        results = response.json()["result"]
        if not results:
            return "not_found"

        state = results[0]["state"]
        # ServiceNow states: -5=New, -4=Assess, -3=Authorize, -2=Scheduled, -1=Implement
        state_map = {
            "-5": "new",
            "-4": "assess",
            "-3": "authorize",
            "-2": "scheduled",
            "-1": "implement",
            "0": "review",
            "3": "closed",
            "4": "cancelled"
        }
        return state_map.get(state, "unknown")

    def close_change_request(self, change_number, success, notes):
        """Close a change request after implementation."""
        response = requests.get(
            f"{self.base_url}/change_request",
            params={"sysparm_query": f"number={change_number}"},
            auth=self.auth,
            headers=self.headers
        )
        result = response.json()["result"][0]

        payload = {
            "state": "3",  # Closed
            "close_code": "successful" if success else "unsuccessful",
            "close_notes": notes
        }

        requests.patch(
            f"{self.base_url}/change_request/{result['sys_id']}",
            json=payload,
            auth=self.auth,
            headers=self.headers
        )
```

## CI/CD Pipeline with CAB Gate

Integrate the CAB approval process into your CI/CD pipeline.

```yaml
# .github/workflows/terraform-with-cab.yml
name: Terraform with CAB Approval

on:
  push:
    branches: [main]
    paths: ['terraform/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      change_number: ${{ steps.submit_cr.outputs.change_number }}
      risk_level: ${{ steps.assess.outputs.risk_level }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        run: |
          cd terraform
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: Assess risk and generate change request
        id: assess
        run: |
          RISK=$(python3 scripts/generate_change_request.py plan.json | jq -r '.risk_level')
          echo "risk_level=$RISK" >> $GITHUB_OUTPUT

      - name: Submit change request to ServiceNow
        id: submit_cr
        if: steps.assess.outputs.risk_level == 'high' || steps.assess.outputs.risk_level == 'critical'
        run: |
          CR_NUMBER=$(python3 scripts/submit_to_servicenow.py plan.json)
          echo "change_number=$CR_NUMBER" >> $GITHUB_OUTPUT

      - name: Upload plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: terraform/tfplan

  wait-for-approval:
    needs: plan
    if: needs.plan.outputs.change_number != ''
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wait for CAB approval
        run: |
          CR_NUMBER="${{ needs.plan.outputs.change_number }}"
          MAX_WAIT=7200  # 2 hours
          ELAPSED=0

          while [ $ELAPSED -lt $MAX_WAIT ]; do
            STATUS=$(python3 scripts/check_approval.py "$CR_NUMBER")
            echo "Change $CR_NUMBER status: $STATUS"

            if [ "$STATUS" = "scheduled" ] || [ "$STATUS" = "implement" ]; then
              echo "Change approved! Proceeding with apply."
              exit 0
            elif [ "$STATUS" = "cancelled" ]; then
              echo "Change rejected by CAB."
              exit 1
            fi

            sleep 60
            ELAPSED=$((ELAPSED + 60))
          done

          echo "Timed out waiting for approval"
          exit 1

  apply:
    needs: [plan, wait-for-approval]
    if: always() && (needs.wait-for-approval.result == 'success' || needs.plan.outputs.change_number == '')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan
          path: terraform/

      - name: Terraform Apply
        run: |
          cd terraform
          terraform init
          terraform apply tfplan

      - name: Close change request
        if: needs.plan.outputs.change_number != ''
        run: |
          python3 scripts/close_change_request.py \
            "${{ needs.plan.outputs.change_number }}" \
            "success" \
            "Terraform apply completed successfully"
```

## Standard vs Normal Changes

Not all changes need full CAB review. Standard changes are pre-approved and can flow through automatically.

```hcl
# Define standard change types that skip CAB
variable "standard_change_types" {
  description = "Resource types that qualify as standard changes"
  type        = set(string)
  default = [
    "aws_cloudwatch_log_group",
    "aws_cloudwatch_metric_alarm",
    "aws_autoscaling_policy",
    "aws_ssm_parameter",
    "aws_lambda_function",
    "aws_lambda_permission",
  ]
}

# Tag resources to indicate their change classification
resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  runtime       = "python3.12"
  handler       = "index.handler"
  role          = aws_iam_role.lambda.arn
  filename      = "function.zip"

  tags = {
    ChangeType = "standard"  # Pre-approved, no CAB needed
  }
}
```

## Best Practices

Automate change request generation completely. Never ask engineers to manually fill out change request forms. The Terraform plan contains all the information needed.

Classify changes by risk automatically. Low-risk changes like updating a Lambda function should not require the same approval process as modifying a production database.

Include rollback plans in every change request. Terraform makes this easy because the rollback plan is simply reverting the configuration and running apply again.

Close change requests automatically after apply. Whether the apply succeeds or fails, update the change request with the outcome.

Keep the CAB feedback loop fast. If CAB approval takes days, teams will find ways around the process. Aim for same-day approval for standard changes and next-CAB-meeting approval for normal changes.

For more on Terraform CI/CD integration, see our guide on [Terraform Pipeline with GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view).

## Conclusion

Integrating Terraform with Change Advisory Board processes does not have to slow down your deployments. By automatically generating change requests from Terraform plans, classifying risk levels, and building approval gates into your CI/CD pipeline, you can satisfy compliance requirements while maintaining the speed of infrastructure as code. The key is automation: the less manual work involved in the change management process, the more likely teams are to follow it consistently.
