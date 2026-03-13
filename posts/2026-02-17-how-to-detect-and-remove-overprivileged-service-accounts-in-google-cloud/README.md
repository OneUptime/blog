# How to Detect and Remove Overprivileged Service Accounts in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, IAM, Service Accounts, Security, Least Privilege, Overprivileged

Description: Learn how to detect overprivileged service accounts in Google Cloud and safely remove unnecessary permissions to follow the principle of least privilege.

---

Service accounts in Google Cloud are often the biggest source of overprivileged access. It is common to see service accounts with Editor or Owner roles because someone needed to get something working quickly and never went back to tighten the permissions. The problem is that service accounts are prime targets for attackers - they do not have MFA, they often have persistent credentials (keys), and their broad permissions can be leveraged to pivot across your entire environment.

Finding and fixing overprivileged service accounts is one of the highest-impact security improvements you can make in a GCP environment. Let me show you how to systematically detect and remediate them.

## Step 1: Inventory All Service Accounts

Start by getting a complete picture of all service accounts across your organization:

```bash
# List all service accounts in a specific project
gcloud iam service-accounts list \
    --project=my-project \
    --format="table(email,displayName,disabled)"
```

For organization-wide visibility, iterate across all projects:

```bash
#!/bin/bash
# inventory-service-accounts.sh
# Lists all service accounts across all projects in the organization

ORG_ID="123456789"

# Get all active projects
PROJECTS=$(gcloud projects list \
    --filter="parent.id=${ORG_ID} AND lifecycleState=ACTIVE" \
    --format="value(projectId)")

echo "Project,ServiceAccount,DisplayName,Disabled"

for PROJECT in ${PROJECTS}; do
    # List service accounts in this project
    SA_LIST=$(gcloud iam service-accounts list \
        --project=${PROJECT} \
        --format="csv[no-heading](email,displayName,disabled)" 2>/dev/null)

    if [ -n "${SA_LIST}" ]; then
        while IFS= read -r line; do
            echo "${PROJECT},${line}"
        done <<< "${SA_LIST}"
    fi
done
```

## Step 2: Identify Overprivileged Service Accounts

Check what roles each service account has been granted. Focus on the most dangerous roles first:

```bash
# Check IAM policy bindings for overprivileged service accounts in a project
# Look for service accounts with Editor, Owner, or broad admin roles
gcloud projects get-iam-policy my-project \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount AND (bindings.role:roles/editor OR bindings.role:roles/owner OR bindings.role:roles/iam.serviceAccountAdmin)" \
    --format="table(bindings.members,bindings.role)"
```

For a more comprehensive analysis across the organization:

```python
# detect_overprivileged_sa.py
# Detects service accounts with overly broad roles

from google.cloud import resourcemanager_v3
from google.cloud import asset_v1
import json

# Roles considered overprivileged for service accounts
OVERPRIVILEGED_ROLES = [
    "roles/owner",
    "roles/editor",
    "roles/iam.serviceAccountAdmin",
    "roles/iam.serviceAccountKeyAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/compute.admin",
    "roles/storage.admin",
    "roles/bigquery.admin",
    "roles/cloudsql.admin",
    "roles/container.admin",
]

def find_overprivileged_service_accounts(org_id):
    """Find all overprivileged service accounts using Cloud Asset Inventory."""
    client = asset_v1.AssetServiceClient()

    # Search all IAM policies in the organization
    results = []

    request = asset_v1.SearchAllIamPoliciesRequest(
        scope=f"organizations/{org_id}",
        query="memberTypes:serviceAccount",
        page_size=500
    )

    for result in client.search_all_iam_policies(request=request):
        for binding in result.policy.bindings:
            if binding.role in OVERPRIVILEGED_ROLES:
                for member in binding.members:
                    if member.startswith("serviceAccount:"):
                        results.append({
                            "resource": result.resource,
                            "service_account": member,
                            "role": binding.role,
                            "project": result.project
                        })

    return results

def main():
    org_id = "123456789"
    findings = find_overprivileged_service_accounts(org_id)

    print(f"Found {len(findings)} overprivileged service account bindings:\n")

    # Group by service account for readability
    by_sa = {}
    for f in findings:
        sa = f["service_account"]
        if sa not in by_sa:
            by_sa[sa] = []
        by_sa[sa].append(f)

    for sa, bindings in by_sa.items():
        print(f"\n{sa}:")
        for b in bindings:
            print(f"  - {b['role']} on {b['resource']}")

    # Save to file
    with open("overprivileged_sa_report.json", "w") as f:
        json.dump(findings, f, indent=2)
    print(f"\nFull report saved to overprivileged_sa_report.json")

if __name__ == "__main__":
    main()
```

## Step 3: Analyze Actual Permission Usage

Before removing permissions, check what the service account actually uses. The IAM Recommender and Policy Analyzer help with this:

```bash
# Use the Recommender to see what permissions are actually being used
gcloud recommender recommendations list \
    --project=my-project \
    --location=global \
    --recommender=google.iam.policy.Recommender \
    --filter="description~'serviceAccount'" \
    --format="table(description,content.operationGroups)"
```

For a deeper analysis, use the Policy Analyzer:

```bash
# Analyze what permissions a specific service account has actually used
gcloud policy-intelligence query-activity \
    --project=my-project \
    --activity-type=serviceAccountLastAuthentication \
    --service-account-email=my-app-sa@my-project.iam.gserviceaccount.com
```

## Step 4: Check for Service Account Key Usage

Service account keys are particularly risky. Find which accounts have keys and whether those keys are being used:

```bash
# List keys for a specific service account
gcloud iam service-accounts keys list \
    --iam-account=my-app-sa@my-project.iam.gserviceaccount.com \
    --project=my-project \
    --format="table(name.basename(),validAfterTime,validBeforeTime,keyType)"

# Find all user-managed keys across a project
for SA in $(gcloud iam service-accounts list --project=my-project --format="value(email)"); do
    KEYS=$(gcloud iam service-accounts keys list \
        --iam-account=${SA} \
        --managed-by=user \
        --format="value(name)" 2>/dev/null | wc -l)
    if [ "${KEYS}" -gt "0" ]; then
        echo "${SA}: ${KEYS} user-managed keys"
    fi
done
```

## Step 5: Safely Remove Overprivileged Roles

When you are ready to tighten permissions, do it gradually:

```bash
# Step 1: Add the more restrictive role first
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer" \
    --condition=None

# Step 2: Wait and monitor for a few days to ensure nothing breaks
# Check Cloud Audit Logs for permission denied errors
gcloud logging read \
    'protoPayload.authenticationInfo.principalEmail="my-app-sa@my-project.iam.gserviceaccount.com" AND protoPayload.status.code=7' \
    --project=my-project \
    --freshness=7d \
    --format="table(timestamp,protoPayload.methodName,protoPayload.status.message)"

# Step 3: Only after confirming no issues, remove the broad role
gcloud projects remove-iam-policy-binding my-project \
    --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/editor"
```

## Step 6: Disable Unused Service Accounts

Some service accounts are not used at all. Disable them before deleting to ensure nothing breaks:

```bash
# Check when a service account was last used
gcloud policy-intelligence query-activity \
    --project=my-project \
    --activity-type=serviceAccountLastAuthentication \
    --service-account-email=old-app-sa@my-project.iam.gserviceaccount.com

# If not used in 90+ days, disable it first
gcloud iam service-accounts disable \
    old-app-sa@my-project.iam.gserviceaccount.com \
    --project=my-project

# Wait 30 days, and if nothing breaks, delete it
# gcloud iam service-accounts delete old-app-sa@my-project.iam.gserviceaccount.com --project=my-project
```

## Step 7: Set Up Ongoing Monitoring

Create alerts that catch new overprivileged assignments:

```bash
# Alert when a service account is granted Editor or Owner role
gcloud logging read \
    'protoPayload.methodName="SetIamPolicy" AND protoPayload.request.policy.bindings.members:"serviceAccount:" AND (protoPayload.request.policy.bindings.role:"roles/editor" OR protoPayload.request.policy.bindings.role:"roles/owner")' \
    --project=my-project \
    --freshness=1d
```

Set this up as a log-based alert that notifies your security team whenever someone grants a broad role to a service account.

## Remediation Priority Matrix

Not all overprivileged service accounts are equally risky. Prioritize based on:

| Risk Factor | Priority |
|------------|----------|
| SA with Owner role + external keys | Critical |
| SA with Editor role + external keys | High |
| SA with Owner/Editor role, no keys | Medium |
| SA with broad admin roles | Medium |
| SA with unused permissions (viewer roles) | Low |

Focus on the critical and high items first - these are the service accounts that an attacker could most easily exploit.

## Summary

Detecting and removing overprivileged service accounts is a continuous process, not a one-time project. Start by inventorying all service accounts, identify which ones have overly broad roles, analyze their actual permission usage, and then safely tighten permissions by adding specific roles before removing broad ones. Disable unused accounts, clean up service account keys, and set up monitoring to catch new overprivileged assignments. The goal is not perfection on day one - it is steady progress toward least privilege across your organization.
