# How to Fix Service Account Impersonation Permission Denied Errors Across Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Service Account, Security, Google Cloud

Description: Resolve permission denied errors when trying to impersonate a service account across different Google Cloud projects using proper IAM configuration.

---

Service account impersonation is a core pattern in Google Cloud. Instead of distributing service account keys, a principal (user, service account, or external identity) assumes the identity of another service account to perform actions. It is more secure than keys because there is nothing to leak - you get short-lived tokens instead. But when impersonation crosses project boundaries, the permission model gets more complex, and "Permission Denied" errors are common.

## How Service Account Impersonation Works

When Principal A wants to impersonate Service Account B, two things need to be true:

1. Principal A needs the `iam.serviceAccounts.getAccessToken` permission on Service Account B (or the broader `roles/iam.serviceAccountTokenCreator` role)
2. Service Account B needs the appropriate permissions on the target resource

The impersonation permission is checked on the service account resource itself, not on the project or the target resource. This means you need to set up IAM on the service account, which lives in a specific project.

## Step 1: Understand the Error

The error usually looks like:

```
Error 403: Permission 'iam.serviceAccounts.getAccessToken' denied on resource (or it may not exist).
```

Or with the gcloud CLI:

```
ERROR: (gcloud.auth.print-access-token) User does not have permission to access
service account your-sa@target-project.iam.gserviceaccount.com
```

This tells you that the calling principal does not have permission to generate tokens for the target service account.

## Step 2: Grant the Service Account Token Creator Role

The most direct fix is to grant the `roles/iam.serviceAccountTokenCreator` role on the target service account:

```bash
# Grant token creator role on the target service account
gcloud iam service-accounts add-iam-policy-binding \
    target-sa@target-project.iam.gserviceaccount.com \
    --member="serviceAccount:caller-sa@source-project.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"
```

This command runs in the context of the target project (where the service account lives). You need sufficient permissions in the target project to modify the service account's IAM policy.

For a user principal:

```bash
# Grant a user the ability to impersonate a service account
gcloud iam service-accounts add-iam-policy-binding \
    target-sa@target-project.iam.gserviceaccount.com \
    --member="user:developer@example.com" \
    --role="roles/iam.serviceAccountTokenCreator"
```

## Step 3: Check the Existing IAM Policy

Verify what permissions are currently set on the target service account:

```bash
# View the IAM policy on the service account
gcloud iam service-accounts get-iam-policy \
    target-sa@target-project.iam.gserviceaccount.com \
    --format="json(bindings)"
```

Look for bindings that include `roles/iam.serviceAccountTokenCreator` or `roles/iam.serviceAccountUser`. The calling principal should be listed as a member in one of these bindings.

## Step 4: Understand the Difference Between Token Creator and Service Account User

These two roles are often confused:

- `roles/iam.serviceAccountTokenCreator` - Allows creating access tokens, ID tokens, and signing blobs as the service account. This is what you need for impersonation.
- `roles/iam.serviceAccountUser` - Allows deploying resources that run as the service account (like attaching a service account to a VM or Cloud Function). This does NOT allow impersonation.

If you have `serviceAccountUser` but not `serviceAccountTokenCreator`, you can deploy things that use the SA but you cannot directly impersonate it from your code.

## Step 5: Handle the Chain of Impersonation

Sometimes you have a chain: User impersonates SA-A, and SA-A impersonates SA-B. This is called delegated impersonation, and it requires explicit configuration.

```bash
# User -> SA-A -> SA-B chain
# Step 1: User needs tokenCreator on SA-A
gcloud iam service-accounts add-iam-policy-binding \
    sa-a@project-a.iam.gserviceaccount.com \
    --member="user:developer@example.com" \
    --role="roles/iam.serviceAccountTokenCreator"

# Step 2: SA-A needs tokenCreator on SA-B
gcloud iam service-accounts add-iam-policy-binding \
    sa-b@project-b.iam.gserviceaccount.com \
    --member="serviceAccount:sa-a@project-a.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountTokenCreator"
```

When making the impersonated call, you specify the delegation chain:

```bash
# Using gcloud with impersonation and delegation
gcloud compute instances list \
    --project=target-project \
    --impersonate-service-account=sa-b@project-b.iam.gserviceaccount.com \
    --verbosity=debug
```

With the client libraries, you specify delegates in the credential chain:

```python
# Python example with delegated impersonation
from google.auth import impersonated_credentials
import google.auth

# Get the default credentials (User or SA-A)
source_credentials, _ = google.auth.default()

# Create impersonated credentials for SA-B through SA-A
target_credentials = impersonated_credentials.Credentials(
    source_credentials=source_credentials,
    target_principal="sa-b@project-b.iam.gserviceaccount.com",
    delegates=[
        "sa-a@project-a.iam.gserviceaccount.com"  # Intermediate SA in the chain
    ],
    target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
    lifetime=3600  # Token lifetime in seconds
)
```

## Step 6: Check Organization Policy Constraints

The `iam.allowedPolicyMemberDomains` organization policy can prevent cross-domain IAM bindings. If the calling principal is from a different Google Workspace domain, this constraint might block the binding.

```bash
# Check if there's a domain restriction
gcloud resource-manager org-policies describe \
    constraints/iam.allowedPolicyMemberDomains \
    --project=target-project \
    --effective
```

If the constraint restricts to specific domains and the calling principal's domain is not included, you need to either add the domain or use a service account within the allowed domain as an intermediary.

## Step 7: Debug with the IAM Policy Troubleshooter

Use the troubleshooter to get a definitive answer about why access is denied:

```bash
# Troubleshoot the impersonation permission
gcloud policy-intelligence troubleshoot-policy iam \
    //iam.googleapis.com/projects/target-project/serviceAccounts/target-sa@target-project.iam.gserviceaccount.com \
    --principal-email=caller-sa@source-project.iam.gserviceaccount.com \
    --permission=iam.serviceAccounts.getAccessToken
```

This tells you exactly which policies were evaluated and why access was granted or denied.

## Step 8: Use Terraform for Cross-Project IAM

When managing cross-project impersonation with Terraform, make sure the IAM bindings are set on the correct resource:

```hcl
# Terraform configuration for cross-project impersonation
resource "google_service_account_iam_member" "impersonation" {
  # This is set on the TARGET service account
  service_account_id = "projects/target-project/serviceAccounts/target-sa@target-project.iam.gserviceaccount.com"
  role               = "roles/iam.serviceAccountTokenCreator"
  # The CALLER gets the role
  member             = "serviceAccount:caller-sa@source-project.iam.gserviceaccount.com"
}
```

A common Terraform mistake is putting this binding in the wrong project or using `google_project_iam_member` instead of `google_service_account_iam_member`. The role needs to be on the service account resource, not on the project.

## Common Mistakes

1. Granting `serviceAccountUser` instead of `serviceAccountTokenCreator`
2. Granting the role at the project level instead of on the specific service account
3. Missing intermediate delegates in a delegation chain
4. Organization policy blocking cross-domain IAM bindings
5. Using the wrong service account email (typos, wrong project)
6. Not waiting for IAM propagation (can take up to 7 minutes)

## Monitoring Impersonation Activity

Track service account impersonation events in your audit logs using [OneUptime](https://oneuptime.com). Monitoring who is impersonating which service accounts helps you detect unauthorized access attempts and verify that your impersonation chains are working as intended.

Service account impersonation is the recommended alternative to service account keys. Getting the cross-project permissions right takes some setup, but once it is configured, it provides a much more secure authentication model with full auditability.
