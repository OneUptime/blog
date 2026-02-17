# How to Create a Docker Repository in Google Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Docker, Container Registry, DevOps

Description: Step-by-step guide to creating and configuring a Docker repository in Google Artifact Registry for storing and managing container images.

---

Google Artifact Registry is the recommended way to store Docker images on GCP. It replaced the older Container Registry service and adds features like multi-format support, fine-grained IAM permissions, and vulnerability scanning. If you are still using Container Registry, now is a good time to switch.

Let me walk through creating a Docker repository, pushing your first image, and configuring it for team use.

## Prerequisites

You need:

- A GCP project with billing enabled
- The gcloud CLI installed and configured
- Docker installed locally
- The Artifact Registry API enabled

Enable the API if you have not already:

```bash
# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=my-project
```

## Creating the Repository

Creating a Docker repository takes a single command:

```bash
# Create a Docker repository in the us-central1 region
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for production services" \
  --project=my-project
```

Let me break down the flags:

- `--repository-format=docker` tells Artifact Registry this will store Docker images
- `--location` sets the region where images are stored. Pick a region close to where your workloads run
- `--description` is optional but helpful for teams

## Choosing the Right Location

Artifact Registry supports both regional and multi-regional locations:

**Regional locations** like `us-central1`, `europe-west1`, or `asia-east1` store data in a single region. Lower latency if your workloads are in the same region.

**Multi-regional locations** like `us`, `europe`, or `asia` replicate data across multiple regions within that geography. Better availability but slightly higher latency.

```bash
# Create a multi-regional repository for higher availability
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us \
  --description="Multi-regional Docker repository" \
  --project=my-project
```

For most production workloads, I recommend using the same region as your GKE cluster or Cloud Run service. This minimizes image pull times.

## Configuring Docker Authentication

Before you can push images, Docker needs to know how to authenticate with Artifact Registry. The easiest way is using gcloud as a credential helper:

```bash
# Configure Docker to use gcloud for authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

This command updates your Docker config file (`~/.docker/config.json`) to use gcloud for any requests to `us-central1-docker.pkg.dev`. You need to run this once per region you want to push to.

For multiple regions:

```bash
# Configure Docker for multiple regions at once
gcloud auth configure-docker \
  us-central1-docker.pkg.dev,europe-west1-docker.pkg.dev,asia-east1-docker.pkg.dev
```

## Pushing Your First Image

Now let us build and push an image. The image tag format for Artifact Registry is:

```
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG
```

Here is the full workflow:

```bash
# Build a Docker image
docker build -t us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0 .

# Push it to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0
```

If you already have an image with a different tag, you can re-tag it:

```bash
# Tag an existing image for Artifact Registry
docker tag my-app:latest us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:latest

# Push the re-tagged image
docker push us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:latest
```

## Pulling Images

Pulling works the same as any Docker registry:

```bash
# Pull an image from Artifact Registry
docker pull us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0
```

GKE clusters in the same project can pull images without any extra configuration. The default compute service account has read access to Artifact Registry.

## Listing Images and Tags

You can browse your repository from the command line:

```bash
# List all images in the repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/my-docker-repo

# List tags for a specific image
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app
```

## Setting Up IAM Permissions

Artifact Registry uses GCP IAM for access control. Here are the most common roles:

```bash
# Grant read access to a service account (for pulling images)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-service@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Grant write access to a CI/CD service account (for pushing images)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:build-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project

# Grant admin access (for managing the repository itself)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="user:admin@example.com" \
  --role="roles/artifactregistry.repoAdmin" \
  --project=my-project
```

## Enabling Vulnerability Scanning

Artifact Registry can automatically scan images for known vulnerabilities when they are pushed:

```bash
# Enable Container Analysis API for vulnerability scanning
gcloud services enable containeranalysis.googleapis.com --project=my-project

# Scanning is automatic once the API is enabled
# You can check scan results for an image like this:
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0 \
  --show-package-vulnerability
```

## Creating a Repository with Terraform

If you manage infrastructure as code, here is the Terraform configuration:

```hcl
# main.tf - Artifact Registry Docker repository
resource "google_artifact_registry_repository" "docker_repo" {
  location      = "us-central1"
  repository_id = "my-docker-repo"
  description   = "Docker images for production services"
  format        = "DOCKER"

  # Optional: set cleanup policies
  cleanup_policy_dry_run = false

  docker_config {
    # Allow mutable tags (default behavior)
    immutable_tags = false
  }
}

# Grant read access to GKE nodes
resource "google_artifact_registry_repository_iam_member" "gke_reader" {
  project    = google_artifact_registry_repository.docker_repo.project
  location   = google_artifact_registry_repository.docker_repo.location
  repository = google_artifact_registry_repository.docker_repo.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${var.gke_service_account}"
}
```

## Immutable Tags

If you want to prevent image tags from being overwritten (a good practice for production), enable immutable tags:

```bash
# Create a repository with immutable tags
gcloud artifacts repositories create my-prod-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Production images with immutable tags" \
  --immutable-tags \
  --project=my-project
```

With immutable tags, once you push `my-app:v1.0.0`, you cannot push a different image with the same tag. This prevents accidental overwrites and gives you confidence that a specific tag always points to the same image.

## Migrating from Container Registry

If you have existing images in Container Registry (gcr.io), you can copy them to Artifact Registry:

```bash
# Copy a single image using crane (install with: go install github.com/google/go-containerregistry/cmd/crane@latest)
crane copy \
  gcr.io/my-project/my-app:v1.0.0 \
  us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0

# Or use docker to pull and re-push
docker pull gcr.io/my-project/my-app:v1.0.0
docker tag gcr.io/my-project/my-app:v1.0.0 \
  us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0
docker push us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0
```

## Wrapping Up

Creating a Docker repository in Artifact Registry is straightforward and gives you a solid foundation for container image management. The key steps are creating the repository, configuring Docker authentication, and setting up IAM permissions for your team. Once that is in place, you can start pushing images and integrating the repository with your CI/CD pipeline and deployment targets.
