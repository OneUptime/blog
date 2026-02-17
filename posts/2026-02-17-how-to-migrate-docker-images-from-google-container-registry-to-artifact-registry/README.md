# How to Migrate Docker Images from Google Container Registry to Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Container Registry, Docker, Migration

Description: A practical guide to migrating your Docker images from Google Container Registry to Artifact Registry before the deprecation deadline, with step-by-step instructions.

---

Google Container Registry (gcr.io) is being deprecated in favor of Artifact Registry. If you have been using GCR, you need to migrate your images to Artifact Registry. The good news is that Artifact Registry is a superset of GCR - it does everything GCR does and more. The migration itself is straightforward, but there are details you need to get right to avoid breaking your CI/CD pipelines and running deployments.

This guide covers the full migration process, from creating Artifact Registry repositories to copying images and updating references.

## Why Artifact Registry?

Artifact Registry supports Docker images just like GCR, but it also supports other artifact formats like Maven, npm, Python, and Go packages. Beyond format support, Artifact Registry gives you:

- Repository-level IAM instead of bucket-level permissions
- Regional and multi-regional repository options
- Vulnerability scanning with on-demand and automatic modes
- Cleanup policies for automatic image lifecycle management
- Virtual repositories that aggregate multiple upstream repositories

## Step 1: Create an Artifact Registry Repository

Unlike GCR, which automatically creates storage when you push, Artifact Registry requires you to explicitly create repositories.

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images migrated from GCR" \
  --project=my-project-id
```

For a multi-region setup that mirrors GCR's behavior, use a multi-region location.

```bash
# Create a multi-region Docker repository (similar to gcr.io behavior)
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us \
  --description="Docker images - US multi-region" \
  --project=my-project-id
```

The image path format changes from `gcr.io/PROJECT_ID/IMAGE` to `LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE`.

## Step 2: Set Up Authentication

Configure Docker to authenticate with Artifact Registry.

```bash
# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# For multiple regions, specify them comma-separated
gcloud auth configure-docker us-central1-docker.pkg.dev,us-docker.pkg.dev,europe-docker.pkg.dev
```

This updates your Docker config file to use gcloud as a credential helper for those registries.

## Step 3: List Your Existing GCR Images

Before migrating, inventory what you have in GCR.

```bash
# List all images in gcr.io
gcloud container images list --repository=gcr.io/my-project-id

# List all tags for a specific image
gcloud container images list-tags gcr.io/my-project-id/my-app

# Get a full inventory with digests
gcloud container images list-tags gcr.io/my-project-id/my-app \
  --format="table(digest,tags,timestamp)"
```

## Step 4: Copy Images Using gcrane

The recommended tool for bulk image copying is `gcrane`, which is part of the go-containerregistry project. It handles multi-architecture images and all tags correctly.

```bash
# Install gcrane
go install github.com/google/go-containerregistry/cmd/gcrane@latest

# Copy a single image with all its tags
gcrane cp gcr.io/my-project-id/my-app \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo/my-app
```

For bulk copying all images from GCR to Artifact Registry, use gcrane's copy-repo command.

```bash
# Copy all images from gcr.io to Artifact Registry
gcrane cp -r gcr.io/my-project-id \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo
```

The `-r` flag copies recursively. This handles nested image paths like `gcr.io/my-project-id/team/app`.

## Step 5: Copy Images Using Docker (Alternative)

If you prefer not to install gcrane, you can use plain Docker commands. This is slower but works for smaller registries.

```bash
# Pull, retag, and push a specific image tag
docker pull gcr.io/my-project-id/my-app:v1.2.3

docker tag gcr.io/my-project-id/my-app:v1.2.3 \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo/my-app:v1.2.3

docker push us-central1-docker.pkg.dev/my-project-id/my-docker-repo/my-app:v1.2.3
```

For automating this across multiple images, write a script.

```bash
#!/bin/bash
# migrate-images.sh
# Copies all tagged versions of specified images from GCR to Artifact Registry

SOURCE_REGISTRY="gcr.io/my-project-id"
TARGET_REGISTRY="us-central1-docker.pkg.dev/my-project-id/my-docker-repo"

# List of images to migrate
IMAGES=("my-app" "my-api" "my-worker" "my-frontend")

for IMAGE in "${IMAGES[@]}"; do
  echo "Migrating $IMAGE..."

  # Get all tags for the image
  TAGS=$(gcloud container images list-tags "$SOURCE_REGISTRY/$IMAGE" \
    --format="value(tags)" --filter="tags:*")

  for TAG in $TAGS; do
    # Handle comma-separated tags
    IFS=',' read -ra TAG_ARRAY <<< "$TAG"
    for SINGLE_TAG in "${TAG_ARRAY[@]}"; do
      echo "  Copying $IMAGE:$SINGLE_TAG"
      docker pull "$SOURCE_REGISTRY/$IMAGE:$SINGLE_TAG"
      docker tag "$SOURCE_REGISTRY/$IMAGE:$SINGLE_TAG" "$TARGET_REGISTRY/$IMAGE:$SINGLE_TAG"
      docker push "$TARGET_REGISTRY/$IMAGE:$SINGLE_TAG"
    done
  done
done
```

## Step 6: Verify the Migration

After copying, verify that your images are in Artifact Registry.

```bash
# List images in the new repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo

# List tags for a specific image
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo/my-app

# Compare image counts between GCR and Artifact Registry
echo "GCR images:"
gcloud container images list-tags gcr.io/my-project-id/my-app --format="value(digest)" | wc -l

echo "Artifact Registry images:"
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project-id/my-docker-repo/my-app \
  --include-tags --format="value(version)" | wc -l
```

## Step 7: Set Up IAM Permissions

Artifact Registry uses its own IAM roles, which are more granular than GCR's storage-based permissions.

```bash
# Grant read access (for pulling images in CI/CD or GKE)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-gke-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project-id

# Grant write access (for pushing images from CI/CD)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-cicd-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project-id
```

## Step 8: Configure Cleanup Policies

One advantage of Artifact Registry is built-in cleanup policies. Set one up to avoid accumulating old images.

```bash
# Create a cleanup policy that deletes untagged images older than 30 days
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --project=my-project-id \
  --policy=policy.json
```

The policy file looks like this.

```json
[
  {
    "name": "delete-old-untagged",
    "action": {"type": "Delete"},
    "condition": {
      "tagState": "untagged",
      "olderThan": "2592000s"
    }
  },
  {
    "name": "keep-recent-tagged",
    "action": {"type": "Keep"},
    "condition": {
      "tagState": "tagged",
      "tagPrefixes": ["v", "release"]
    }
  }
]
```

## Migration Checklist

Before decommissioning your GCR setup, make sure you have covered all these items:

- All images copied and verified in Artifact Registry
- CI/CD pipelines updated to push to Artifact Registry
- Kubernetes deployments updated with new image paths
- Helm charts and Kustomize overlays updated
- IAM permissions configured for all service accounts
- Cleanup policies set up
- Monitoring and alerting updated for new repository
- Documentation updated with new image paths

## Summary

Migrating from GCR to Artifact Registry is mostly about copying images and updating references. The gcrane tool makes the image copy fast and reliable. Once migrated, you get better IAM controls, cleanup policies, and a future-proof registry that supports multiple artifact formats. Start the migration early so you have time to update all your pipelines and deployments before the GCR deprecation deadline.
