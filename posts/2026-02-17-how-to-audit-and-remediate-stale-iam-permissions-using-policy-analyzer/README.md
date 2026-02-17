# How to Audit and Remediate Stale IAM Permissions Using Policy Analyzer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, IAM, Policy Analyzer, Security Audit, Permissions, Stale Access

Description: Learn how to use Google Cloud Policy Analyzer to audit and remediate stale IAM permissions that create unnecessary security risks in your environment.

---

IAM permissions accumulate over time like dust. People join the team and get access. They move to a different project but keep their old permissions. Temporary access for a specific task never gets revoked. Before you know it, you have dozens of stale permissions scattered across your organization - access that nobody needs but everyone has forgotten about.

Google Cloud Policy Analyzer helps you find these stale permissions by analyzing who has access to what and when they last used it. Combined with activity data, you can make informed decisions about which permissions to remove without breaking anything.

## What Policy Analyzer Does

Policy Analyzer answers questions like:

- Who can access this specific resource?
- What resources can this user access?
- When was a particular permission last used?
- Which permissions have never been used?

It works by combining IAM policy data with Cloud Audit Logs to show both the configured access and the actual usage patterns.

## Prerequisites

- The Cloud Asset API enabled
- The Policy Analyzer API enabled
- The `roles/cloudasset.viewer` role
- Access to Cloud Audit Logs

## Step 1: Enable Required APIs

```bash
# Enable the APIs needed for Policy Analyzer
gcloud services enable cloudasset.googleapis.com \
    --project=my-project

gcloud services enable policyanalyzer.googleapis.com \
    --project=my-project
```

## Step 2: Analyze Who Has Access to Critical Resources

Start by understanding who has access to your most sensitive resources:

```bash
# Find all principals with access to a specific Cloud SQL instance
gcloud asset analyze-iam-policy \
    --project=my-project \
    --full-resource-name="//cloudsql.googleapis.com/projects/my-project/instances/prod-database" \
    --format="table(analysisResults.identityList.identities,analysisResults.accessControlList.accesses.role)"
```

For a broader view across the project:

```bash
# Find all principals with any write access to the project
gcloud asset analyze-iam-policy \
    --project=my-project \
    --permissions="resourcemanager.projects.setIamPolicy,compute.instances.delete,storage.objects.delete" \
    --format="table(analysisResults.identityList.identities,analysisResults.accessControlList.accesses)"
```

## Step 3: Find Stale Permissions Using Activity Analysis

Use the Policy Analyzer activity analysis to find permissions that have not been used:

```bash
# Analyze access activity for a specific project
# This shows when permissions were last exercised
gcloud policy-intelligence query-activity \
    --project=my-project \
    --activity-type=serviceAccountLastAuthentication
```

For a more detailed analysis, use the API directly with a script:

```python
# find_stale_permissions.py
# Identifies IAM permissions that haven't been used in the specified period

from google.cloud import asset_v1
from google.cloud import logging_v2
from datetime import datetime, timedelta
import json

# Configuration
PROJECT_ID = "my-project"
STALE_THRESHOLD_DAYS = 90  # Permissions unused for 90+ days are considered stale

def get_all_iam_bindings(project_id):
    """Get all IAM bindings for the project."""
    client = asset_v1.AssetServiceClient()

    request = asset_v1.AnalyzeIamPolicyRequest(
        analysis_query=asset_v1.IamPolicyAnalysisQuery(
            scope=f"projects/{project_id}",
            resource_selector=asset_v1.IamPolicyAnalysisQuery.ResourceSelector(
                full_resource_name=f"//cloudresourcemanager.googleapis.com/projects/{project_id}"
            ),
        )
    )

    response = client.analyze_iam_policy(request=request)
    bindings = []

    for result in response.main_analysis.analysis_results:
        for identity in result.identity_list.identities:
            for acl in result.access_control_lists:
                for access in acl.accesses:
                    bindings.append({
                        "principal": identity.name,
                        "role": access.role,
                        "resource": result.attached_resource_full_name
                    })

    return bindings

def check_recent_activity(project_id, principal, days):
    """Check if a principal has had any activity in the specified period."""
    client = logging_v2.Client(project=project_id)

    # Build a filter for this principal's activity
    cutoff = datetime.utcnow() - timedelta(days=days)
    cutoff_str = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")

    filter_str = (
        f'protoPayload.authenticationInfo.principalEmail="{principal}" '
        f'AND timestamp>="{cutoff_str}"'
    )

    # Check for any entries - we only need one to confirm activity
    entries = list(client.list_entries(
        filter_=filter_str,
        max_results=1
    ))

    return len(entries) > 0

def find_stale_bindings(project_id, threshold_days):
    """Find all IAM bindings where the principal hasn't been active."""
    bindings = get_all_iam_bindings(project_id)
    stale = []
    active = []

    for binding in bindings:
        principal = binding["principal"]

        # Skip Google-managed service accounts
        if principal.endswith(".gserviceaccount.com") and \
           principal.startswith("service-"):
            continue

        # Skip allUsers and allAuthenticatedUsers
        if principal in ["allUsers", "allAuthenticatedUsers"]:
            # These are always concerning and should be reviewed separately
            stale.append({**binding, "reason": "public access"})
            continue

        has_activity = check_recent_activity(
            project_id, principal, threshold_days
        )

        if has_activity:
            active.append(binding)
        else:
            stale.append({**binding, "reason": f"no activity in {threshold_days} days"})

    return stale, active

def main():
    print(f"Analyzing IAM permissions for project: {PROJECT_ID}")
    print(f"Stale threshold: {STALE_THRESHOLD_DAYS} days\n")

    stale, active = find_stale_bindings(PROJECT_ID, STALE_THRESHOLD_DAYS)

    print(f"Total bindings analyzed: {len(stale) + len(active)}")
    print(f"Active bindings: {len(active)}")
    print(f"Stale bindings: {len(stale)}\n")

    if stale:
        print("Stale permissions (consider removing):")
        print("-" * 80)
        for s in stale:
            print(f"  Principal: {s['principal']}")
            print(f"  Role:      {s['role']}")
            print(f"  Reason:    {s['reason']}")
            print()

    # Save report
    report = {
        "project": PROJECT_ID,
        "analyzed_at": datetime.utcnow().isoformat(),
        "threshold_days": STALE_THRESHOLD_DAYS,
        "stale_bindings": stale,
        "active_bindings": active
    }

    with open(f"stale_permissions_{PROJECT_ID}.json", "w") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"Full report saved to stale_permissions_{PROJECT_ID}.json")

if __name__ == "__main__":
    main()
```

## Step 4: Cross-Reference with IAM Recommender

The IAM Recommender provides ready-made recommendations. Cross-reference its suggestions with your Policy Analyzer findings:

```bash
# Get IAM recommendations that suggest removing or replacing roles
gcloud recommender recommendations list \
    --project=my-project \
    --location=global \
    --recommender=google.iam.policy.Recommender \
    --filter="stateInfo.state=ACTIVE" \
    --format="table(name,description,primaryImpact.category)"
```

Recommendations from the Recommender are generally safe because they are based on 90 days of actual usage data. But it is still good practice to validate them before applying.

## Step 5: Safely Remediate Stale Permissions

When removing stale permissions, follow a safe remediation process:

```bash
#!/bin/bash
# remediate-stale-permissions.sh
# Safely removes stale IAM permissions with a grace period

PROJECT="my-project"
PRINCIPAL="user:former-contractor@example.com"
ROLE="roles/editor"

echo "Removing stale permission:"
echo "  Project:   ${PROJECT}"
echo "  Principal: ${PRINCIPAL}"
echo "  Role:      ${ROLE}"

# Step 1: Check audit logs one more time to confirm no recent usage
RECENT_ACTIVITY=$(gcloud logging read \
    "protoPayload.authenticationInfo.principalEmail=\"$(echo ${PRINCIPAL} | cut -d: -f2)\"" \
    --project=${PROJECT} \
    --freshness=30d \
    --limit=1 \
    --format="value(timestamp)")

if [ -n "${RECENT_ACTIVITY}" ]; then
    echo "WARNING: Found recent activity on ${RECENT_ACTIVITY}"
    echo "Aborting removal. Please review before proceeding."
    exit 1
fi

# Step 2: Remove the role binding
gcloud projects remove-iam-policy-binding ${PROJECT} \
    --member="${PRINCIPAL}" \
    --role="${ROLE}"

echo "Permission removed successfully"
echo "Monitor for issues over the next 48 hours"

# Step 3: Log the action for audit purposes
echo "$(date),REMOVED,${PROJECT},${PRINCIPAL},${ROLE}" >> /var/log/iam_remediation.csv
```

## Step 6: Automate Regular Audits

Set up automated weekly audits that generate reports and notify your security team:

```bash
# Create a Cloud Function that runs the audit
gcloud functions deploy iam-stale-audit \
    --project=my-project \
    --runtime=python311 \
    --trigger-topic=iam-audit-trigger \
    --entry-point=run_audit \
    --source=./audit_function/ \
    --service-account=iam-auditor@my-project.iam.gserviceaccount.com \
    --timeout=540s

# Schedule weekly execution
gcloud scheduler jobs create pubsub weekly-iam-audit \
    --project=my-project \
    --schedule="0 8 * * 1" \
    --topic=iam-audit-trigger \
    --message-body='{"threshold_days": 90}' \
    --description="Weekly audit of stale IAM permissions"
```

## Step 7: Build a Dashboard

Track your stale permission remediation progress over time:

```bash
# Create a custom metric for stale permission count
gcloud monitoring metrics-descriptors create \
    custom.googleapis.com/iam/stale_permission_count \
    --project=my-project \
    --description="Number of stale IAM permissions detected" \
    --metric-kind=GAUGE \
    --value-type=INT64
```

Push the stale permission count after each audit run. Over time, you should see this number trending downward as you remediate findings.

## Common Patterns of Stale Permissions

In my experience, stale permissions fall into a few predictable categories:

**Former employees and contractors**: People who left the organization but whose access was never revoked. This is the most common and most dangerous category.

**Project migrations**: Teams that moved to a new project but kept their old project permissions.

**Temporary escalations**: Someone needed admin access for a specific task and it was never removed afterward.

**Over-provisioned service accounts**: Service accounts created with broad roles during initial setup that were never tightened.

**Inherited permissions**: Permissions granted at the organization or folder level that cascade to all child projects, even ones where they are not needed.

## Summary

Stale IAM permissions are one of the most common security issues in cloud environments, and Policy Analyzer gives you the tools to find and fix them systematically. The approach is: analyze current access, cross-reference with actual usage data, safely remove permissions that are not being used, and automate the whole process to run regularly. The hardest part is not the technology - it is building the organizational habit of regular review and cleanup. Start with a weekly audit, act on the findings, and over time your permission debt will shrink to a manageable level.
