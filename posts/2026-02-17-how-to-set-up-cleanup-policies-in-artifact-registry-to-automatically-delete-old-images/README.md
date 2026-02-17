# How to Set Up Cleanup Policies in Artifact Registry to Automatically Delete Old Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Cleanup Policies, Docker, Cost Optimization, DevOps

Description: Configure automatic cleanup policies in Google Artifact Registry to delete old container images and keep storage costs under control.

---

If you push Docker images to Artifact Registry on every commit, your storage usage is going to grow fast. A typical CI/CD pipeline might produce dozens of images per day, and without cleanup, you end up paying for thousands of images you will never use again.

Artifact Registry cleanup policies let you automatically delete old images based on criteria like age, tag patterns, or version count. Let me show you how to set them up.

## Why You Need Cleanup Policies

Here is the math. If you push a 500 MB image on every commit, and your team makes 20 commits per day, that is 10 GB per day. In a month, you are storing 300 GB of images, most of which are stale builds nobody will ever pull again.

Cleanup policies solve this by automatically removing images that match your defined criteria.

## Creating a Basic Cleanup Policy

Cleanup policies are defined as JSON and applied to a repository. Here is a basic policy that deletes images older than 30 days:

```json
[
  {
    "id": "delete-old-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "2592000s"
    }
  }
]
```

The `olderThan` value is in seconds. 2592000 seconds equals 30 days.

Apply it to your repository:

```bash
# Save the policy to a file
cat > cleanup-policy.json << 'EOF'
[
  {
    "id": "delete-old-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "2592000s"
    }
  }
]
EOF

# Apply the cleanup policy to the repository
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy=cleanup-policy.json \
  --project=my-project
```

## Tag-Based Cleanup

You probably do not want to delete all old images. Production images tagged with version numbers should be kept, while development builds can be cleaned up aggressively.

```json
[
  {
    "id": "delete-untagged-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagState": "UNTAGGED",
      "olderThan": "604800s"
    }
  },
  {
    "id": "delete-dev-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagPrefixes": ["dev-", "feature-", "pr-"],
      "olderThan": "1209600s"
    }
  }
]
```

This policy does two things:

1. Deletes untagged images (orphaned layers) older than 7 days
2. Deletes images tagged with `dev-`, `feature-`, or `pr-` prefixes older than 14 days

## Keep Policies

Instead of just deleting, you can use "Keep" policies to protect certain images from deletion:

```json
[
  {
    "id": "keep-production-images",
    "action": {
      "type": "Keep"
    },
    "condition": {
      "tagPrefixes": ["v", "release-", "prod-"]
    }
  },
  {
    "id": "keep-recent-images",
    "action": {
      "type": "Keep"
    },
    "mostRecentVersions": {
      "keepCount": 10
    }
  },
  {
    "id": "delete-everything-else",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "604800s"
    }
  }
]
```

This policy:

1. Always keeps images tagged with `v`, `release-`, or `prod-` prefixes
2. Always keeps the 10 most recent versions of each image
3. Deletes everything else older than 7 days

The order matters - keep policies are evaluated first, and anything protected by a keep policy will not be deleted.

## Version Count-Based Cleanup

If you want to keep a fixed number of versions regardless of age:

```json
[
  {
    "id": "keep-latest-versions",
    "action": {
      "type": "Keep"
    },
    "mostRecentVersions": {
      "keepCount": 5,
      "packageNamePrefixes": ["my-app", "api-service"]
    }
  },
  {
    "id": "delete-old-versions",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "86400s"
    }
  }
]
```

This keeps the 5 most recent versions of images starting with `my-app` or `api-service`, and deletes anything older than 1 day that is not protected.

## Applying Cleanup Policies via gcloud

Here are the commands for managing cleanup policies:

```bash
# Apply a cleanup policy to a repository
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy=cleanup-policy.json \
  --project=my-project

# View current cleanup policies
gcloud artifacts repositories describe my-docker-repo \
  --location=us-central1 \
  --project=my-project

# Delete all cleanup policies from a repository
gcloud artifacts repositories delete-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy-names="delete-old-images,keep-production-images" \
  --project=my-project
```

## Using Terraform for Cleanup Policies

If you manage your infrastructure as code:

```hcl
# main.tf - Artifact Registry repository with cleanup policies
resource "google_artifact_registry_repository" "docker_repo" {
  location      = "us-central1"
  repository_id = "my-docker-repo"
  format        = "DOCKER"

  cleanup_policy_dry_run = false

  # Delete untagged images older than 7 days
  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"
    }
  }

  # Delete dev images older than 14 days
  cleanup_policies {
    id     = "delete-dev-images"
    action = "DELETE"

    condition {
      tag_prefixes = ["dev-", "feature-"]
      older_than   = "1209600s"
    }
  }

  # Keep production images
  cleanup_policies {
    id     = "keep-prod-images"
    action = "KEEP"

    condition {
      tag_prefixes = ["v", "release-"]
    }
  }

  # Keep the latest 10 versions
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }
}
```

## Monitoring Cleanup Activity

After setting up cleanup policies, monitor what gets deleted:

```bash
# Check Cloud Audit Logs for cleanup activity
gcloud logging read \
  'resource.type="audited_resource" AND protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.DeleteVersion"' \
  --project=my-project \
  --limit=20
```

You can also set up alerts in Cloud Monitoring to track storage usage over time and verify that cleanup is working as expected.

## Practical Cleanup Strategy

Based on what has worked well for me, here is a cleanup strategy that balances cost savings with safety:

1. **Keep all production-tagged images forever** (tagged with version numbers like `v1.0.0`)
2. **Keep the 10 most recent versions** of each image regardless of tags
3. **Delete untagged images** after 3 days (these are usually orphaned layers)
4. **Delete feature branch images** after 7 days
5. **Delete everything else** after 30 days

```json
[
  {
    "id": "keep-releases",
    "action": { "type": "Keep" },
    "condition": { "tagPrefixes": ["v"] }
  },
  {
    "id": "keep-recent",
    "action": { "type": "Keep" },
    "mostRecentVersions": { "keepCount": 10 }
  },
  {
    "id": "delete-untagged",
    "action": { "type": "Delete" },
    "condition": { "tagState": "UNTAGGED", "olderThan": "259200s" }
  },
  {
    "id": "delete-feature-branches",
    "action": { "type": "Delete" },
    "condition": { "tagPrefixes": ["feature-", "pr-"], "olderThan": "604800s" }
  },
  {
    "id": "delete-old",
    "action": { "type": "Delete" },
    "condition": { "olderThan": "2592000s" }
  }
]
```

## Wrapping Up

Cleanup policies are essential for keeping your Artifact Registry storage costs under control. Start with a dry run to understand what would be deleted, then apply the policies for real. The key is combining keep policies (to protect important images) with delete policies (to remove stale builds). A well-configured cleanup policy saves money without any risk to your production deployments.
