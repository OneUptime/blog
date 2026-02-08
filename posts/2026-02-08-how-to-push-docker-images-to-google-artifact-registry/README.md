# How to Push Docker Images to Google Artifact Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Google Cloud, Artifact Registry, GCP, Container Registry, CI/CD, DevOps, Cloud

Description: A step-by-step guide to pushing Docker images to Google Artifact Registry, including authentication, repository setup, and CI/CD integration.

---

Google Artifact Registry is the successor to Google Container Registry (GCR). It supports Docker images along with other artifact formats like Maven, npm, and Python packages. If you deploy to Google Cloud (GKE, Cloud Run, or Compute Engine), Artifact Registry is the natural choice for storing your container images. It integrates with IAM for fine-grained access control and provides vulnerability scanning out of the box.

This guide covers everything from initial setup to automated CI/CD pushes.

## Prerequisites

You need the Google Cloud CLI (gcloud) installed and a GCP project:

```bash
# Install gcloud CLI (macOS)
brew install google-cloud-sdk

# Or download from https://cloud.google.com/sdk/docs/install

# Initialize and authenticate
gcloud init
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

## Creating an Artifact Registry Repository

Unlike Docker Hub, Artifact Registry requires you to create a repository before pushing images:

```bash
# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com

# Create a Docker repository in a specific region
gcloud artifacts repositories create my-docker-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker images for my application"

# Verify the repository was created
gcloud artifacts repositories list --location=us-central1
```

Choose a location close to your deployment infrastructure. Available regions include us-central1, us-east1, europe-west1, asia-east1, and many others. Multi-region locations (us, europe, asia) are also available for global access.

## Authenticating Docker with Artifact Registry

Docker needs credentials to push to Artifact Registry. The gcloud CLI configures this automatically:

```bash
# Configure Docker to use gcloud as a credential helper
gcloud auth configure-docker us-central1-docker.pkg.dev

# This adds an entry to ~/.docker/config.json like:
# {
#   "credHelpers": {
#     "us-central1-docker.pkg.dev": "gcloud"
#   }
# }
```

The credential helper means you never have to manually run `docker login`. Every Docker push or pull to that registry uses your gcloud credentials automatically.

## Image Naming Convention

Artifact Registry images follow a specific naming pattern:

```
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG
```

For example:

```
us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0
```

## Building and Pushing an Image

Build your image with the correct tag and push it:

```bash
# Build the image with the full Artifact Registry path
docker build -t us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0 .

# Push the image
docker push us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0

# Tag and push as latest as well
docker tag us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0 \
    us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:latest
docker push us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:latest
```

## Verifying the Push

Confirm the image is in the registry:

```bash
# List images in the repository
gcloud artifacts docker images list \
    us-central1-docker.pkg.dev/my-project-123/my-docker-repo

# List tags for a specific image
gcloud artifacts docker tags list \
    us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp

# Get detailed information about a specific tag
gcloud artifacts docker images describe \
    us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0
```

## CI/CD with GitHub Actions

Automate image builds and pushes with GitHub Actions using Workload Identity Federation (recommended) or a service account key:

### Using Workload Identity Federation (Recommended)

```yaml
# .github/workflows/build-push.yml
name: Build and Push to Artifact Registry
on:
  push:
    branches: [main]

env:
  PROJECT_ID: my-project-123
  REGION: us-central1
  REPOSITORY: my-docker-repo
  IMAGE: myapp

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      # Authenticate with Google Cloud using Workload Identity Federation
      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: 'projects/123456/locations/global/workloadIdentityPools/github/providers/my-provider'
          service_account: 'github-actions@my-project-123.iam.gserviceaccount.com'

      # Set up Docker to authenticate with Artifact Registry
      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet

      # Build the Docker image
      - name: Build
        run: |
          docker build -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:${{ github.sha }} .
          docker tag ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:${{ github.sha }} \
            ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:latest

      # Push both tags
      - name: Push
        run: |
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:${{ github.sha }}
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:latest
```

### Using a Service Account Key

```yaml
# Alternative: authenticate with a service account key JSON
- name: Auth with service account
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

Create the service account and grant it push permissions:

```bash
# Create a service account for CI/CD
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"

# Grant permission to push images to the repository
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
    --location=us-central1 \
    --member="serviceAccount:github-actions@my-project-123.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"
```

## Pulling Images from Artifact Registry

Other services and machines can pull images after authentication:

```bash
# Pull from another machine (after gcloud auth)
gcloud auth configure-docker us-central1-docker.pkg.dev
docker pull us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0

# Pull from GKE (automatic if in the same project)
# GKE nodes have automatic pull access to Artifact Registry in the same project
```

## Vulnerability Scanning

Artifact Registry includes built-in vulnerability scanning:

```bash
# Enable vulnerability scanning
gcloud services enable containerscanning.googleapis.com

# View scan results for an image
gcloud artifacts docker images describe \
    us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0 \
    --show-package-vulnerability
```

## Cleanup Policies

Manage storage costs by setting up automatic cleanup:

```bash
# Delete images older than 90 days (using a cleanup policy)
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
    --location=us-central1 \
    --policy=cleanup-policy.json
```

Create a cleanup policy file:

```json
{
  "cleanupPolicies": [
    {
      "id": "delete-old-images",
      "action": {"type": "Delete"},
      "condition": {
        "olderThan": "7776000s",
        "tagState": "ANY"
      }
    },
    {
      "id": "keep-minimum-versions",
      "action": {"type": "Keep"},
      "mostRecentVersions": {
        "keepCount": 5
      }
    }
  ]
}
```

## Multi-Architecture Images

Push images that work on both AMD64 and ARM64:

```bash
# Create a builder with multi-platform support
docker buildx create --name multiarch --use

# Build and push for multiple architectures
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag us-central1-docker.pkg.dev/my-project-123/my-docker-repo/myapp:v1.0.0 \
    --push \
    .
```

Google Artifact Registry is the recommended container registry for any GCP workload. The IAM integration provides security by default, the vulnerability scanning catches issues before deployment, and the gcloud credential helper makes authentication seamless. Set it up once, automate your pushes with CI/CD, and your images are ready for GKE, Cloud Run, or any other Google Cloud service.
