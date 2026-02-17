# How to Copy Docker Images Between Artifact Registry Repositories Across Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Docker, Image Migration, Cross-Project, DevOps

Description: Learn different methods to copy Docker images between Artifact Registry repositories across GCP projects, including using crane, docker, and gcrane tools.

---

In many organizations, different GCP projects serve different purposes - one for development, one for staging, one for production. You build images in the dev project and need to promote them to the production project's registry. Copying images between Artifact Registry repositories across projects is a common requirement, and there are several ways to do it.

Let me walk through the different approaches and when to use each one.

## Method 1: Using crane (Recommended)

crane is a fast, efficient tool for working with container registries. It copies images directly between registries without pulling them to your local machine, which makes it much faster than the docker pull/tag/push approach.

### Installing crane

```bash
# Install crane using Go
go install github.com/google/go-containerregistry/cmd/crane@latest

# Or download a pre-built binary (Linux)
curl -sL "https://github.com/google/go-containerregistry/releases/download/v0.19.0/go-containerregistry_Linux_x86_64.tar.gz" | tar xz crane
sudo mv crane /usr/local/bin/

# Or on macOS with Homebrew
brew install crane
```

### Authenticating crane

```bash
# Authenticate crane with gcloud credentials
gcloud auth configure-docker \
  us-central1-docker.pkg.dev,us-east1-docker.pkg.dev
```

crane uses the Docker config file for authentication, so configuring docker is sufficient.

### Copying a Single Image

```bash
# Copy an image from project-dev to project-prod
crane copy \
  us-central1-docker.pkg.dev/project-dev/dev-repo/my-app:v1.0.0 \
  us-central1-docker.pkg.dev/project-prod/prod-repo/my-app:v1.0.0
```

This copies the image directly between the registries without downloading it locally. It is fast even for large images.

### Copying All Tags

```bash
# Copy an image with all its tags
crane copy \
  us-central1-docker.pkg.dev/project-dev/dev-repo/my-app \
  us-central1-docker.pkg.dev/project-prod/prod-repo/my-app
```

### Copying Multiple Images

```bash
# Script to copy multiple images between projects
#!/bin/bash
# copy-images.sh - Copy a list of images between projects

SOURCE_REGISTRY="us-central1-docker.pkg.dev/project-dev/dev-repo"
DEST_REGISTRY="us-central1-docker.pkg.dev/project-prod/prod-repo"

# List of images to copy
IMAGES=(
  "api:v1.0.0"
  "web:v1.0.0"
  "worker:v1.0.0"
  "scheduler:v1.0.0"
)

for IMAGE in "${IMAGES[@]}"; do
  echo "Copying ${IMAGE}..."
  crane copy "${SOURCE_REGISTRY}/${IMAGE}" "${DEST_REGISTRY}/${IMAGE}"
done

echo "Done copying all images."
```

## Method 2: Using docker pull/tag/push

The traditional approach. Slower because it downloads the image locally, but works without any additional tools:

```bash
# Pull from the source repository
docker pull us-central1-docker.pkg.dev/project-dev/dev-repo/my-app:v1.0.0

# Re-tag for the destination repository
docker tag \
  us-central1-docker.pkg.dev/project-dev/dev-repo/my-app:v1.0.0 \
  us-central1-docker.pkg.dev/project-prod/prod-repo/my-app:v1.0.0

# Push to the destination repository
docker push us-central1-docker.pkg.dev/project-prod/prod-repo/my-app:v1.0.0
```

This method requires enough local disk space for the image and is slower because the image data travels client-to-registry twice.

## Method 3: Using gcrane for Bulk Copies

gcrane is a specialized variant of crane that can copy entire repositories:

```bash
# Install gcrane
go install github.com/google/go-containerregistry/cmd/gcrane@latest

# Copy an entire repository (all images and tags)
gcrane copy \
  us-central1-docker.pkg.dev/project-dev/dev-repo \
  us-central1-docker.pkg.dev/project-prod/prod-repo
```

This copies every image and every tag from the source repository to the destination. Use this for initial migration scenarios.

## Method 4: Using Cloud Build

Automate image copying as part of your CI/CD pipeline:

```yaml
# cloudbuild.yaml - Copy images between projects
steps:
  # Install crane
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Download and install crane
        curl -sL "https://github.com/google/go-containerregistry/releases/download/v0.19.0/go-containerregistry_Linux_x86_64.tar.gz" | tar xz crane
        chmod +x crane

        # Copy the image from dev to prod
        ./crane copy \
          us-central1-docker.pkg.dev/$PROJECT_ID/dev-repo/my-app:$_IMAGE_TAG \
          us-central1-docker.pkg.dev/${_DEST_PROJECT}/prod-repo/my-app:$_IMAGE_TAG

substitutions:
  _IMAGE_TAG: 'v1.0.0'
  _DEST_PROJECT: 'project-prod'
```

## Setting Up Cross-Project IAM Permissions

For any of these methods to work, the identity performing the copy needs read access to the source and write access to the destination.

### For Human Users

```bash
# Grant read access on the source repository
gcloud artifacts repositories add-iam-policy-binding dev-repo \
  --location=us-central1 \
  --member="user:deployer@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=project-dev

# Grant write access on the destination repository
gcloud artifacts repositories add-iam-policy-binding prod-repo \
  --location=us-central1 \
  --member="user:deployer@example.com" \
  --role="roles/artifactregistry.writer" \
  --project=project-prod
```

### For Service Accounts

```bash
# Create a service account for image promotion
gcloud iam service-accounts create image-promoter \
  --display-name="Image Promoter" \
  --project=project-prod

# Grant read on source
gcloud artifacts repositories add-iam-policy-binding dev-repo \
  --location=us-central1 \
  --member="serviceAccount:image-promoter@project-prod.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=project-dev

# Grant write on destination
gcloud artifacts repositories add-iam-policy-binding prod-repo \
  --location=us-central1 \
  --member="serviceAccount:image-promoter@project-prod.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=project-prod
```

### For Cloud Build Cross-Project

If Cloud Build in project-dev needs to push to project-prod:

```bash
# Get the Cloud Build service account from the source project
PROJECT_DEV_NUMBER=$(gcloud projects describe project-dev --format='value(projectNumber)')
CLOUD_BUILD_SA="${PROJECT_DEV_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant it write access to the production repository
gcloud artifacts repositories add-iam-policy-binding prod-repo \
  --location=us-central1 \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --project=project-prod
```

## Copying Between Regions

Images can also be copied between regions, not just projects:

```bash
# Copy from us-central1 to europe-west1 (same project)
crane copy \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  europe-west1-docker.pkg.dev/my-project/eu-repo/my-app:v1.0.0

# Copy across both regions and projects
crane copy \
  us-central1-docker.pkg.dev/project-dev/dev-repo/my-app:v1.0.0 \
  europe-west1-docker.pkg.dev/project-prod/eu-prod-repo/my-app:v1.0.0
```

## Automating Image Promotion

A common workflow is automatic promotion: when an image passes all tests in staging, it gets copied to the production registry.

```yaml
# promote-to-prod.yaml - Cloud Build config for image promotion
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Install crane
        apt-get update && apt-get install -y curl
        curl -sL "https://github.com/google/go-containerregistry/releases/download/v0.19.0/go-containerregistry_Linux_x86_64.tar.gz" | tar xz crane

        # Copy the image
        ./crane copy \
          us-central1-docker.pkg.dev/${_SOURCE_PROJECT}/${_SOURCE_REPO}/${_IMAGE}:${_TAG} \
          us-central1-docker.pkg.dev/${_DEST_PROJECT}/${_DEST_REPO}/${_IMAGE}:${_TAG}

        echo "Promoted ${_IMAGE}:${_TAG} to production"

substitutions:
  _SOURCE_PROJECT: 'project-staging'
  _SOURCE_REPO: 'staging-repo'
  _DEST_PROJECT: 'project-prod'
  _DEST_REPO: 'prod-repo'
  _IMAGE: 'my-app'
  _TAG: 'v1.0.0'
```

Trigger this build manually or automatically after staging tests pass.

## Verifying the Copy

After copying, verify the image exists in the destination:

```bash
# List tags in the destination
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/project-prod/prod-repo/my-app \
  --project=project-prod

# Verify the digest matches
crane digest us-central1-docker.pkg.dev/project-dev/dev-repo/my-app:v1.0.0
crane digest us-central1-docker.pkg.dev/project-prod/prod-repo/my-app:v1.0.0
# Both should output the same sha256 digest
```

## Wrapping Up

Copying images between Artifact Registry repositories across projects is a fundamental part of a multi-environment deployment strategy. Use crane for the best performance since it copies images directly between registries without downloading locally. Set up proper IAM permissions so your service accounts can read from the source and write to the destination. Automate the process with Cloud Build for reliable, repeatable promotions.
