# How to Troubleshoot VPC Service Controls Access Denied Errors Using Audit Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Service Controls, Troubleshooting, Audit Logs, Cloud Security

Description: A practical troubleshooting guide for diagnosing and fixing VPC Service Controls access denied errors using Cloud Audit Logs and the VPC SC troubleshooter.

---

Nothing is more frustrating than getting a cryptic "Request is prohibited by organization's policy" error and having no idea why. VPC Service Controls errors are notoriously hard to debug because the error message tells you almost nothing about what went wrong. Was it an ingress violation? An egress violation? A missing access level? A wrong project number?

The good news is that every VPC Service Controls violation is logged in Cloud Audit Logs with detailed metadata. You just need to know where to look and how to read the logs. In this post, I will show you exactly how to diagnose and fix the most common VPC SC errors.

## Understanding VPC SC Error Messages

When a request is blocked by VPC Service Controls, you get an error that looks something like this:

```
googleapi: Error 403: Request is prohibited by organization's policy.
vpcServiceControlsUniqueIdentifier: UNIQUE_ID_HERE
```

That unique identifier is your key to finding the detailed log entry. Save it - you will need it.

## Step 1: Find the Violation in Audit Logs

Use the unique identifier from the error message to find the exact log entry.

```bash
# Search for a specific VPC SC violation using the unique ID
gcloud logging read \
  'protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.status.message:"UNIQUE_ID_HERE"' \
  --limit=1 \
  --format=json \
  --project=my-project-id
```

If you do not have the unique ID, search by time and identity:

```bash
# Search for recent VPC SC violations
gcloud logging read \
  'protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.metadata.violationReason!=""' \
  --limit=20 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.methodName, protoPayload.metadata.violationReason)" \
  --project=my-project-id
```

## Step 2: Read the Violation Metadata

The audit log entry contains a `metadata` field with the details you need. Here is what a typical entry looks like:

```json
{
  "protoPayload": {
    "authenticationInfo": {
      "principalEmail": "my-sa@my-project.iam.gserviceaccount.com"
    },
    "methodName": "google.storage.objects.get",
    "serviceName": "storage.googleapis.com",
    "resourceName": "projects/_/buckets/my-bucket/objects/data.csv",
    "metadata": {
      "@type": "type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata",
      "violationReason": "RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER",
      "resourceNames": [
        "projects/123456789"
      ],
      "securityPolicy": "accessPolicies/POLICY_ID/servicePerimeters/my-perimeter",
      "vpcServiceControlsUniqueId": "abc123xyz",
      "accessLevels": [],
      "dryRun": false,
      "ingressViolations": [
        {
          "targetResource": "projects/123456789",
          "servicePerimeter": "accessPolicies/POLICY_ID/servicePerimeters/my-perimeter"
        }
      ]
    }
  }
}
```

## Step 3: Interpret the Violation Reason

The `violationReason` field tells you the category of the violation:

| Violation Reason | Meaning | Fix |
|---|---|---|
| RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER | The caller and resource are in different perimeters | Add ingress/egress rules or add resources to the same perimeter |
| NO_MATCHING_ACCESS_LEVEL | Caller does not meet any access level requirements | Update access levels (IP range, device policy) |
| SERVICE_NOT_ALLOWED | The API service is not in the perimeter's restricted services list | This is rare - usually means a misconfiguration |

## Step 4: Diagnose Common Scenarios

### Scenario 1: Cross-Project Access Blocked

You are trying to access a resource in project A from project B, and both are in different perimeters (or one is not in any perimeter).

```bash
# Check which perimeter a project belongs to
gcloud access-context-manager perimeters list \
  --policy=$ACCESS_POLICY_ID \
  --format=json | grep -A5 "PROJECT_NUMBER"
```

Fix: Either add both projects to the same perimeter, or create ingress/egress rules.

### Scenario 2: Console Access Blocked

A developer cannot access resources through the Cloud Console.

This happens when Console requests come from an IP not covered by any access level.

```bash
# Check what access levels exist
gcloud access-context-manager levels list \
  --policy=$ACCESS_POLICY_ID \
  --format="table(name, title)"

# Check the details of a specific access level
gcloud access-context-manager levels describe corporate-network \
  --policy=$ACCESS_POLICY_ID \
  --format=json
```

Fix: Add the developer's IP to an access level, or create an ingress rule for Console access.

### Scenario 3: Service Account From Outside Perimeter

A service account in an external project is trying to access resources inside the perimeter.

```bash
# Check the identity in the violation log
gcloud logging read \
  'protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.authenticationInfo.principalEmail="external-sa@other-project.iam.gserviceaccount.com"' \
  --limit=5 \
  --format=json \
  --project=my-project-id
```

Fix: Create an ingress rule for that specific service account.

### Scenario 4: GCP Service Agents Blocked

Some GCP services use service agents that operate from Google-managed projects. These can be blocked by VPC SC.

Common service agents that need consideration:
- Cloud Build service agent
- Cloud Composer service agent
- Dataflow service agent
- Cloud Functions service agent

Fix: Add the Google-managed project to the perimeter's access levels, or use VPC-accessible services.

## Step 5: Use the VPC SC Troubleshooter

Google provides a troubleshooter in the Cloud Console.

1. Go to Security > VPC Service Controls
2. Click "Troubleshoot" in the top menu
3. Enter the unique violation ID
4. The troubleshooter shows you exactly why the request was blocked and suggests fixes

You can also use the API:

```bash
# Use the troubleshooter API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "'"$(gcloud auth print-access-token)"'"
  }' \
  "https://policytroubleshooter.googleapis.com/v3/iam:troubleshoot"
```

## Step 6: Create a Monitoring Dashboard

Set up ongoing monitoring for VPC SC violations.

```bash
# Create an alert for new VPC SC violations
gcloud monitoring policies create \
  --display-name="VPC SC Violations" \
  --condition-display-name="VPC SC access denied" \
  --condition-filter='resource.type="audited_resource" AND metric.type="logging.googleapis.com/user/vpc_sc_violations"' \
  --condition-threshold-value=1 \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID \
  --project=my-project-id
```

First, create the log-based metric:

```bash
# Create a log-based metric for VPC SC violations
gcloud logging metrics create vpc_sc_violations \
  --description="Count of VPC Service Controls violations" \
  --filter='protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.metadata.violationReason!="" AND protoPayload.metadata.dryRun=false' \
  --project=my-project-id
```

## Step 7: Build a Quick Diagnostic Script

Here is a script that pulls the most useful information from a VPC SC violation.

```bash
#!/bin/bash
# diagnose-vpc-sc.sh - Quick VPC SC violation diagnosis
# Usage: ./diagnose-vpc-sc.sh PROJECT_ID [UNIQUE_ID]

PROJECT_ID=$1
UNIQUE_ID=$2

if [ -z "$UNIQUE_ID" ]; then
  # Show recent violations
  echo "Recent VPC SC violations in $PROJECT_ID:"
  echo "==========================================="
  gcloud logging read \
    'protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.metadata.violationReason!=""' \
    --limit=10 \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.serviceName, protoPayload.methodName, protoPayload.metadata.violationReason)" \
    --project=$PROJECT_ID
else
  # Show details for a specific violation
  echo "Details for violation $UNIQUE_ID:"
  echo "==================================="
  gcloud logging read \
    "protoPayload.metadata.vpcServiceControlsUniqueId=\"$UNIQUE_ID\"" \
    --limit=1 \
    --format=json \
    --project=$PROJECT_ID
fi
```

## Checklist for Debugging

When you hit a VPC SC error, go through this checklist:

1. Get the unique identifier from the error message
2. Find the log entry in Cloud Audit Logs
3. Check the `violationReason` field
4. Identify the caller identity (`principalEmail`)
5. Identify the target resource and project
6. Check which perimeter is involved
7. Determine if it is an ingress or egress violation
8. Check if access levels apply and whether the caller meets them
9. Create the appropriate ingress/egress rule or adjust access levels
10. Test in dry-run mode before enforcing the fix

## Conclusion

VPC Service Controls errors are intimidating at first, but once you know how to read the audit logs, they become straightforward to diagnose. The violation metadata tells you exactly who tried to do what, why it was blocked, and which perimeter was involved. Build the habit of checking audit logs immediately when you see a VPC SC error, and keep the troubleshooter bookmarked. Over time, you will start recognizing the common patterns and fixing them quickly.
