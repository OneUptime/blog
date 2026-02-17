# How to Build and Push Docker Images to Artifact Registry Using Cloud Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Artifact Registry, Docker, Container Registry, CI/CD

Description: A complete walkthrough for building Docker images with Cloud Build and pushing them to Artifact Registry, Google Cloud's recommended container registry.

---

Artifact Registry is Google Cloud's recommended service for storing container images, replacing the older Container Registry (GCR). If you are using Cloud Build for your CI/CD pipelines, pushing images to Artifact Registry is a natural fit. In this post, I will walk through setting up Artifact Registry, configuring Cloud Build to push images there, and cover the common patterns and gotchas you will encounter.

## Artifact Registry vs Container Registry

Before diving in, a quick note on why Artifact Registry. Google Container Registry (gcr.io) still works but is in maintenance mode. Artifact Registry provides:

- Regional and multi-regional repositories
- Fine-grained IAM permissions at the repository level
- Support for multiple artifact types (Docker, npm, Maven, Python, Go modules)
- Vulnerability scanning integration
- Cleanup policies for automatic image pruning

If you are starting a new project, use Artifact Registry from the beginning. If you are on Container Registry, consider migrating.

## Setting Up Artifact Registry

### Step 1: Enable the API

```bash
# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com
```

### Step 2: Create a Docker Repository

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for my application"
```

Choose a location close to where your builds run and where your workloads deploy from. Common locations include `us-central1`, `us-east1`, `europe-west1`, and `asia-east1`.

For multi-region access, you can use multi-region locations:

```bash
# Create a multi-region repository
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us \
  --description="Docker images accessible from any US region"
```

### Step 3: Verify the Repository

```bash
# List your repositories
gcloud artifacts repositories list --location=us-central1
```

### Step 4: Grant Cloud Build Permissions

The Cloud Build service account needs permission to push images. By default, Cloud Build has the `Artifact Registry Writer` role at the project level. If you are using a custom service account or need to verify:

```bash
# Grant the Artifact Registry Writer role to Cloud Build
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.writer"
```

## The Artifact Registry Image Path

Artifact Registry image paths follow this format:

```
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG
```

For example:

```
us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app:v1.0.0
```

This is different from the old GCR path format (`gcr.io/my-project/my-app:v1.0.0`). The new format includes the repository name, giving you an extra level of organization.

## Building and Pushing with Cloud Build

### Basic Build and Push

The simplest cloudbuild.yaml for building and pushing to Artifact Registry:

```yaml
# Build a Docker image and push to Artifact Registry
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:latest'
      - '.'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:latest'
```

The `images` section tells Cloud Build to push these images after all steps complete. This is the simplest approach - you do not need a separate push step.

### Explicit Push Step

If you need more control over when the push happens (for example, only after tests pass), use an explicit push step:

```yaml
# Build, test, then push explicitly
steps:
  # Build the image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
      - '.'

  # Run tests using the built image
  - name: 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
    id: 'test'
    entrypoint: 'npm'
    args: ['test']

  # Push only if tests pass
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
```

Note that when using explicit push steps, you do not need the `images` section at the bottom.

### Using Substitution Variables for the Registry Path

To avoid repeating the long Artifact Registry path, use a substitution variable:

```yaml
# Use a substitution variable for the registry path
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '$_AR_REPO/my-app:$SHORT_SHA'
      - '-t'
      - '$_AR_REPO/my-app:latest'
      - '.'

images:
  - '$_AR_REPO/my-app:$SHORT_SHA'
  - '$_AR_REPO/my-app:latest'

substitutions:
  _AR_REPO: 'us-central1-docker.pkg.dev/${PROJECT_ID}/my-docker-repo'
```

## Multi-Architecture Builds

If you need images for both amd64 and arm64 (for example, to run on GKE nodes with different architectures):

```yaml
# Build multi-architecture images using Docker buildx
steps:
  # Set up buildx
  - name: 'gcr.io/cloud-builders/docker'
    args: ['buildx', 'create', '--use', '--name', 'multiarch']

  # Build and push for multiple architectures
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'buildx'
      - 'build'
      - '--platform'
      - 'linux/amd64,linux/arm64'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
      - '--push'
      - '.'

options:
  machineType: 'E2_HIGHCPU_8'
```

## Image Tagging Strategies

How you tag images affects how easily you can identify, roll back, and manage deployments.

### Git SHA Tags

The most reliable tagging strategy. Each image is uniquely identified:

```yaml
# Tag with the full git commit SHA for precise tracking
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$SHORT_SHA'
```

### Semantic Version Tags

For release builds triggered by git tags:

```yaml
# Tag with the semantic version from the git tag
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$TAG_NAME'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:latest'
```

### Branch-Based Tags

For development and feature branch builds:

```yaml
# Tag with the branch name for easy identification
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$BRANCH_NAME-$SHORT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:$BRANCH_NAME-latest'
```

## Setting Up Cleanup Policies

Without cleanup, your Artifact Registry repository will grow indefinitely. Set up cleanup policies to automatically remove old images:

```bash
# Create a cleanup policy that keeps the last 10 versions and deletes images older than 90 days
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy=cleanup-policy.json
```

The cleanup policy JSON:

```json
// Cleanup policy to keep repositories manageable
[
  {
    "name": "delete-old-images",
    "action": {"type": "Delete"},
    "condition": {
      "olderThan": "7776000s",
      "tagState": "ANY"
    }
  },
  {
    "name": "keep-recent-tagged",
    "action": {"type": "Keep"},
    "condition": {
      "tagPrefixes": ["v", "release"],
      "newerThan": "15552000s"
    }
  }
]
```

## Vulnerability Scanning

Artifact Registry integrates with Container Analysis for vulnerability scanning. Enable it on your repository:

```bash
# Enable vulnerability scanning on the repository
gcloud artifacts repositories update my-docker-repo \
  --location=us-central1 \
  --enable-vulnerability-scanning
```

After enabling, every pushed image is automatically scanned. You can check scan results:

```bash
# List vulnerabilities for a specific image
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:latest \
  --show-package-vulnerability
```

## Pulling Images from Artifact Registry

For deployments, configure authentication for pulling images:

```bash
# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Pull an image
docker pull us-central1-docker.pkg.dev/$PROJECT_ID/my-docker-repo/my-app:latest
```

For GKE, the default service account usually has pull access. For Cloud Run, just specify the full image path in the deployment command.

## Troubleshooting

**Permission denied when pushing** - Verify the Cloud Build service account has the `artifactregistry.writer` role. Check the specific repository, not just the project level.

**Repository not found** - Double-check the location. A repository created in `us-central1` is not accessible via `us-east1-docker.pkg.dev`.

**Image push is slow** - Make sure the Cloud Build region matches the Artifact Registry location. Cross-region pushes add latency.

**Quota exceeded** - Artifact Registry has storage quotas. Check your usage with `gcloud artifacts repositories describe` and request a quota increase if needed.

## Wrapping Up

Artifact Registry and Cloud Build are a natural pair for container image CI/CD on Google Cloud. The setup is straightforward - create a repository, point your cloudbuild.yaml at it, and let Cloud Build handle the builds and pushes. Add cleanup policies to manage storage, enable vulnerability scanning for security, and use meaningful tagging strategies for easy image identification. If you are still using Container Registry, now is a good time to make the switch.
