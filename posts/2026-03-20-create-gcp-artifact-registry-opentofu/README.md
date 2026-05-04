# How to Create GCP Artifact Registry with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Artifact Registry, Container Registry, Infrastructure as Code

Description: Learn how to create GCP Artifact Registry repositories with OpenTofu for storing container images, Maven packages, npm modules, and other artifacts.

GCP Artifact Registry is the successor to Container Registry and supports Docker, Maven, npm, PyPI, Helm, and other formats. Managing repositories in OpenTofu ensures consistent cleanup policies, access control, and regional placement.

## Provider Configuration

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}
```

## Docker Repository

```hcl
resource "google_artifact_registry_repository" "docker" {
  location      = "us-central1"
  repository_id = "docker-images"
  format        = "DOCKER"
  description   = "Docker container images"

  # Cleanup policy to remove untagged images after 7 days
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"  # 7 days
    }
  }

  # Keep at least 5 tagged images
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 5
    }
  }

  labels = {
    environment = "production"
    team        = "platform"
  }
}
```

## Multi-Format Repositories

```hcl
# Maven repository for Java artifacts

resource "google_artifact_registry_repository" "maven" {
  location      = "us-central1"
  repository_id = "maven-packages"
  format        = "MAVEN"
  description   = "Java Maven packages"

  maven_config {
    allow_snapshot_overwrites = false
    version_policy            = "RELEASE"  # RELEASE, SNAPSHOT, or VERSION_POLICY_UNSPECIFIED
  }
}

# npm repository for Node.js packages
resource "google_artifact_registry_repository" "npm" {
  location      = "us-central1"
  repository_id = "npm-packages"
  format        = "NPM"
  description   = "npm packages"
}

# Python PyPI repository
resource "google_artifact_registry_repository" "pypi" {
  location      = "us-central1"
  repository_id = "python-packages"
  format        = "PYTHON"
  description   = "Python packages"
}

# Helm charts repository
resource "google_artifact_registry_repository" "helm" {
  location      = "us-central1"
  repository_id = "helm-charts"
  format        = "HELM"
  description   = "Helm charts"
}
```

## IAM Access Control

```hcl
# Allow GKE nodes to pull Docker images
resource "google_artifact_registry_repository_iam_member" "gke_pull" {
  project    = var.project_id
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Allow CI/CD service account to push Docker images
resource "google_artifact_registry_repository_iam_member" "ci_push" {
  project    = var.project_id
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cicd.email}"
}
```

## Regional Repository

```hcl
# Multi-region repository for global deployments
resource "google_artifact_registry_repository" "global_docker" {
  location      = "us"   # Multi-region: us, europe, asia
  repository_id = "global-docker"
  format        = "DOCKER"
  description   = "Multi-region Docker repository"
}
```

## Outputs

```hcl
output "docker_registry_url" {
  value = "${google_artifact_registry_repository.docker.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}"
}
```

## Conclusion

GCP Artifact Registry in OpenTofu supports multiple artifact formats in a single managed service. Create Docker repositories for container images, Maven/npm/PyPI for language packages, and Helm for chart storage. Configure cleanup policies to automatically remove untagged images, use IAM bindings for least-privilege access, and choose multi-region locations for globally distributed teams.
