# How to Use IAM Policy Troubleshooter to Debug Access Denied Errors in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Security, Access Control, Google Cloud

Description: Learn how to use the IAM Policy Troubleshooter in Google Cloud to quickly identify why a principal is getting access denied errors on specific resources.

---

You are trying to do something in Google Cloud and get hit with "Permission denied" or "The caller does not have permission." You know the user or service account should have access, but something in the IAM policy chain is not granting the right permission. Instead of manually digging through policies at the organization, folder, project, and resource levels, Google Cloud has a built-in tool called the IAM Policy Troubleshooter that tells you exactly why access was granted or denied.

## What the IAM Policy Troubleshooter Does

The troubleshooter evaluates whether a specific principal (user, service account, or group) has a specific permission on a specific resource. It walks the entire resource hierarchy, checks all IAM policies, evaluates conditional role bindings, and tells you exactly which policy grants or denies the access.

This saves you from the tedious process of running `get-iam-policy` on every level of the hierarchy and manually checking each binding.

## Using the Troubleshooter via the Console

The quickest way to use it is through the Google Cloud Console:

1. Go to IAM and Admin > Troubleshoot
2. Enter the principal's email address
3. Enter the resource's full resource name
4. Enter the permission you want to check
5. Click "Check Access"

The tool shows you every policy in the hierarchy, which ones grant the permission, and which role bindings apply.

## Using the Troubleshooter via gcloud CLI

For scripting or quick checks from the command line, use the `gcloud` CLI:

```bash
# Check if a service account has a specific permission on a project
gcloud policy-intelligence troubleshoot-policy iam \
    //cloudresourcemanager.googleapis.com/projects/your-project-id \
    --principal-email=your-sa@your-project.iam.gserviceaccount.com \
    --permission=compute.instances.create
```

The output tells you whether access is granted or denied and lists every relevant policy binding.

## Using the Troubleshooter via the API

For programmatic access, use the Policy Troubleshooter API:

```bash
# Use the REST API to troubleshoot access
curl -X POST \
    "https://policytroubleshooter.googleapis.com/v1/iam:troubleshoot" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "accessTuple": {
            "principal": "serviceAccount:your-sa@your-project.iam.gserviceaccount.com",
            "fullResourceName": "//cloudresourcemanager.googleapis.com/projects/your-project-id",
            "permission": "compute.instances.create"
        }
    }'
```

The API response includes detailed information about each policy in the hierarchy and its effect on the access decision.

## Understanding the Output

The troubleshooter output contains several key fields. Here is how to interpret them:

The `access` field at the top level tells you the final verdict - `GRANTED` or `NOT_GRANTED`.

The `explainedPolicies` array lists every IAM policy that was evaluated. For each policy, you see:
- `access`: Whether this specific policy grants the permission
- `fullResourceName`: Which resource the policy is attached to
- `bindingExplanations`: Details about each role binding in the policy

For each binding explanation:
- `access`: Whether this binding grants the permission
- `role`: The IAM role in the binding
- `rolePermission`: Whether the role includes the requested permission
- `memberships`: Whether the principal is a member of this binding

## Common Scenarios and How to Debug Them

### Scenario 1: Permission Not in Any Role

The principal has roles assigned, but none of them include the specific permission needed.

```bash
# Find which roles include a specific permission
gcloud iam roles list --filter="includedPermissions:compute.instances.create" \
    --format="table(name, title)"
```

This helps you find the right role to grant. Common roles that people forget:
- `compute.instances.create` requires `roles/compute.instanceAdmin.v1` or `roles/compute.admin`
- `storage.objects.create` requires `roles/storage.objectCreator` or `roles/storage.objectAdmin`

### Scenario 2: Role Bound at Wrong Level

The role is granted at the project level but the resource is in a different project. This happens with cross-project access.

```bash
# Check IAM at the project level
gcloud projects get-iam-policy target-project-id \
    --flatten="bindings[].members" \
    --filter="bindings.members:your-sa@your-project.iam.gserviceaccount.com" \
    --format="table(bindings.role, bindings.members)"
```

If the principal needs access in a different project, grant the role in that project specifically.

### Scenario 3: IAM Condition Not Met

IAM conditions can restrict when a role binding applies. For example, a binding might only be active during business hours or only for resources with specific tags.

```bash
# Check for conditional bindings
gcloud projects get-iam-policy your-project-id \
    --format="json(bindings)" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for binding in data.get('bindings', []):
    if 'condition' in binding:
        print(f\"Role: {binding['role']}\")
        print(f\"Condition: {binding['condition']['expression']}\")
        print()
"
```

The troubleshooter evaluates conditions at the time you run it, so check if the condition might be time-based or depend on request attributes.

### Scenario 4: Deny Policies Blocking Access

Google Cloud supports IAM deny policies that explicitly block access regardless of allow policies. These are relatively new but can cause confusing behavior if you are not aware of them.

```bash
# List deny policies on a project
gcloud iam policies list \
    --attachment-point="cloudresourcemanager.googleapis.com/projects/your-project-id" \
    --kind=denypolicies \
    --format="json"
```

If a deny policy exists, check if it matches the principal and permission you are troubleshooting.

### Scenario 5: Service Account Acting on Behalf of Another

If you are using service account impersonation, the calling identity needs the `iam.serviceAccounts.actAs` or `iam.serviceAccountTokenCreator` permission on the target service account, in addition to the target service account having the required permissions on the resource.

```bash
# Check who can impersonate a service account
gcloud iam service-accounts get-iam-policy \
    target-sa@your-project.iam.gserviceaccount.com \
    --format="json(bindings)"
```

## Automating Access Audits

You can script the troubleshooter to regularly audit access for critical permissions:

```python
# Python script to batch-check permissions for a service account
from google.cloud import policytroubleshooter_v1

client = policytroubleshooter_v1.IamCheckerClient()

# Define the permissions to check
permissions_to_check = [
    "compute.instances.create",
    "storage.objects.create",
    "bigquery.datasets.get",
]

principal = "serviceAccount:your-sa@your-project.iam.gserviceaccount.com"
resource = "//cloudresourcemanager.googleapis.com/projects/your-project-id"

for permission in permissions_to_check:
    # Build the request for each permission
    request = policytroubleshooter_v1.TroubleshootIamPolicyRequest(
        access_tuple={
            "principal": principal,
            "full_resource_name": resource,
            "permission": permission,
        }
    )
    response = client.troubleshoot_iam_policy(request=request)
    access = response.access
    print(f"{permission}: {access.name}")
```

## Tips for Effective Troubleshooting

1. Always use the full resource name format: `//service.googleapis.com/resource/path`
2. Check permissions at the most specific resource level, not just the project
3. Remember that group memberships can grant access - check if the principal is in a Google Group that has the role
4. Inherited policies from folders and organizations can grant access even if the project policy does not
5. Custom roles might be missing permissions - verify custom role definitions

## Monitoring Access Issues

Use [OneUptime](https://oneuptime.com) to track authentication and authorization failures in your Google Cloud environment. By monitoring audit logs for access denied events, you can proactively identify permission issues before they block critical workflows.

The IAM Policy Troubleshooter is one of those tools that you should reach for immediately when facing any access denied error. It eliminates the guesswork and shows you exactly what is happening in the IAM evaluation chain.
