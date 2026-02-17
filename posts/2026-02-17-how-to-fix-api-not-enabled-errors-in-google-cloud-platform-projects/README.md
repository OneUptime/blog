# How to Fix API Not Enabled Errors in Google Cloud Platform Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud APIs, Troubleshooting, Cloud Console, gcloud

Description: A complete guide to fixing API not enabled errors in Google Cloud Platform, including how to enable APIs, troubleshoot common issues, and manage API access across projects.

---

If you have worked with GCP for more than a few minutes, you have seen this error:

```
ERROR: (gcloud.compute.instances.list) PERMISSION_DENIED:
Compute Engine API has not been used in project 123456789 before or it is disabled.
Enable it by visiting https://console.developers.google.com/apis/api/compute.googleapis.com/overview?project=123456789
then retry.
```

This is one of the most frequent errors in GCP and also one of the easiest to fix. But it trips up newcomers and experienced developers alike, especially when working across multiple projects.

## Why This Happens

Unlike AWS where most services are available by default, GCP requires you to explicitly enable each API before you can use it. This is a design decision - it keeps your project's attack surface small and makes billing more transparent. But it also means you need to enable APIs before your code or gcloud commands will work.

Every GCP project starts with only a handful of APIs enabled. When you try to use a service whose API is not enabled, you get the error above.

## The Quick Fix

The fastest way to enable an API is with gcloud:

```bash
# Enable the Compute Engine API
gcloud services enable compute.googleapis.com --project=my-project
```

That is it. The API is typically available within a few seconds, though some APIs can take up to a minute to propagate.

## Enabling Multiple APIs at Once

Most projects need a bunch of APIs enabled. Instead of doing them one at a time, batch them:

```bash
# Enable multiple APIs in a single command
# These are the most commonly needed APIs for a typical GCP project
gcloud services enable \
    compute.googleapis.com \
    container.googleapis.com \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    cloudfunctions.googleapis.com \
    sqladmin.googleapis.com \
    storage.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com \
    --project=my-project
```

## Checking Which APIs Are Enabled

Before troubleshooting, check what is already enabled:

```bash
# List all currently enabled APIs in your project
gcloud services list --enabled --project=my-project

# Check if a specific API is enabled
gcloud services list --enabled \
    --filter="name:compute.googleapis.com" \
    --project=my-project
```

To see all available APIs (including disabled ones):

```bash
# List available APIs that can be enabled
# This is a long list - filter it if you know what you are looking for
gcloud services list --available \
    --filter="name:container" \
    --project=my-project
```

## Common API Names

Finding the right API name can be confusing because the names do not always match the service names in the Console. Here is a reference:

| GCP Service | API Name |
|---|---|
| Compute Engine | compute.googleapis.com |
| Cloud Storage | storage.googleapis.com |
| GKE | container.googleapis.com |
| Cloud Run | run.googleapis.com |
| Cloud Functions | cloudfunctions.googleapis.com |
| Cloud SQL | sqladmin.googleapis.com |
| BigQuery | bigquery.googleapis.com |
| Pub/Sub | pubsub.googleapis.com |
| Cloud Build | cloudbuild.googleapis.com |
| Secret Manager | secretmanager.googleapis.com |
| Cloud DNS | dns.googleapis.com |
| Cloud KMS | cloudkms.googleapis.com |
| Artifact Registry | artifactregistry.googleapis.com |
| Cloud Scheduler | cloudscheduler.googleapis.com |
| Firestore | firestore.googleapis.com |
| Cloud Monitoring | monitoring.googleapis.com |
| Cloud Logging | logging.googleapis.com |
| IAM | iam.googleapis.com |
| Resource Manager | cloudresourcemanager.googleapis.com |

## Troubleshooting API Enable Failures

Sometimes enabling an API fails. Here are the common reasons.

### Billing Not Enabled

Most APIs require an active billing account linked to the project:

```
ERROR: (gcloud.services.enable) FAILED_PRECONDITION:
Billing must be enabled for activation of service 'compute.googleapis.com' in project 'my-project'
```

Fix this by linking a billing account:

```bash
# List available billing accounts
gcloud billing accounts list

# Link a billing account to the project
gcloud billing projects link my-project \
    --billing-account=0X0X0X-0X0X0X-0X0X0X
```

### Organization Policy Restrictions

Your organization might restrict which APIs can be enabled:

```bash
# Check if there is a service restriction org policy
gcloud resource-manager org-policies describe \
    serviceuser.services \
    --project=my-project
```

If an org policy is blocking you, you will need to work with your organization admin.

### Missing Permissions to Enable APIs

You need the `serviceusage.services.enable` permission to enable APIs. This is included in the `roles/serviceusage.serviceUsageAdmin` role and in `roles/editor`.

```bash
# Grant permission to enable APIs
gcloud projects add-iam-binding my-project \
    --member="user:developer@example.com" \
    --role="roles/serviceusage.serviceUsageAdmin"
```

## Automating API Enablement with Terraform

If you manage infrastructure as code, enable APIs as part of your Terraform configuration:

```hcl
# Enable required APIs using Terraform
# The google_project_service resource manages API enablement
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  # Do not disable the API when this resource is destroyed
  disable_on_destroy = false
}

resource "google_project_service" "container" {
  project = var.project_id
  service = "container.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "run" {
  project = var.project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

# You can also use a loop for multiple APIs
variable "apis" {
  default = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "sqladmin.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(var.apis)
  project  = var.project_id
  service  = each.value

  disable_on_destroy = false
}
```

## Handling API Dependencies

Some APIs depend on other APIs. For example, GKE requires both the Container API and the Compute Engine API. If you try to enable the Container API without Compute Engine, GCP will usually auto-enable the dependency, but it is better to be explicit:

```bash
# Enable APIs with their dependencies explicitly
# GKE needs both container and compute APIs
gcloud services enable \
    compute.googleapis.com \
    container.googleapis.com \
    --project=my-project
```

## Project Setup Script

Here is a script that sets up a new project with all commonly needed APIs:

```bash
#!/bin/bash
# Bootstrap script for a new GCP project
# Enables all commonly needed APIs

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: ./setup-project.sh <project-id>"
    exit 1
fi

echo "Setting up project: $PROJECT_ID"

# Core infrastructure APIs
APIS=(
    "compute.googleapis.com"
    "container.googleapis.com"
    "run.googleapis.com"
    "cloudfunctions.googleapis.com"
    "appengine.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "sqladmin.googleapis.com"
    "storage.googleapis.com"
    "pubsub.googleapis.com"
    "secretmanager.googleapis.com"
    "cloudkms.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudtrace.googleapis.com"
    "iam.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "serviceusage.googleapis.com"
)

echo "Enabling ${#APIS[@]} APIs..."
gcloud services enable "${APIS[@]}" --project=$PROJECT_ID

echo "Done. All APIs enabled."
```

The key takeaway: always enable your APIs upfront when setting up a new GCP project. Add it to your project bootstrap scripts or Terraform configurations so you never hit this error in the middle of a deployment. It takes seconds to prevent hours of confusion.
