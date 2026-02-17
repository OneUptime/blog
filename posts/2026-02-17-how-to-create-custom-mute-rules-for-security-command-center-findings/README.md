# How to Create Custom Mute Rules for Security Command Center Findings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Command Center, Mute Rules, Security, Findings Management

Description: Learn how to create and manage custom mute rules in Google Cloud Security Command Center to reduce noise and focus on actionable security findings.

---

Security Command Center generates a lot of findings. In a large organization, you might see thousands of findings across hundreds of projects. Not all of them are actionable. Some are expected and accepted (a dev cluster that intentionally has relaxed firewall rules), some are false positives (a test bucket that is deliberately public), and some are duplicates of known issues you are already tracking. Mute rules let you suppress these findings so your security team can focus on what actually matters.

In this post, I will show you how to create custom mute rules, manage them effectively, and build a strategy for keeping your findings dashboard clean and useful.

## How Mute Rules Work

A mute rule is a filter that automatically sets the `mute` state of matching findings to `MUTED`. Muted findings are hidden from the default view in the Console but are still recorded and available if you need them. You can unmute findings at any time.

There are two types of muting:

1. **Static mute**: You manually mute specific individual findings
2. **Dynamic mute rules**: You create filter-based rules that automatically mute any matching finding, including future ones

Dynamic mute rules are what we will focus on because they handle the ongoing noise problem.

## Viewing Current Findings

Before creating mute rules, understand what findings you have.

```bash
# View all active findings sorted by severity
gcloud scc findings list YOUR_ORG_ID \
  --filter='state="ACTIVE" AND mute="UNMUTED"' \
  --format="table(finding.category, finding.severity, finding.resourceName)" \
  --limit=50

# Count findings by category
gcloud scc findings list YOUR_ORG_ID \
  --filter='state="ACTIVE" AND mute="UNMUTED"' \
  --format="value(finding.category)" | sort | uniq -c | sort -rn | head -20

# Count findings by severity
gcloud scc findings list YOUR_ORG_ID \
  --filter='state="ACTIVE" AND mute="UNMUTED" AND finding.severity="CRITICAL"' \
  --format="value(finding.category)" | wc -l
```

## Creating a Mute Rule via gcloud

The basic syntax for creating a mute rule.

```bash
# Create a mute rule that mutes findings for a specific resource
gcloud scc muteconfigs create dev-cluster-firewall \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="OPEN_FIREWALL" AND resource.projectDisplayName="dev-sandbox"' \
  --description="Mute open firewall findings in dev sandbox - accepted risk per SEC-2024-123"
```

## Common Mute Rule Patterns

### Mute by Project (Dev/Test Environments)

Development and test environments often have relaxed security configurations by design.

```bash
# Mute all findings from development projects
gcloud scc muteconfigs create dev-environment \
  --organization=YOUR_ORG_ID \
  --filter='resource.projectDisplayName="dev-sandbox" OR resource.projectDisplayName="test-environment" OR resource.projectDisplayName="staging-env"' \
  --description="Mute findings from non-production environments"
```

If your projects follow a naming convention, use partial matching.

```bash
# Mute findings from any project with "dev" or "test" in the name
gcloud scc muteconfigs create non-prod-projects \
  --organization=YOUR_ORG_ID \
  --filter='resource.projectDisplayName:"dev-" OR resource.projectDisplayName:"test-" OR resource.projectDisplayName:"sandbox-"' \
  --description="Mute findings from non-production projects matching naming convention"
```

### Mute by Finding Category

Some finding categories may not be relevant to your organization.

```bash
# Mute DNS logging findings if you use a third-party DNS solution
gcloud scc muteconfigs create dns-logging-accepted \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="DNS_LOGGING_DISABLED"' \
  --description="DNS logging handled by external provider - not applicable"

# Mute findings about default service accounts in specific projects
gcloud scc muteconfigs create default-sa-accepted \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="DEFAULT_SERVICE_ACCOUNT_USED" AND resource.projectDisplayName="legacy-app"' \
  --description="Legacy app uses default SA - migration planned for Q3"
```

### Mute by Resource Type

If certain resource types are known to generate noise.

```bash
# Mute findings for GKE system namespaces
gcloud scc muteconfigs create gke-system-namespaces \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="CONTAINER_THREAT" AND resource.displayName:"kube-system"' \
  --description="Mute expected container findings in kube-system namespace"
```

### Mute by Severity for Specific Categories

Maybe low-severity findings for certain categories are just noise.

```bash
# Mute low severity findings for overly sensitive detectors
gcloud scc muteconfigs create low-severity-noise \
  --organization=YOUR_ORG_ID \
  --filter='finding.severity="LOW" AND (finding.category="LEGACY_AUTHORIZATION_ENABLED" OR finding.category="CLUSTER_LOGGING_DISABLED")' \
  --description="Mute low-severity findings for known informational detectors"
```

### Mute Specific Known Resources

When you have a specific resource with an accepted risk.

```bash
# Mute findings for a specific public bucket (e.g., a public website bucket)
gcloud scc muteconfigs create public-website-bucket \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="PUBLIC_BUCKET_ACL" AND resource.name:"my-public-website-bucket"' \
  --description="Public bucket for static website hosting - intentionally public"

# Mute findings for a specific Cloud SQL instance with public IP
gcloud scc muteconfigs create legacy-sql-public-ip \
  --organization=YOUR_ORG_ID \
  --filter='finding.category="SQL_PUBLIC_IP" AND resource.name:"legacy-database-instance"' \
  --description="Legacy SQL instance requires public IP for partner integrations - tracked in JIRA-456"
```

## Managing Mute Rules

### Listing All Mute Rules

```bash
# List all mute configurations
gcloud scc muteconfigs list \
  --organization=YOUR_ORG_ID \
  --format="table(name.basename(), filter, description)"
```

### Viewing a Specific Mute Rule

```bash
# Get details of a mute rule
gcloud scc muteconfigs describe dev-environment \
  --organization=YOUR_ORG_ID
```

### Updating a Mute Rule

```bash
# Update the filter on an existing mute rule
gcloud scc muteconfigs update dev-environment \
  --organization=YOUR_ORG_ID \
  --filter='resource.projectDisplayName:"dev-" OR resource.projectDisplayName:"test-" OR resource.projectDisplayName:"sandbox-" OR resource.projectDisplayName:"demo-"' \
  --description="Updated to include demo projects"
```

### Deleting a Mute Rule

```bash
# Delete a mute rule (previously muted findings remain muted)
gcloud scc muteconfigs delete dns-logging-accepted \
  --organization=YOUR_ORG_ID
```

Note that deleting a mute rule does not automatically unmute previously muted findings. You need to unmute those separately.

## Statically Muting Individual Findings

For one-off findings that do not fit a rule pattern.

```bash
# Mute a specific finding by its name
gcloud scc findings set-mute FINDING_NAME \
  --organization=YOUR_ORG_ID \
  --mute=MUTED

# Unmute a specific finding
gcloud scc findings set-mute FINDING_NAME \
  --organization=YOUR_ORG_ID \
  --mute=UNMUTED
```

## Bulk Muting with Scripts

For handling large numbers of findings programmatically.

```bash
#!/bin/bash
# bulk-mute.sh
# Mutes all active findings matching a filter

ORG_ID="YOUR_ORG_ID"
FILTER='finding.category="OPEN_SSH_PORT" AND resource.projectDisplayName="dev-sandbox"'

# List matching findings
FINDINGS=$(gcloud scc findings list "$ORG_ID" \
  --filter="$FILTER AND state=\"ACTIVE\" AND mute=\"UNMUTED\"" \
  --format="value(finding.name)")

# Mute each finding
for FINDING in $FINDINGS; do
  echo "Muting: $FINDING"
  gcloud scc findings set-mute "$FINDING" \
    --organization="$ORG_ID" \
    --mute=MUTED
done

echo "Done. Muted $(echo "$FINDINGS" | wc -l) findings."
```

## Using the API for Advanced Mute Rules

For more complex scenarios, use the SCC API directly.

```python
# create_mute_rule.py
# Creates a mute rule using the Security Command Center API
from google.cloud import securitycenter_v1

client = securitycenter_v1.SecurityCenterClient()

org_id = "YOUR_ORG_ID"
parent = f"organizations/{org_id}"

mute_config = securitycenter_v1.MuteConfig(
    filter=(
        'finding.category="OPEN_FIREWALL" AND '
        'resource.projectDisplayName="dev-sandbox" AND '
        'finding.severity="MEDIUM"'
    ),
    description="Mute medium-severity firewall findings in dev sandbox",
)

response = client.create_mute_config(
    parent=parent,
    mute_config=mute_config,
    mute_config_id="dev-firewall-medium",
)

print(f"Created mute rule: {response.name}")
```

## Viewing Muted Findings

Even though muted findings are hidden by default, you can still see them.

```bash
# View muted findings
gcloud scc findings list YOUR_ORG_ID \
  --filter='mute="MUTED" AND state="ACTIVE"' \
  --format="table(finding.category, finding.severity, finding.resourceName, finding.muteUpdateTime)" \
  --limit=20

# Count muted findings by category
gcloud scc findings list YOUR_ORG_ID \
  --filter='mute="MUTED" AND state="ACTIVE"' \
  --format="value(finding.category)" | sort | uniq -c | sort -rn
```

## Mute Rule Strategy Best Practices

**Document every mute rule.** Always include a description that explains why the finding is being muted, who approved it, and any relevant ticket numbers. Future team members need to understand the rationale.

**Review mute rules quarterly.** Set a calendar reminder to review all mute rules. Conditions change - a dev project might become production, a legacy system might get upgraded, or an accepted risk might no longer be acceptable.

**Start narrow, then broaden.** It is better to mute specific resources first and then create broader rules if needed. A rule that mutes an entire project is riskier than one that mutes a specific resource in that project.

**Never mute critical findings without an exception process.** Critical findings like publicly exposed databases or compromised credentials should go through a formal risk acceptance process before muting.

**Tag mute rules with expiration dates in the description.** Even if SCC does not enforce expiration, including "Review by: 2026-06-01" in the description helps with governance.

## Mute Rule Governance Template

When creating a mute rule, document it with:

```
Description format: [CATEGORY] - [REASON] - Approved by [NAME] - Ticket [NUMBER] - Review by [DATE]

Example: "PUBLIC_BUCKET_ACL - Static website hosting bucket - Approved by Jane Doe - SEC-2026-089 - Review by 2026-08-01"
```

## Wrapping Up

Mute rules are essential for making Security Command Center useful at scale. Without them, your security team drowns in noise and misses real threats. The key is being deliberate about what you mute and why. Use dynamic mute rules for recurring patterns, static mutes for one-off exceptions, and always document your reasoning. Review your mute rules regularly to make sure they are still appropriate. A well-tuned SCC instance with thoughtful mute rules is far more valuable than one showing thousands of unactionable findings.
