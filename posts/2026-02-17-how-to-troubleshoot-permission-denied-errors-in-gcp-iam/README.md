# How to Troubleshoot Permission Denied Errors in GCP IAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Troubleshooting, Permissions, Debugging

Description: A systematic approach to diagnosing and fixing permission denied errors in GCP, covering common causes, debugging tools, and step-by-step resolution strategies.

---

Every GCP user has seen it: "Error 403: The caller does not have permission." It is one of the most frustrating error messages in cloud computing because it tells you almost nothing about what went wrong. The permission could be missing at the project level, the resource level, or the organization level. The identity might be wrong. A deny policy might be blocking access. An organization policy might be interfering. The API might not even be enabled.

This post walks through a systematic process for diagnosing and fixing permission denied errors in GCP. Rather than guessing and adding roles until something works, you can follow these steps to pinpoint the exact issue.

## Step 1 - Identify the Exact Error

Not all 403 errors are the same. Start by getting the full error message, not just the summary. If you are using gcloud, add the `--verbosity=debug` flag:

```bash
# Get detailed error output from a failing gcloud command
gcloud storage ls gs://my-bucket/ --verbosity=debug 2>&1 | tail -50
```

The debug output often includes the specific permission that was checked. Look for lines mentioning `permission` or `status`:

```
HttpError 403: caller does not have storage.objects.list access to the Google Cloud Storage bucket.
```

That tells you exactly which permission is missing: `storage.objects.list`. This is much more useful than the generic "permission denied" message.

## Step 2 - Verify the Identity

Make sure you know which identity is actually making the request. This is a common source of confusion, especially when working with multiple accounts or service accounts:

```bash
# Check which account gcloud is using
gcloud auth list

# Check which project is set as default
gcloud config get-value project

# If using application default credentials, check those too
gcloud auth application-default print-access-token 2>/dev/null && echo "ADC is set" || echo "No ADC configured"
```

For service accounts, verify that the workload is using the right service account:

```bash
# Check the service account attached to a Compute Engine instance
gcloud compute instances describe my-instance \
  --zone=us-central1-a \
  --format="get(serviceAccounts[0].email)"

# Check the service account on a Cloud Run service
gcloud run services describe my-service \
  --region=us-central1 \
  --format="get(spec.template.spec.serviceAccountName)"
```

## Step 3 - Check IAM Bindings

Once you know the identity and the permission, check whether the identity has a role that includes that permission:

```bash
# List all IAM bindings for the project
gcloud projects get-iam-policy my-project-id \
  --format="table(bindings.role, bindings.members)" \
  --flatten="bindings[].members"

# Filter to a specific member
gcloud projects get-iam-policy my-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:my-sa@my-project-id.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

If the role is not there, that is your problem. But if it is there and you are still getting errors, the issue might be at a different level. Check resource-level IAM too:

```bash
# Check IAM on a specific Cloud Storage bucket
gcloud storage buckets get-iam-policy gs://my-bucket/

# Check IAM on a BigQuery dataset
bq show --format=prettyjson my-project-id:my_dataset | jq '.access'
```

## Step 4 - Use the Policy Troubleshooter

GCP provides a built-in Policy Troubleshooter that tells you exactly why an identity does or does not have a specific permission. This is the most powerful debugging tool available:

```bash
# Use the Policy Troubleshooter to check a specific permission
gcloud policy-intelligence troubleshoot-policy iam \
  //cloudresourcemanager.googleapis.com/projects/my-project-id \
  --principal-email="my-sa@my-project-id.iam.gserviceaccount.com" \
  --permission="storage.objects.list"
```

The output tells you:

- Whether the permission is granted or denied
- Which role bindings were evaluated
- Whether any IAM conditions were applied and whether they passed
- Whether any deny policies blocked the access

You can also use this through the Cloud Console at **IAM & Admin > Troubleshoot access**. The web interface is easier to use for one-off checks.

## Step 5 - Check for Deny Policies

GCP supports IAM deny policies that explicitly block access regardless of allow policies. These are relatively new and not widely used yet, but if your organization has them, they can override your role bindings:

```bash
# List deny policies on a project
gcloud iam policies list \
  --attachment-point="cloudresourcemanager.googleapis.com/projects/my-project-id" \
  --kind=denypolicies \
  --format=json
```

If a deny policy is blocking your access, you need to either modify the deny policy or exempt your identity from it.

## Step 6 - Verify the API Is Enabled

A surprisingly common cause of permission errors is that the relevant API is not enabled. GCP returns a 403 error (not a 404) when you try to use a disabled API:

```bash
# Check if a specific API is enabled
gcloud services list --enabled --filter="name:storage.googleapis.com" --project=my-project-id

# Enable it if needed
gcloud services enable storage.googleapis.com --project=my-project-id
```

## Step 7 - Check Organization Policies

Organization policies can restrict actions even when IAM permissions are in place. For example, the domain-restricted sharing policy blocks adding external users, and the constraint on public access prevents making resources public:

```bash
# List all organization policies on the project
gcloud resource-manager org-policies list --project=my-project-id

# Check a specific constraint
gcloud resource-manager org-policies describe \
  constraints/iam.allowedPolicyMemberDomains \
  --project=my-project-id
```

## Step 8 - Check VPC Service Controls

If your project is inside a VPC Service Controls perimeter, access from outside the perimeter will be denied even if IAM permissions are correct. This is especially common when accessing resources from a local machine or a CI/CD system:

```bash
# List all VPC Service Controls perimeters in the access policy
gcloud access-context-manager perimeters list \
  --policy=POLICY_ID

# Check if your project is inside a perimeter
gcloud access-context-manager perimeters describe my-perimeter \
  --policy=POLICY_ID \
  --format="get(status.resources)"
```

VPC Service Controls denials appear in audit logs with the reason `RESOURCES_NOT_IN_SAME_SERVICE_PERIMETER` or `NETWORK_NOT_IN_SAME_SERVICE_PERIMETER`.

## Common Causes and Quick Fixes

Here is a reference table of the most common permission denied causes:

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 403 on all API calls | API not enabled | `gcloud services enable <api>` |
| 403 for a specific resource | Missing resource-level IAM | Add role at the resource level |
| 403 despite having the role | IAM condition not satisfied | Check condition expression |
| 403 from local machine | VPC Service Controls | Add access level for your IP |
| 403 when adding external user | Domain-restricted sharing | Request exception or use allowed domain |
| 403 on new service account | Permission propagation delay | Wait 60 seconds and retry |

## Permission Propagation Delays

When you grant a new IAM role, it can take up to 60 seconds (sometimes up to 7 minutes for certain resources) for the change to propagate. If you just added a role and are getting permission denied, wait a minute and try again before further debugging.

## Using Audit Logs for Investigation

Cloud Audit Logs record every API call, including denied ones. You can search for denied requests to see exactly what permission was checked:

```bash
# Search for access denied events in audit logs
gcloud logging read 'protoPayload.status.code=7 OR protoPayload.status.message:"PERMISSION_DENIED"' \
  --project=my-project-id \
  --limit=10 \
  --format="table(timestamp, protoPayload.methodName, protoPayload.authenticationInfo.principalEmail, protoPayload.status.message)"
```

This shows you the method that was called, which identity called it, and the specific denial reason.

## Prevention Tips

Give every service account a descriptive name and document its purpose. When you encounter a permission error months later, you will know what the service account is supposed to do and what access it should have.

Use custom roles instead of predefined roles when possible. Custom roles give you exactly the permissions you need and nothing more, which makes debugging easier because you know exactly what is included.

Avoid granting roles at the organization level when project-level grants will do. The wider the scope, the harder it is to trace where a permission came from.

Set up monitoring for permission denied errors. An unexpected spike in 403 errors often indicates a misconfiguration or a security incident, and catching it early saves hours of debugging later.
