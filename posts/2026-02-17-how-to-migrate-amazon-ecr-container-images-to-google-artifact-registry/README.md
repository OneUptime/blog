# How to Migrate Amazon ECR Container Images to Google Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Amazon ECR, Container Registry, Migration

Description: Migrate your container images from Amazon ECR to Google Artifact Registry using automated tools for bulk image transfer and tag preservation.

---

Container images are a critical part of your deployment infrastructure. When moving from AWS to GCP, you need to get every image and tag from ECR to Artifact Registry without breaking your deployment pipelines. Missing a single image tag can cause a failed rollback when you need it most.

In this post, I will walk through how to set up Artifact Registry, efficiently migrate images using crane (a tool that copies images without pulling them locally), and verify that everything transferred correctly.

## Setting Up Artifact Registry

First, create the Artifact Registry repositories. I recommend mirroring your ECR repository structure:

```hcl
# artifact-registry.tf
# Create Artifact Registry repositories matching ECR structure

resource "google_artifact_registry_repository" "app_images" {
  location      = var.region
  repository_id = "app-images"
  description   = "Application container images migrated from ECR"
  format        = "DOCKER"
  project       = var.project_id

  # Clean up old untagged images automatically
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"  # 7 days
    }
  }

  # Keep at least 10 tagged versions of each image
  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }
}

# Repository for base images
resource "google_artifact_registry_repository" "base_images" {
  location      = var.region
  repository_id = "base-images"
  description   = "Base images migrated from ECR"
  format        = "DOCKER"
  project       = var.project_id
}
```

## Installing crane

crane is a tool from the go-containerregistry project that can copy images between registries without pulling them to the local Docker daemon. This is much faster than docker pull/push for bulk migrations:

```bash
# Install crane
go install github.com/google/go-containerregistry/cmd/crane@latest

# Or download the binary directly
curl -sL "https://github.com/google/go-containerregistry/releases/latest/download/go-containerregistry_Linux_x86_64.tar.gz" | tar xz crane

# Verify installation
crane version
```

## Authenticating to Both Registries

Set up authentication for ECR and Artifact Registry:

```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  crane auth login 123456789.dkr.ecr.us-east-1.amazonaws.com \
    --username AWS --password-stdin

# Authenticate to Artifact Registry
gcloud auth configure-docker us-docker.pkg.dev
```

## Listing All ECR Images

Before migrating, get a full inventory of what needs to move:

```python
# inventory_ecr.py
# Create an inventory of all ECR images and tags
import boto3
import json

def list_all_ecr_images(region='us-east-1'):
    """List all images and tags across all ECR repositories."""
    ecr = boto3.client('ecr', region_name=region)
    inventory = []

    # List all repositories
    repos = []
    paginator = ecr.get_paginator('describe_repositories')
    for page in paginator.paginate():
        repos.extend(page['repositories'])

    for repo in repos:
        repo_name = repo['repositoryName']
        repo_uri = repo['repositoryUri']

        # List all images in the repository
        image_paginator = ecr.get_paginator('describe_images')
        for page in image_paginator.paginate(repositoryName=repo_name):
            for image in page['imageDetails']:
                tags = image.get('imageTags', [])
                digest = image['imageDigest']
                size_mb = image.get('imageSizeInBytes', 0) / (1024 * 1024)
                pushed_at = str(image.get('imagePushedAt', ''))

                inventory.append({
                    'repository': repo_name,
                    'uri': repo_uri,
                    'digest': digest,
                    'tags': tags,
                    'size_mb': round(size_mb, 2),
                    'pushed_at': pushed_at,
                })

    # Save inventory
    with open('ecr_inventory.json', 'w') as f:
        json.dump(inventory, f, indent=2, default=str)

    # Print summary
    total_images = len(inventory)
    total_tags = sum(len(img['tags']) for img in inventory)
    total_size_gb = sum(img['size_mb'] for img in inventory) / 1024

    print(f"Repositories: {len(repos)}")
    print(f"Images: {total_images}")
    print(f"Total tags: {total_tags}")
    print(f"Total size: {total_size_gb:.1f} GB")

    return inventory


if __name__ == '__main__':
    list_all_ecr_images()
```

## Bulk Migration Script

Here is the main migration script that copies all images using crane:

```python
# migrate_images.py
# Bulk migrate container images from ECR to Artifact Registry
import json
import subprocess
import sys
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
GCP_PROJECT = "my-gcp-project"
GCP_REGION = "us-docker.pkg.dev"
GCP_REPO = "app-images"
MAX_WORKERS = 5  # Parallel copies


def copy_image(source, destination):
    """Copy a single image using crane."""
    try:
        result = subprocess.run(
            ['crane', 'copy', source, destination],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout per image
        )

        if result.returncode == 0:
            logger.info(f"Copied: {source} -> {destination}")
            return True, source, None
        else:
            logger.error(f"Failed: {source} - {result.stderr}")
            return False, source, result.stderr

    except subprocess.TimeoutExpired:
        logger.error(f"Timeout: {source}")
        return False, source, "Timeout after 600s"
    except Exception as e:
        logger.error(f"Error: {source} - {str(e)}")
        return False, source, str(e)


def migrate_all_images(inventory_file='ecr_inventory.json'):
    """Migrate all images from the inventory file."""
    with open(inventory_file, 'r') as f:
        inventory = json.load(f)

    # Build the copy tasks
    tasks = []
    for image in inventory:
        repo_name = image['repository']
        ecr_uri = image['uri']

        for tag in image['tags']:
            source = f"{ecr_uri}:{tag}"
            destination = (
                f"{GCP_REGION}/{GCP_PROJECT}/{GCP_REPO}"
                f"/{repo_name}:{tag}"
            )
            tasks.append((source, destination))

        # Also copy by digest if no tags (untagged images)
        if not image['tags']:
            source = f"{ecr_uri}@{image['digest']}"
            destination = (
                f"{GCP_REGION}/{GCP_PROJECT}/{GCP_REPO}"
                f"/{repo_name}@{image['digest']}"
            )
            tasks.append((source, destination))

    logger.info(f"Starting migration of {len(tasks)} image copies")

    # Execute copies in parallel
    results = {'success': 0, 'failed': 0, 'failures': []}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(copy_image, src, dst): (src, dst)
            for src, dst in tasks
        }

        for future in as_completed(futures):
            success, source, error = future.result()
            if success:
                results['success'] += 1
            else:
                results['failed'] += 1
                results['failures'].append({
                    'source': source,
                    'error': error,
                })

    # Save results
    with open('migration_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Migration complete:")
    logger.info(f"  Success: {results['success']}")
    logger.info(f"  Failed: {results['failed']}")

    if results['failures']:
        logger.warning("Failed images:")
        for failure in results['failures']:
            logger.warning(f"  {failure['source']}: {failure['error']}")

    return results


if __name__ == '__main__':
    migrate_all_images()
```

## Verifying the Migration

After migration, verify that all images were transferred correctly:

```python
# verify_migration.py
# Verify all ECR images exist in Artifact Registry
import json
import subprocess
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GCP_PROJECT = "my-gcp-project"
GCP_REGION = "us-docker.pkg.dev"
GCP_REPO = "app-images"


def verify_image(ecr_image, ar_image):
    """Verify an image exists in Artifact Registry and matches."""
    try:
        # Get digests from both registries
        ecr_digest = subprocess.run(
            ['crane', 'digest', ecr_image],
            capture_output=True, text=True, timeout=30,
        )

        ar_digest = subprocess.run(
            ['crane', 'digest', ar_image],
            capture_output=True, text=True, timeout=30,
        )

        if ecr_digest.returncode != 0:
            return False, f"ECR lookup failed: {ecr_digest.stderr}"

        if ar_digest.returncode != 0:
            return False, f"AR lookup failed: {ar_digest.stderr}"

        # Compare digests
        ecr_hash = ecr_digest.stdout.strip()
        ar_hash = ar_digest.stdout.strip()

        if ecr_hash == ar_hash:
            return True, None
        else:
            return False, f"Digest mismatch: ECR={ecr_hash}, AR={ar_hash}"

    except Exception as e:
        return False, str(e)


def verify_all(inventory_file='ecr_inventory.json'):
    """Verify all images from the inventory."""
    with open(inventory_file, 'r') as f:
        inventory = json.load(f)

    verified = 0
    mismatched = 0
    missing = 0

    for image in inventory:
        repo_name = image['repository']
        ecr_uri = image['uri']

        for tag in image['tags']:
            ecr_ref = f"{ecr_uri}:{tag}"
            ar_ref = (
                f"{GCP_REGION}/{GCP_PROJECT}/{GCP_REPO}"
                f"/{repo_name}:{tag}"
            )

            match, error = verify_image(ecr_ref, ar_ref)
            if match:
                verified += 1
            elif "lookup failed" in str(error):
                missing += 1
                logger.warning(f"Missing: {ar_ref}")
            else:
                mismatched += 1
                logger.error(f"Mismatch: {ar_ref} - {error}")

    logger.info(f"Verification results:")
    logger.info(f"  Verified: {verified}")
    logger.info(f"  Missing: {missing}")
    logger.info(f"  Mismatched: {mismatched}")


if __name__ == '__main__':
    verify_all()
```

## Updating Deployment References

After migration, update your Kubernetes manifests to reference Artifact Registry:

```bash
# Find and replace ECR references in all YAML files
# This uses a simple sed command for the common case
find k8s/ -name "*.yaml" -exec sed -i '' \
  's|123456789.dkr.ecr.us-east-1.amazonaws.com/|us-docker.pkg.dev/my-gcp-project/app-images/|g' \
  {} +
```

Or use a more targeted approach with a script:

```python
# update_references.py
# Update image references from ECR to Artifact Registry in manifests
import os
import re

ECR_PATTERN = r'(\d+)\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com/([a-zA-Z0-9._/-]+)'
AR_PREFIX = "us-docker.pkg.dev/my-gcp-project/app-images"


def update_file(filepath):
    """Update ECR references in a single file."""
    with open(filepath, 'r') as f:
        content = f.read()

    original = content

    # Replace ECR URIs with Artifact Registry URIs
    content = re.sub(
        ECR_PATTERN,
        lambda m: f"{AR_PREFIX}/{m.group(2)}",
        content
    )

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated: {filepath}")
        return True

    return False


def update_all_manifests(directory):
    """Update all YAML files in a directory."""
    updated = 0
    for root, dirs, files in os.walk(directory):
        for filename in files:
            if filename.endswith(('.yaml', '.yml')):
                filepath = os.path.join(root, filename)
                if update_file(filepath):
                    updated += 1

    print(f"Updated {updated} files")


if __name__ == '__main__':
    update_all_manifests('./k8s')
    update_all_manifests('./helm')
```

## Setting Up Ongoing Image Sync

During the transition period, you might need to sync new images from ECR to Artifact Registry. Set up a Cloud Build trigger:

```yaml
# cloudbuild-sync.yaml
# Periodically sync new images from ECR to Artifact Registry
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Install crane
        curl -sL "https://github.com/google/go-containerregistry/releases/latest/download/go-containerregistry_Linux_x86_64.tar.gz" | tar xz

        # Authenticate to ECR
        aws ecr get-login-password --region us-east-1 | \
          ./crane auth login 123456789.dkr.ecr.us-east-1.amazonaws.com \
            --username AWS --password-stdin

        # Sync specific repositories
        for REPO in api-server web-frontend worker; do
          echo "Syncing $REPO..."
          ./crane copy \
            123456789.dkr.ecr.us-east-1.amazonaws.com/$REPO:latest \
            us-docker.pkg.dev/${PROJECT_ID}/app-images/$REPO:latest
        done
```

## Wrapping Up

Migrating container images from ECR to Artifact Registry is a bulk data operation that benefits from automation. Use crane for the actual image copying since it is significantly faster than docker pull/push. Build a complete inventory first, run the migration in parallel, and verify every image after the transfer. The verification step is non-negotiable - you do not want to discover a missing image during an emergency rollback at 3 AM. Keep the ECR repositories around for at least a month after migration as a safety net before cleaning them up.
