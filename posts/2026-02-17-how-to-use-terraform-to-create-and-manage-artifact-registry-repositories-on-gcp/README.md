# How to Use Terraform to Create and Manage Artifact Registry Repositories on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Artifact Registry, Docker, Container Registry, DevOps

Description: Learn how to create and manage Google Cloud Artifact Registry repositories using Terraform for Docker images, language packages, and other artifacts with proper access control.

---

Artifact Registry is Google Cloud's service for storing and managing build artifacts - Docker images, npm packages, Python packages, Maven artifacts, and more. If you are using GCP for your infrastructure, Artifact Registry is the natural place to store your container images and packages.

Managing Artifact Registry with Terraform ensures your repositories are consistently configured, properly secured, and reproducible across environments. Let me walk through the setup.

## Why Artifact Registry Over Container Registry

If you have been using Google Container Registry (GCR), it is time to switch. Container Registry is deprecated and Artifact Registry is its replacement. The key improvements are:

- Multiple repository support with separate access controls
- Support for more than just Docker images (npm, Python, Maven, Go, and others)
- Regional and multi-regional repository locations
- Better integration with IAM for fine-grained access control
- Vulnerability scanning built in

## Enabling the API

First, enable the Artifact Registry API:

```hcl
# apis.tf - Enable the Artifact Registry API
resource "google_project_service" "artifactregistry" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}
```

## Creating a Docker Repository

Here is a basic Docker repository:

```hcl
# artifact_registry.tf - Docker image repository
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "docker-images"
  description   = "Docker image repository for application containers"
  format        = "DOCKER"
  project       = var.project_id

  # Clean up policy to manage storage costs
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      older_than = "2592000s"  # 30 days in seconds
      tag_state  = "UNTAGGED"
    }
  }

  cleanup_policies {
    id     = "keep-recent-tagged"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.artifactregistry]
}
```

The cleanup policies are worth paying attention to. Without them, your repository grows indefinitely and storage costs creep up. The configuration above keeps the 10 most recent tagged versions and deletes untagged images older than 30 days.

## Creating Multiple Repository Types

Artifact Registry supports several formats. Here is how to create repositories for different artifact types:

```hcl
# Docker repository for container images
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "docker-images"
  description   = "Docker container images"
  format        = "DOCKER"
  project       = var.project_id

  docker_config {
    immutable_tags = false  # Set to true for production to prevent tag overwrites
  }
}

# npm repository for Node.js packages
resource "google_artifact_registry_repository" "npm" {
  location      = var.region
  repository_id = "npm-packages"
  description   = "Internal npm packages"
  format        = "NPM"
  project       = var.project_id
}

# Python repository for pip packages
resource "google_artifact_registry_repository" "python" {
  location      = var.region
  repository_id = "python-packages"
  description   = "Internal Python packages"
  format        = "PYTHON"
  project       = var.project_id
}

# Maven repository for Java artifacts
resource "google_artifact_registry_repository" "maven" {
  location      = var.region
  repository_id = "maven-artifacts"
  description   = "Internal Maven artifacts"
  format        = "MAVEN"
  project       = var.project_id

  maven_config {
    allow_snapshot_overwrites = false
    version_policy            = "RELEASE"
  }
}
```

## Repository Access Control

Set up IAM to control who can push and pull from each repository:

```hcl
# iam.tf - Artifact Registry access control

# Allow CI/CD to push images
resource "google_artifact_registry_repository_iam_member" "ci_writer" {
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  project    = var.project_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.ci_builder.email}"
}

# Allow Cloud Run / GKE to pull images
resource "google_artifact_registry_repository_iam_member" "runtime_reader" {
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  project    = var.project_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.runtime.email}"
}

# Allow developers to pull images for local development
resource "google_artifact_registry_repository_iam_member" "dev_reader" {
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  project    = var.project_id
  role       = "roles/artifactregistry.reader"
  member     = "group:developers@example.com"
}
```

## Configuring Docker Authentication

After creating the repository, configure Docker to authenticate with it:

```bash
# Configure Docker to use gcloud for authentication with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Now you can push and pull images
docker tag my-app:latest us-central1-docker.pkg.dev/my-project/docker-images/my-app:latest
docker push us-central1-docker.pkg.dev/my-project/docker-images/my-app:latest
```

## Vulnerability Scanning

Enable vulnerability scanning for your Docker repositories:

```hcl
# Enable Container Analysis API for vulnerability scanning
resource "google_project_service" "containeranalysis" {
  project = var.project_id
  service = "containerscanning.googleapis.com"

  disable_on_destroy = false
}
```

Vulnerability scanning runs automatically when images are pushed to the repository. You can view scan results in the console or query them through the Container Analysis API.

## Remote Repositories (Proxy)

Artifact Registry can act as a proxy for public registries, caching packages and providing a consistent access point:

```hcl
# Remote repository that proxies Docker Hub
resource "google_artifact_registry_repository" "dockerhub_proxy" {
  location      = var.region
  repository_id = "dockerhub-proxy"
  description   = "Proxy for Docker Hub images"
  format        = "DOCKER"
  mode          = "REMOTE_REPOSITORY"
  project       = var.project_id

  remote_repository_config {
    description = "Docker Hub proxy"
    docker_repository {
      public_repository = "DOCKER_HUB"
    }
  }
}

# Remote repository that proxies npmjs.org
resource "google_artifact_registry_repository" "npm_proxy" {
  location      = var.region
  repository_id = "npmjs-proxy"
  description   = "Proxy for npmjs.org"
  format        = "NPM"
  mode          = "REMOTE_REPOSITORY"
  project       = var.project_id

  remote_repository_config {
    description = "npm proxy"
    npm_repository {
      public_repository = "NPMJS"
    }
  }
}
```

## Virtual Repositories

Virtual repositories aggregate multiple repositories behind a single endpoint:

```hcl
# Virtual repository that combines internal and proxy repositories
resource "google_artifact_registry_repository" "npm_virtual" {
  location      = var.region
  repository_id = "npm"
  description   = "Virtual npm repository combining internal and proxy"
  format        = "NPM"
  mode          = "VIRTUAL_REPOSITORY"
  project       = var.project_id

  virtual_repository_config {
    upstream_policies {
      id         = "internal"
      repository = google_artifact_registry_repository.npm.id
      priority   = 10  # Check internal first
    }

    upstream_policies {
      id         = "proxy"
      repository = google_artifact_registry_repository.npm_proxy.id
      priority   = 20  # Fall back to proxy
    }
  }
}
```

## Environment-Specific Repositories

Create separate repositories for each environment:

```hcl
# repositories.tf - Environment-specific Docker repositories
locals {
  environments = ["dev", "staging", "production"]
}

resource "google_artifact_registry_repository" "docker" {
  for_each = toset(local.environments)

  location      = var.region
  repository_id = "docker-${each.value}"
  description   = "Docker images for ${each.value} environment"
  format        = "DOCKER"
  project       = var.project_id

  docker_config {
    # Only allow immutable tags in production
    immutable_tags = each.value == "production"
  }

  labels = {
    environment = each.value
    managed_by  = "terraform"
  }
}
```

## Outputs

```hcl
# outputs.tf
output "docker_repository_url" {
  description = "The URL for pushing Docker images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.name}"
}

output "npm_repository_url" {
  description = "The URL for the npm repository"
  value       = "https://${var.region}-npm.pkg.dev/${var.project_id}/${google_artifact_registry_repository.npm.name}/"
}
```

## Best Practices

1. **Set up cleanup policies** from day one. Stale images accumulate fast and storage costs add up.
2. **Use immutable tags in production.** This prevents accidentally overwriting a deployed image.
3. **Use repository-level IAM** instead of project-level. Not every service account needs access to every repository.
4. **Set up remote repositories** to proxy public registries. This gives you a cache, consistent access, and protection if a public registry goes down.
5. **Enable vulnerability scanning** and review scan results regularly.
6. **Use separate repositories per environment** to enforce promotion workflows.
7. **Configure Docker authentication** in your CI/CD pipeline using service accounts, not user credentials.

## Wrapping Up

Managing Artifact Registry with Terraform gives you version-controlled, reviewable repository configurations that are consistent across your organization. The combination of standard repositories, remote proxies, and virtual repositories covers the full spectrum of artifact management needs. Start with a Docker repository for your container images, add cleanup policies to control costs, and expand to other formats as your needs grow.
