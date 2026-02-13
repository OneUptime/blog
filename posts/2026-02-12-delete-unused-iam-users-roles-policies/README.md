# How to Delete Unused IAM Users, Roles, and Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Security, Cleanup

Description: A practical guide to identifying and safely removing unused IAM users, roles, and policies to reduce your AWS attack surface and improve security posture.

---

Every unused IAM user is a potential backdoor. Every orphaned role is an attack vector waiting to be exploited. Every stale policy is a permission set that nobody's reviewing. Cleaning up unused IAM resources is one of those tasks that everybody knows they should do but rarely gets around to. Let's change that.

This guide walks through finding and safely removing unused IAM users, roles, and policies. We'll use credential reports, access advisor data, and some automation to make the process manageable even in large accounts.

## Why Cleanup Matters

The principle of least privilege isn't just about giving users minimal permissions - it's also about removing access entirely when it's no longer needed. Former employees, decommissioned applications, and one-off testing accounts all leave IAM artifacts behind.

Each unused resource:

- Increases your blast radius if credentials are compromised
- Makes auditing harder (more noise to filter through)
- Can violate compliance requirements (SOC 2, PCI DSS)
- Clutters your IAM console and confuses your team

## Finding Unused IAM Users

### Using Credential Reports

The credential report tells you when each user last logged in and when their access keys were last used.

```python
import boto3
import csv
from io import StringIO
from datetime import datetime, timezone

def find_unused_users(inactive_days=90):
    """Find IAM users who haven't been active in the specified number of days."""
    iam = boto3.client("iam")

    iam.generate_credential_report()

    import time
    time.sleep(10)

    report = iam.get_credential_report()
    content = report["Content"].decode("utf-8")
    reader = csv.DictReader(StringIO(content))

    now = datetime.now(timezone.utc)
    unused_users = []

    for row in reader:
        if row["user"] == "<root_account>":
            continue

        last_activity = None

        # Check password last used
        pw_used = row.get("password_last_used", "N/A")
        if pw_used not in ("N/A", "no_information", "not_supported"):
            dt = datetime.fromisoformat(pw_used.replace("Z", "+00:00"))
            if last_activity is None or dt > last_activity:
                last_activity = dt

        # Check access keys last used
        for key_num in ["1", "2"]:
            key_used = row.get(f"access_key_{key_num}_last_used_date", "N/A")
            if key_used not in ("N/A", "not_supported"):
                dt = datetime.fromisoformat(key_used.replace("Z", "+00:00"))
                if last_activity is None or dt > last_activity:
                    last_activity = dt

        if last_activity is None:
            unused_users.append((row["user"], "Never used"))
        else:
            days_inactive = (now - last_activity).days
            if days_inactive > inactive_days:
                unused_users.append((row["user"], f"{days_inactive} days inactive"))

    return unused_users

unused = find_unused_users(90)
print(f"Found {len(unused)} unused users:\n")
for user, reason in unused:
    print(f"  {user}: {reason}")
```

### Using Access Advisor

Access Advisor shows which services a user has actually accessed. It's more granular than the credential report:

```bash
# Generate a service last accessed details report for a user
JOB_ID=$(aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::123456789012:user/old-developer \
  --query 'JobId' --output text)

# Wait a moment then retrieve results
sleep 5
aws iam get-service-last-accessed-details \
  --job-id "$JOB_ID" \
  --query 'ServicesLastAccessed[?LastAuthenticated!=`null`].{Service:ServiceName,LastUsed:LastAuthenticated}' \
  --output table
```

## Safely Deleting IAM Users

Don't just delete users - follow a process that prevents accidents.

### Step 1: Disable, Don't Delete (Yet)

First, deactivate the user's access without deleting anything:

```bash
# Deactivate console access by deleting the login profile
aws iam delete-login-profile --user-name old-developer

# Deactivate access keys (don't delete yet)
aws iam list-access-keys --user-name old-developer \
  --query 'AccessKeyMetadata[*].AccessKeyId' --output text | \
  while read key_id; do
    aws iam update-access-key \
      --user-name old-developer \
      --access-key-id "$key_id" \
      --status Inactive
    echo "Deactivated key: $key_id"
  done
```

### Step 2: Wait and Monitor

Leave the user deactivated for 2-4 weeks. Monitor CloudTrail for any failed authentication attempts that would indicate something still depends on this user.

### Step 3: Full Deletion

Once you're confident nothing depends on the user, clean up everything:

```bash
#!/bin/bash
# Completely remove an IAM user and all associated resources

USERNAME="old-developer"

echo "Removing IAM user: $USERNAME"

# Delete access keys
for key in $(aws iam list-access-keys --user-name "$USERNAME" \
  --query 'AccessKeyMetadata[*].AccessKeyId' --output text); do
    aws iam delete-access-key --user-name "$USERNAME" --access-key-id "$key"
    echo "  Deleted access key: $key"
done

# Delete MFA devices
for mfa in $(aws iam list-mfa-devices --user-name "$USERNAME" \
  --query 'MFADevices[*].SerialNumber' --output text); do
    aws iam deactivate-mfa-device --user-name "$USERNAME" --serial-number "$mfa"
    aws iam delete-virtual-mfa-device --serial-number "$mfa"
    echo "  Deleted MFA device: $mfa"
done

# Remove from groups
for group in $(aws iam list-groups-for-user --user-name "$USERNAME" \
  --query 'Groups[*].GroupName' --output text); do
    aws iam remove-user-from-group --user-name "$USERNAME" --group-name "$group"
    echo "  Removed from group: $group"
done

# Detach managed policies
for policy in $(aws iam list-attached-user-policies --user-name "$USERNAME" \
  --query 'AttachedPolicies[*].PolicyArn' --output text); do
    aws iam detach-user-policy --user-name "$USERNAME" --policy-arn "$policy"
    echo "  Detached policy: $policy"
done

# Delete inline policies
for policy in $(aws iam list-user-policies --user-name "$USERNAME" \
  --query 'PolicyNames[*]' --output text); do
    aws iam delete-user-policy --user-name "$USERNAME" --policy-name "$policy"
    echo "  Deleted inline policy: $policy"
done

# Delete login profile (console access)
aws iam delete-login-profile --user-name "$USERNAME" 2>/dev/null
echo "  Deleted login profile"

# Delete signing certificates
for cert in $(aws iam list-signing-certificates --user-name "$USERNAME" \
  --query 'Certificates[*].CertificateId' --output text); do
    aws iam delete-signing-certificate --user-name "$USERNAME" --certificate-id "$cert"
    echo "  Deleted signing certificate: $cert"
done

# Finally, delete the user
aws iam delete-user --user-name "$USERNAME"
echo "User $USERNAME deleted successfully"
```

## Finding Unused IAM Roles

Roles are trickier because they don't show up in credential reports. Use the Access Advisor API:

```python
import boto3
from datetime import datetime, timezone

def find_unused_roles(inactive_days=90):
    """Find IAM roles that haven't been used recently."""
    iam = boto3.client("iam")
    unused_roles = []

    roles = iam.list_roles(MaxItems=1000)["Roles"]

    for role in roles:
        # Skip AWS service-linked roles
        if role["Path"].startswith("/aws-service-role/"):
            continue

        role_name = role["RoleName"]
        last_used = role.get("RoleLastUsed", {}).get("LastUsedDate")

        if last_used is None:
            unused_roles.append((role_name, "Never used", role["CreateDate"]))
        else:
            days = (datetime.now(timezone.utc) - last_used).days
            if days > inactive_days:
                unused_roles.append((role_name, f"{days} days ago", role["CreateDate"]))

    return unused_roles

unused = find_unused_roles(90)
print(f"Found {len(unused)} unused roles:\n")
for name, last_used, created in unused:
    print(f"  {name}: Last used {last_used} (created {created.strftime('%Y-%m-%d')})")
```

## Finding Unused Policies

Custom policies that aren't attached to anything are dead weight:

```python
import boto3

def find_unattached_policies():
    """Find customer-managed policies not attached to any user, group, or role."""
    iam = boto3.client("iam")

    paginator = iam.get_paginator("list_policies")
    unattached = []

    for page in paginator.paginate(Scope="Local", OnlyAttached=False):
        for policy in page["Policies"]:
            if policy["AttachmentCount"] == 0:
                unattached.append({
                    "name": policy["PolicyName"],
                    "arn": policy["Arn"],
                    "created": policy["CreateDate"].strftime("%Y-%m-%d")
                })

    return unattached

unattached = find_unattached_policies()
print(f"Found {len(unattached)} unattached policies:\n")
for p in unattached:
    print(f"  {p['name']} (created {p['created']})")
```

To delete an unattached policy:

```bash
# Delete a customer-managed policy (must delete all non-default versions first)
POLICY_ARN="arn:aws:iam::123456789012:policy/OldPolicy"

# List and delete non-default versions
aws iam list-policy-versions --policy-arn "$POLICY_ARN" \
  --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text | \
  while read version; do
    aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$version"
  done

# Delete the policy itself
aws iam delete-policy --policy-arn "$POLICY_ARN"
```

## Automation: Monthly Cleanup Report

Combine everything into a monthly cleanup report:

```python
import boto3
import json

def generate_cleanup_report():
    """Generate a comprehensive IAM cleanup report."""
    report = {
        "unused_users": find_unused_users(90),
        "unused_roles": find_unused_roles(90),
        "unattached_policies": find_unattached_policies()
    }

    total_items = (
        len(report["unused_users"]) +
        len(report["unused_roles"]) +
        len(report["unattached_policies"])
    )

    summary = f"""IAM Cleanup Report
==================
Unused users (90+ days):    {len(report['unused_users'])}
Unused roles (90+ days):    {len(report['unused_roles'])}
Unattached policies:        {len(report['unattached_policies'])}
Total items to review:      {total_items}
"""
    print(summary)
    return report
```

Regular cleanup keeps your IAM environment lean, auditable, and secure. Pair it with [credential reports](https://oneuptime.com/blog/post/2026-02-12-audit-iam-users-roles-credential-reports/view) and [access key rotation](https://oneuptime.com/blog/post/2026-02-12-rotate-iam-access-keys-safely/view) for a complete IAM hygiene program.
