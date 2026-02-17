# How to Handle Container Registry Deprecation in Terraform Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Artifact Registry, Container Registry, Infrastructure as Code

Description: Learn how to update your Terraform configurations to replace Google Container Registry resources with Artifact Registry before the GCR deprecation deadline.

---

If you manage your GCP infrastructure with Terraform, you probably have Container Registry references scattered throughout your configurations. There might be IAM bindings on GCR storage buckets, GKE clusters configured to pull from gcr.io, and Cloud Build triggers that push to GCR paths. All of this needs to be updated for Artifact Registry.

This guide covers the Terraform-specific changes you need to make, including resource replacements, state management, and avoiding downtime during the switch.

## What Terraform Resources Are Affected

Container Registry in Terraform is a bit unusual because GCR does not have a dedicated Terraform resource. Instead, GCR uses Google Cloud Storage buckets under the hood, and IAM is typically managed through `google_storage_bucket_iam_*` resources. Here is what to look for:

- `google_container_registry` - The GCR resource itself
- `google_storage_bucket_iam_*` - IAM bindings on the GCR storage bucket
- Any resource with `image` fields referencing `gcr.io`
- Cloud Build trigger configurations
- GKE cluster configurations

## Step 1: Create Artifact Registry Repositories

Replace the implicit GCR storage with explicit Artifact Registry repositories.

Before (GCR):

```hcl
# Old GCR configuration - this resource will be deprecated
resource "google_container_registry" "registry" {
  project  = var.project_id
  location = "US"
}

# IAM on the underlying GCS bucket
resource "google_storage_bucket_iam_member" "gcr_reader" {
  bucket = google_container_registry.registry.id
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

After (Artifact Registry):

```hcl
# artifact-registry.tf
# Creates an Artifact Registry Docker repository to replace GCR
resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = "docker-images"
  format        = "DOCKER"
  description   = "Docker images repository (migrated from GCR)"

  # Optional: enable vulnerability scanning
  docker_config {
    immutable_tags = false
  }

  # Cleanup policy to automatically delete old untagged images
  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s"  # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-tagged-releases"
    action = "KEEP"
    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["v", "release"]
    }
  }
}

# Repository-level IAM for image pulling
resource "google_artifact_registry_repository_iam_member" "reader" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Repository-level IAM for CI/CD image pushing
resource "google_artifact_registry_repository_iam_member" "writer" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cicd.email}"
}
```

## Step 2: Update Variables

Create or update variables to reference the new registry.

```hcl
# variables.tf
variable "docker_registry" {
  description = "Base path for the Docker image registry"
  type        = string
  default     = "us-central1-docker.pkg.dev"
}

variable "docker_repository" {
  description = "Name of the Artifact Registry Docker repository"
  type        = string
  default     = "docker-images"
}

# Computed local for the full image prefix
locals {
  image_prefix = "${var.docker_registry}/${var.project_id}/${var.docker_repository}"
}
```

## Step 3: Update GKE Cluster Configuration

If your GKE cluster Terraform has image references, update them.

```hcl
# gke.tf
# GKE cluster with Artifact Registry access scope
resource "google_container_cluster" "primary" {
  name     = "my-cluster"
  location = var.region
  project  = var.project_id

  # Workload Identity is required for proper AR authentication
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  node_config {
    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      # This scope covers both GCR and Artifact Registry
      "https://www.googleapis.com/auth/cloud-platform",
    ]
  }
}
```

## Step 4: Update Cloud Build Trigger Configurations

If you manage Cloud Build triggers in Terraform, update the image references.

```hcl
# cloud-build.tf
# Cloud Build trigger that pushes to Artifact Registry
resource "google_cloudbuild_trigger" "app_build" {
  project  = var.project_id
  name     = "build-my-app"
  filename = "cloudbuild.yaml"

  github {
    owner = "my-org"
    name  = "my-repo"
    push {
      branch = "^main$"
    }
  }

  substitutions = {
    # Pass the Artifact Registry path as a substitution
    _IMAGE_REPO = "${local.image_prefix}/my-app"
  }
}
```

The corresponding `cloudbuild.yaml` uses the substitution.

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_IMAGE_REPO}:$SHORT_SHA', '.']
images:
  - '${_IMAGE_REPO}:$SHORT_SHA'
```

## Step 5: Update Cloud Run Services

Cloud Run services reference container images directly.

Before:

```hcl
# Old Cloud Run config with GCR image
resource "google_cloud_run_service" "api" {
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/api-service:latest"
      }
    }
  }
}
```

After:

```hcl
# cloud-run.tf
# Updated Cloud Run service with Artifact Registry image
resource "google_cloud_run_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "${local.image_prefix}/api-service:latest"
      }
      service_account_name = google_service_account.cloud_run_sa.email
    }
  }
}
```

## Step 6: Handle Terraform State

When switching from GCR to Artifact Registry resources, you need to manage the Terraform state carefully.

First, plan the changes to see what will happen.

```bash
# Review the plan before applying
terraform plan -out=migration.plan
```

The plan should show:
- The old `google_container_registry` and its IAM bindings being destroyed
- New `google_artifact_registry_repository` and its IAM members being created

If you want to remove the GCR resource from Terraform state without deleting it from GCP (to keep it as a fallback), use `terraform state rm`.

```bash
# Remove GCR from state without destroying it
terraform state rm google_container_registry.registry
terraform state rm google_storage_bucket_iam_member.gcr_reader
```

Then apply to create the new Artifact Registry resources.

```bash
# Apply only the new Artifact Registry resources
terraform apply
```

## Step 7: Enable gcr.io Redirection (Optional)

You can manage the gcr.io redirection through Terraform too.

```hcl
# gcr-redirect.tf
# Enable gcr.io redirection to Artifact Registry
resource "google_artifact_registry_vpcsc_config" "gcr_redirect" {
  project  = var.project_id
  location = var.region
}
```

Note: As of writing, the gcr.io redirection might need to be enabled through gcloud rather than Terraform, depending on your provider version. Check the latest google provider documentation.

## Finding All GCR References in Terraform

Search your Terraform files thoroughly.

```bash
# Find all gcr.io references in Terraform files
grep -rn "gcr\.io" --include="*.tf" --include="*.tfvars" .

# Find Container Registry resources
grep -rn "google_container_registry" --include="*.tf" .

# Find storage bucket IAM that might be GCR-related
grep -rn "artifacts\." --include="*.tf" .
```

## Migration Order

Follow this order to avoid downtime:

1. Create Artifact Registry repositories (terraform apply the new resources)
2. Copy images from GCR to Artifact Registry
3. Set up IAM on the new repositories
4. Enable gcr.io redirection (safety net)
5. Update image references in Terraform
6. Apply the updated Terraform
7. Verify everything works
8. Remove old GCR resources from Terraform

## Output the New Registry Path

Add an output to make it easy to reference the new registry path.

```hcl
# outputs.tf
output "docker_registry_url" {
  description = "The URL of the Artifact Registry Docker repository"
  value       = "${var.docker_registry}/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}

output "docker_repository_id" {
  description = "The full resource ID of the Artifact Registry repository"
  value       = google_artifact_registry_repository.docker.id
}
```

## Summary

Updating Terraform for the GCR to Artifact Registry migration involves replacing `google_container_registry` with `google_artifact_registry_repository`, updating IAM from storage bucket roles to Artifact Registry roles, and changing image path references throughout your configurations. Use local variables for the image prefix to keep things DRY, manage state carefully during the transition, and follow a sequential migration order to avoid downtime.
