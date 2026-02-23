# How to Fix Terraform GCP API Not Enabled Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, API, Troubleshooting, Infrastructure as Code

Description: Fix googleapi Error 403 API not enabled errors in Terraform when GCP project APIs have not been activated for your project.

---

When Terraform reports that a GCP API is "not enabled," it means the Google Cloud project you are targeting has not activated the API for the service you are trying to use. Unlike AWS where services are available by default, GCP requires you to explicitly enable each API before you can use it. This is a one-time setup per project, but it trips up a lot of people.

## What the Error Looks Like

```
Error: Error creating Instance: googleapi: Error 403: Compute Engine API
has not been used in project 123456789 before or it is disabled.
Enable it by visiting
https://console.developers.google.com/apis/api/compute.googleapis.com/overview?project=123456789
then retry. If you enabled this API recently, wait a few minutes for
the action to propagate to our systems and retry., accessNotConfigured

Error: Error creating Bucket: googleapi: Error 403: Cloud Storage API
has not been enabled for this project., forbidden

Error: Error creating Network: googleapi: Error 403:
compute.googleapis.com is not enabled for project "my-project",
forbidden
```

The error message is actually quite helpful, as it tells you exactly which API needs to be enabled and often includes a direct link to enable it.

## Fix 1: Enable APIs Using gcloud CLI

The fastest way to enable an API is with the gcloud CLI:

```bash
# Enable a specific API
gcloud services enable compute.googleapis.com --project=my-project

# Enable multiple APIs at once
gcloud services enable \
  compute.googleapis.com \
  storage.googleapis.com \
  container.googleapis.com \
  sqladmin.googleapis.com \
  --project=my-project
```

After enabling, you may need to wait a minute or two for the change to propagate.

## Fix 2: Enable APIs in Terraform

You can manage API enablement directly in Terraform using the `google_project_service` resource:

```hcl
# Enable Compute Engine API
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  # Do not disable the API if this resource is destroyed
  disable_on_destroy = false
}

# Enable Cloud Storage API
resource "google_project_service" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"

  disable_on_destroy = false
}

# Now create resources that depend on these APIs
resource "google_compute_instance" "vm" {
  depends_on = [google_project_service.compute]

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
}
```

The `depends_on` ensures Terraform waits for the API to be enabled before trying to create resources that use it.

## Fix 3: Enable All Common APIs at Once

For new projects, enable all the APIs you will need upfront:

```hcl
locals {
  required_apis = [
    "compute.googleapis.com",
    "storage.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "dns.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudkms.googleapis.com",
    "cloudbuild.googleapis.com",
    "networkmanagement.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
```

Or using the gcloud CLI:

```bash
#!/bin/bash
# enable-apis.sh

PROJECT_ID=$1

apis=(
  "compute.googleapis.com"
  "storage.googleapis.com"
  "container.googleapis.com"
  "sqladmin.googleapis.com"
  "iam.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "servicenetworking.googleapis.com"
  "dns.googleapis.com"
  "logging.googleapis.com"
  "monitoring.googleapis.com"
  "cloudfunctions.googleapis.com"
  "run.googleapis.com"
  "artifactregistry.googleapis.com"
  "pubsub.googleapis.com"
  "secretmanager.googleapis.com"
)

echo "Enabling APIs for project $PROJECT_ID..."
gcloud services enable "${apis[@]}" --project="$PROJECT_ID"
echo "Done."
```

## Common API Names by Resource Type

Here is a reference for which API corresponds to which Terraform resources:

| Terraform Resource | API to Enable |
|---|---|
| google_compute_* | compute.googleapis.com |
| google_storage_* | storage.googleapis.com |
| google_container_* (GKE) | container.googleapis.com |
| google_sql_* | sqladmin.googleapis.com |
| google_dns_* | dns.googleapis.com |
| google_cloudfunctions_* | cloudfunctions.googleapis.com |
| google_cloud_run_* | run.googleapis.com |
| google_pubsub_* | pubsub.googleapis.com |
| google_secret_manager_* | secretmanager.googleapis.com |
| google_kms_* | cloudkms.googleapis.com |
| google_artifact_registry_* | artifactregistry.googleapis.com |
| google_project_iam_* | cloudresourcemanager.googleapis.com |
| google_service_account_* | iam.googleapis.com |
| google_monitoring_* | monitoring.googleapis.com |
| google_logging_* | logging.googleapis.com |
| google_redis_* | redis.googleapis.com |
| google_memcache_* | memcache.googleapis.com |
| google_filestore_* | file.googleapis.com |

## Handling API Enablement Timing

Enabling an API is not instant. There is a propagation delay that can range from a few seconds to a couple of minutes. If you enable an API and immediately try to use it, you might still get the error.

### In Terraform

Use `depends_on` and the API resource will handle the timing:

```hcl
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"
}

# Terraform waits for the API resource to be created before proceeding
resource "google_compute_network" "vpc" {
  depends_on = [google_project_service.compute]

  name                    = "my-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}
```

### With gcloud

Add a sleep after enabling:

```bash
gcloud services enable compute.googleapis.com --project=my-project
echo "Waiting for API propagation..."
sleep 60
terraform apply
```

## Checking Which APIs Are Enabled

```bash
# List all enabled APIs
gcloud services list --enabled --project=my-project --format="table(name)"

# Check if a specific API is enabled
gcloud services list --enabled --project=my-project \
  --filter="name:compute.googleapis.com"

# List all available APIs (including disabled)
gcloud services list --available --project=my-project
```

## Permissions Needed to Enable APIs

To enable APIs, you need the `serviceusage.services.enable` permission, which is included in these roles:

- `roles/owner`
- `roles/editor`
- `roles/serviceusage.serviceUsageAdmin`

If your Terraform service account cannot enable APIs, you have two options:

**Option 1: Grant the permission.**

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageAdmin"
```

**Option 2: Pre-enable APIs** using an admin account before running Terraform.

## Handling New Projects

If you are creating GCP projects with Terraform, enable APIs as part of the project setup:

```hcl
resource "google_project" "new_project" {
  name       = "My New Project"
  project_id = "my-new-project"
  org_id     = var.org_id

  billing_account = var.billing_account
}

# Enable APIs after project creation
resource "google_project_service" "compute" {
  project = google_project.new_project.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}
```

## The disable_on_destroy Flag

Pay attention to the `disable_on_destroy` flag:

```hcl
resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  # If true (default), destroying this resource disables the API
  # This can break other resources that depend on it
  disable_on_destroy = false

  # If true, disabling the API will also delete all dependent resources
  # BE VERY CAREFUL with this
  disable_dependent_services = false
}
```

Setting `disable_on_destroy = false` is generally safer, especially in shared projects where other Terraform configurations or manual resources might depend on the API.

## Monitoring API Usage

Use [OneUptime](https://oneuptime.com) to monitor your GCP project health and track API usage. Getting alerted when API quotas are approached or when services encounter errors helps you stay ahead of infrastructure issues.

## Conclusion

GCP's "API not enabled" error is solved by enabling the required API using either `gcloud services enable` or the `google_project_service` Terraform resource. For new projects, enable all needed APIs upfront. Always use `depends_on` in Terraform to ensure the API is enabled before resources try to use it, and set `disable_on_destroy = false` to prevent accidental API disabling when managing your infrastructure.
