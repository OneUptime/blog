# How to Fix Terraform GCP Permission Denied Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, IAM, Troubleshooting, Infrastructure as Code

Description: Troubleshoot and resolve permission denied errors when using Terraform with Google Cloud Platform, including service account roles, API permissions, and organization policies.

---

Permission denied errors in Terraform with Google Cloud Platform mean the service account or user running Terraform lacks the necessary IAM permissions. GCP's permission model is granular, and it is common to have some permissions while missing others. This guide walks through identifying the missing permission and granting it correctly.

## What the Error Looks Like

```
Error: googleapi: Error 403: Required 'compute.instances.create'
permission for 'projects/my-project/zones/us-central1-a/instances/my-vm',
forbidden

Error: Error creating Network: googleapi: Error 403: Caller does not
have required permission to use this resource., forbidden

Error: Error creating Bucket: googleapi: Error 403:
your-sa@my-project.iam.gserviceaccount.com does not have
storage.buckets.create access to the Google Cloud project.,
forbidden
```

The GCP error messages are usually quite specific about which permission is missing, which makes debugging easier than some other cloud providers.

## Understanding GCP IAM

GCP uses a hierarchy of IAM bindings:

1. **Organization level** - Applies to all projects
2. **Folder level** - Applies to projects in the folder
3. **Project level** - Applies to resources in the project
4. **Resource level** - Applies to a specific resource

Permissions flow down the hierarchy: if you have a role at the project level, you have it for all resources in the project.

GCP uses three concepts:
- **Permissions** - Granular actions like `compute.instances.create`
- **Roles** - Collections of permissions like `roles/compute.admin`
- **Bindings** - Attach roles to members (users or service accounts)

## Common Causes and Fixes

### 1. Service Account Missing Required Role

The most common issue is that the Terraform service account does not have the right role:

```bash
# Check current roles for the service account
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

**Fix:** Grant the needed role:

```bash
# Grant a specific role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

# Common roles for Terraform
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/editor"
```

Or in Terraform:

```hcl
resource "google_project_iam_member" "terraform_compute" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}
```

### 2. Using the Wrong Service Account

Verify that Terraform is using the service account you expect:

```bash
# If using a key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/keyfile.json"

# Check the service account in the key file
cat /path/to/keyfile.json | jq '.client_email'

# If using gcloud
gcloud auth list
```

### 3. Common Role Requirements by Resource Type

Here are the typical roles needed for common Terraform operations:

```bash
# Compute resources (VMs, networks, firewalls)
roles/compute.admin
roles/compute.networkAdmin  # For network-only operations

# Storage (GCS buckets)
roles/storage.admin

# Kubernetes Engine (GKE)
roles/container.admin
roles/compute.admin  # Also needed for node pools

# Cloud SQL
roles/cloudsql.admin

# IAM management
roles/iam.admin
roles/resourcemanager.projectIamAdmin

# Service account management
roles/iam.serviceAccountAdmin
roles/iam.serviceAccountUser  # To use SAs for VMs and other resources

# Cloud Functions
roles/cloudfunctions.admin

# Pub/Sub
roles/pubsub.admin

# DNS
roles/dns.admin
```

### 4. Missing serviceAccountUser Role

A frequently missed permission: to assign a service account to a resource (like a VM), the Terraform service account needs `iam.serviceAccounts.actAs` permission, which comes from `roles/iam.serviceAccountUser`:

```hcl
# This will fail without serviceAccountUser role
resource "google_compute_instance" "vm" {
  name         = "my-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  service_account {
    email  = "my-sa@my-project.iam.gserviceaccount.com"
    scopes = ["cloud-platform"]
  }
}
```

**Fix:**

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### 5. Organization Policy Restrictions

Your organization might have policies that restrict certain operations regardless of IAM permissions:

```bash
# List organization policies
gcloud org-policies list --project=my-project

# Check a specific constraint
gcloud org-policies describe constraints/compute.restrictLoadBalancerCreationForTypes \
  --project=my-project
```

Common organization policy constraints that block Terraform:

- `constraints/compute.vmExternalIpAccess` - Blocks external IPs on VMs
- `constraints/iam.allowedPolicyMemberDomains` - Restricts IAM members to specific domains
- `constraints/compute.restrictVpcPeering` - Restricts VPC peering
- `constraints/storage.uniformBucketLevelAccess` - Requires uniform bucket access

These cannot be overridden by IAM permissions. You need to either work within the constraints or request an exception from your organization administrator.

## Setting Up a Terraform Service Account

Here is the recommended setup for a Terraform service account:

```bash
# Create the service account
gcloud iam service-accounts create terraform \
  --display-name="Terraform Service Account" \
  --project=my-project

# Grant necessary roles
ROLES=(
  "roles/compute.admin"
  "roles/storage.admin"
  "roles/iam.serviceAccountUser"
  "roles/resourcemanager.projectIamAdmin"
  "roles/container.admin"
  "roles/cloudsql.admin"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# Create a key for the service account
gcloud iam service-accounts keys create ~/terraform-key.json \
  --iam-account=terraform@my-project.iam.gserviceaccount.com
```

Then configure Terraform to use it:

```hcl
provider "google" {
  project     = "my-project"
  region      = "us-central1"
  credentials = file("~/terraform-key.json")
}
```

Or use the environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/terraform-key.json"
```

## Using Workload Identity Federation

For CI/CD systems like GitHub Actions, use Workload Identity Federation instead of service account keys:

```hcl
# Create workload identity pool
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

## Debugging Permission Errors

```bash
# Enable debug logging
export TF_LOG=DEBUG
terraform plan 2>&1 | grep "403\|permission\|forbidden"

# Check which permissions a role includes
gcloud iam roles describe roles/compute.admin --format="yaml(includedPermissions)"

# Test a specific permission
gcloud iam list-testable-permissions //cloudresourcemanager.googleapis.com/projects/my-project \
  --filter="name:compute.instances.create"
```

## Monitoring and Alerts

Set up monitoring with [OneUptime](https://oneuptime.com) to track your Terraform deployment failures. Getting alerted when permission errors occur lets you fix IAM issues quickly rather than discovering them during critical deployments.

## Conclusion

GCP permission denied errors are usually straightforward because the error message tells you exactly which permission is missing. The fix is to grant the corresponding role to your Terraform service account. Remember to also grant `roles/iam.serviceAccountUser` if your resources use service accounts, and check for organization policy constraints that cannot be overridden by IAM. For a comprehensive setup, grant the common admin roles to your Terraform service account and narrow down as needed.
