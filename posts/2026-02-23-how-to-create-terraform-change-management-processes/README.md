# How to Create Terraform Change Management Processes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Change Management, DevOps, Governance, Infrastructure as Code

Description: Implement a Terraform change management process that balances the need for fast infrastructure changes with proper risk assessment, approval, and audit requirements.

---

Change management for Terraform is the process of controlling how infrastructure modifications move from idea to production. Without it, teams make changes ad hoc, skip reviews during time pressure, and discover problems only after they hit production. With it, every change is assessed, approved, documented, and reversible.

The challenge is building a process that is thorough enough to prevent catastrophic mistakes without being so heavy that it slows your team to a crawl. This guide shows you how to find that balance.

## Why Terraform Needs Change Management

Terraform changes are different from application deployments. An application deployment that fails can usually be rolled back by redeploying the previous version. A Terraform apply that fails might leave infrastructure in a partially modified state that requires manual intervention to fix.

Additionally, Terraform changes can affect multiple services simultaneously. A change to a VPC routing table affects every service in that VPC. A change to an IAM policy affects every service that assumes that role. The blast radius of infrastructure changes demands a structured approach.

## Change Classification Framework

Not all changes carry the same risk. Classify changes to apply appropriate levels of scrutiny:

### Low Risk Changes

```markdown
# Low Risk - Standard Process
Examples:
- Adding or updating resource tags
- Updating variable descriptions
- Adding outputs to existing resources
- Updating module documentation

Process:
- 1 reviewer required
- Automated checks must pass
- Can be applied during business hours without coordination
- No change advisory board (CAB) review needed
```

### Medium Risk Changes

```markdown
# Medium Risk - Enhanced Process
Examples:
- Scaling resources up or down
- Adding new non-stateful resources
- Modifying security group rules
- Updating provider versions (minor)

Process:
- 2 reviewers required (including domain expert)
- Automated checks + security scan must pass
- Applied during business hours with team notification
- Plan output reviewed by second pair of eyes
```

### High Risk Changes

```markdown
# High Risk - Full Process
Examples:
- Modifying database configurations
- Changing network routing
- Updating IAM policies
- Any change that forces resource replacement

Process:
- 2 reviewers + platform lead approval
- Full security review
- Change advisory board (CAB) notification
- Applied during maintenance window
- Rollback plan documented and tested
- Communication plan for affected stakeholders
```

### Critical Risk Changes

```markdown
# Critical Risk - Maximum Process
Examples:
- Migration to new infrastructure
- Major version upgrades (provider or Terraform core)
- Changes affecting multiple production services
- Modifications to state backend configuration

Process:
- Architecture review required
- CAB approval required
- Dry run in staging with full validation
- Applied during scheduled maintenance window
- All stakeholders notified in advance
- On-call team aware and standing by
- Detailed rollback plan with time estimates
```

## Implementing the Change Request Process

### Change Request Template

```markdown
# Terraform Change Request

## Change ID: CR-2026-0223-001

## Classification
- [ ] Low Risk
- [ ] Medium Risk
- [ ] High Risk
- [ ] Critical Risk

## Description
[What infrastructure is being changed and why]

## Business Justification
[Link to ticket, incident, or business requirement]

## Technical Details
### Resources Affected
[List all Terraform resources that will be created, modified, or destroyed]

### Plan Output Summary
```
Plan: X to add, Y to change, Z to destroy.
```text

### Dependencies
[Other changes or services that depend on this change]

## Impact Assessment
### Downtime Expected: [Yes/No, duration]
### Services Affected: [List of services]
### Users Affected: [Scope of user impact]

## Schedule
### Requested Apply Time: [Date and time]
### Maintenance Window Required: [Yes/No]
### Estimated Duration: [Time to apply and verify]

## Rollback Plan
[Step-by-step instructions to revert the change]
### Rollback Time Estimate: [Duration]
### Rollback Tested: [Yes/No]

## Approvals
- [ ] Technical Reviewer 1: ___________
- [ ] Technical Reviewer 2: ___________
- [ ] Platform Lead: ___________
- [ ] CAB (if high/critical): ___________
```

## Automating Change Classification

Build automation that classifies changes based on the Terraform plan:

```python
# scripts/classify_change.py
# Analyzes terraform plan JSON to classify change risk

import json
import sys

HIGH_RISK_RESOURCES = [
    'aws_db_instance', 'aws_rds_cluster',
    'aws_elasticache_cluster', 'aws_efs_file_system',
    'aws_s3_bucket', 'aws_kms_key',
]

SECURITY_RESOURCES = [
    'aws_security_group', 'aws_security_group_rule',
    'aws_iam_role', 'aws_iam_policy',
    'aws_iam_role_policy_attachment',
]

def classify_plan(plan_file):
    with open(plan_file) as f:
        plan = json.load(f)

    risk_level = "low"
    reasons = []

    for change in plan.get('resource_changes', []):
        actions = change['change']['actions']
        resource_type = change['type']
        address = change['address']

        # Critical: Stateful resource destruction
        if 'delete' in actions and resource_type in HIGH_RISK_RESOURCES:
            risk_level = "critical"
            reasons.append(f"Destroying stateful resource: {address}")

        # High: Stateful resource replacement
        elif actions == ['delete', 'create'] and resource_type in HIGH_RISK_RESOURCES:
            risk_level = max_risk(risk_level, "high")
            reasons.append(f"Replacing stateful resource: {address}")

        # High: Security resource modification
        elif 'update' in actions and resource_type in SECURITY_RESOURCES:
            risk_level = max_risk(risk_level, "high")
            reasons.append(f"Modifying security resource: {address}")

        # Medium: Any resource modification
        elif 'update' in actions:
            risk_level = max_risk(risk_level, "medium")
            reasons.append(f"Modifying resource: {address}")

    print(f"Risk Level: {risk_level.upper()}")
    print(f"Reasons:")
    for reason in reasons:
        print(f"  - {reason}")

    return risk_level

def max_risk(current, new):
    order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    return new if order.get(new, 0) > order.get(current, 0) else current

if __name__ == "__main__":
    classify_plan(sys.argv[1])
```

Integrate this into your CI pipeline:

```yaml
# .github/workflows/change-classification.yml
- name: Classify Change Risk
  run: |
    terraform show -json tfplan > plan.json
    RISK=$(python scripts/classify_change.py plan.json)

    # Label the PR based on risk
    if echo "$RISK" | grep -q "CRITICAL"; then
      gh pr edit ${{ github.event.number }} --add-label "risk:critical"
    elif echo "$RISK" | grep -q "HIGH"; then
      gh pr edit ${{ github.event.number }} --add-label "risk:high"
    fi
```

## Change Windows and Freezes

Define when changes can be applied:

```markdown
# Change Windows

## Standard Changes (Low/Medium Risk)
- Monday through Thursday, 9 AM - 4 PM local time
- Not during company-wide events or peak traffic periods

## Significant Changes (High Risk)
- Tuesday and Wednesday, 10 AM - 2 PM local time
- With platform team available for support

## Critical Changes
- Scheduled maintenance windows only
- Typically Saturday 2 AM - 6 AM local time
- All stakeholders notified 48 hours in advance

## Change Freezes
- No changes during holiday periods (Dec 20 - Jan 5)
- No changes during major product launches (48 hours before/after)
- No changes on Fridays (to avoid weekend incidents)
- Emergency changes exempt with VP approval
```

## Audit Trail

Maintain an audit trail of all Terraform changes:

```yaml
# Post-apply webhook to record the change
- name: Record Change in Audit Log
  if: success()
  run: |
    # Record the change details
    cat <<EOF > /tmp/audit_entry.json
    {
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "change_id": "CR-$(date +%Y%m%d)-${{ github.run_number }}",
      "actor": "${{ github.actor }}",
      "environment": "production",
      "pr_number": "${{ github.event.number }}",
      "plan_summary": "$(grep 'Plan:' /tmp/plan_output.txt)",
      "status": "applied",
      "commit_sha": "${{ github.sha }}"
    }
    EOF

    # Send to audit logging system
    aws s3 cp /tmp/audit_entry.json \
      "s3://company-audit-logs/terraform/$(date +%Y/%m/%d)/$(date +%H%M%S).json"
```

## Continuous Improvement

Review your change management process regularly:

```markdown
# Quarterly Change Management Review

## Metrics to Track
- Number of changes per risk level
- Time from change request to apply
- Number of failed applies
- Number of rollbacks needed
- Incidents caused by changes
- Changes that were blocked by the process

## Questions to Ask
- Are we classifying risks correctly?
- Are the review requirements appropriate?
- Is the process being followed consistently?
- Where are teams working around the process?
```

For more on handling emergency situations that bypass the standard process, see our guide on [handling emergency Terraform changes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-emergency-terraform-changes/view).

Change management is not about bureaucracy. It is about making infrastructure changes predictable, safe, and auditable. A well-designed process protects your organization without slowing it down. Start with simple classification, automate what you can, and refine based on what you learn from incidents.
