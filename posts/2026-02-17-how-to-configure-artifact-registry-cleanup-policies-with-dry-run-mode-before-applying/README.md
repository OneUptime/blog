# How to Configure Artifact Registry Cleanup Policies with Dry Run Mode Before Applying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Cleanup Policies, Dry Run, Cost Optimization, DevOps

Description: Learn how to use dry run mode for Artifact Registry cleanup policies to safely preview what would be deleted before applying the policies for real.

---

Deleting the wrong container images can ruin your day. Maybe your cleanup policy accidentally matches production images, or the age threshold was too aggressive and wiped out images your team still needs. Dry run mode lets you preview exactly what a cleanup policy would delete without actually deleting anything.

I always recommend starting with dry run before applying any cleanup policy. It has saved me from a few near-disasters. Here is how to use it.

## What Dry Run Mode Does

When dry run is enabled on a repository, cleanup policies are evaluated normally - they determine which images match the deletion criteria - but no images are actually deleted. Instead, the evaluation results are logged so you can review what would have been deleted.

This gives you confidence that your policy is doing what you expect before you turn it loose on real data.

## Enabling Dry Run Mode

### On a New Repository

When creating a repository, enable dry run by default:

```bash
# Create a repository with cleanup policy dry run enabled
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images with dry-run cleanup" \
  --cleanup-policy-dry-run \
  --project=my-project
```

### On an Existing Repository

Enable dry run on an existing repository:

```bash
# Enable dry run mode on an existing repository
gcloud artifacts repositories update my-docker-repo \
  --location=us-central1 \
  --cleanup-policy-dry-run \
  --project=my-project
```

## Creating Cleanup Policies with Dry Run

Here is the typical workflow. First, define your cleanup policy:

```json
[
  {
    "id": "keep-production",
    "action": {
      "type": "Keep"
    },
    "condition": {
      "tagPrefixes": ["v", "release-", "prod-"]
    }
  },
  {
    "id": "keep-recent",
    "action": {
      "type": "Keep"
    },
    "mostRecentVersions": {
      "keepCount": 10
    }
  },
  {
    "id": "delete-untagged",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagState": "UNTAGGED",
      "olderThan": "259200s"
    }
  },
  {
    "id": "delete-dev-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagPrefixes": ["dev-", "feature-", "pr-"],
      "olderThan": "604800s"
    }
  },
  {
    "id": "delete-old",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "2592000s"
    }
  }
]
```

Apply it with dry run enabled:

```bash
# Make sure dry run is enabled
gcloud artifacts repositories update my-docker-repo \
  --location=us-central1 \
  --cleanup-policy-dry-run \
  --project=my-project

# Apply the cleanup policy
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy=cleanup-policy.json \
  --project=my-project
```

## Reviewing Dry Run Results

After the cleanup policy runs in dry run mode, check the audit logs to see what would have been deleted:

```bash
# View dry run results in Cloud Audit Logs
gcloud logging read \
  'resource.type="audited_resource" AND
   protoPayload.serviceName="artifactregistry.googleapis.com" AND
   protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.BatchDeleteVersions" AND
   protoPayload.metadata.dryRun=true' \
  --project=my-project \
  --limit=50 \
  --format='table(timestamp, protoPayload.request.names)'
```

You can also check the results in the Cloud Console:

1. Go to Artifact Registry in the Cloud Console
2. Click on your repository
3. Look at the cleanup policy section for dry run results

## Comparing Before and After

A useful approach is to take a snapshot of your repository contents before and after a dry run evaluation:

```bash
# List all images with their tags and ages
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/my-docker-repo \
  --include-tags \
  --sort-by=~createTime \
  --format='table(package, tags, createTime)' \
  --project=my-project > before-cleanup.txt
```

After reviewing the dry run logs, you can cross-reference to see which specific images would be removed.

## Iterating on the Policy

Dry run lets you iterate on your policy until it is right:

### Too Aggressive? Adjust the Thresholds

If the dry run shows that too many images would be deleted, loosen the criteria:

```json
[
  {
    "id": "delete-old",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "7776000s"
    }
  }
]
```

Changed from 30 days to 90 days.

### Not Catching Enough? Add More Rules

If the dry run shows images that should be deleted but are not matched:

```json
[
  {
    "id": "delete-old",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "2592000s"
    }
  },
  {
    "id": "delete-sha-tags",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagPrefixes": ["sha-"],
      "olderThan": "604800s"
    }
  }
]
```

### Missing Keeps? Add Protection Rules

If the dry run shows production images would be deleted, add keep rules:

```json
[
  {
    "id": "keep-production",
    "action": {
      "type": "Keep"
    },
    "condition": {
      "tagPrefixes": ["v", "release-"]
    }
  },
  {
    "id": "keep-deployed",
    "action": {
      "type": "Keep"
    },
    "condition": {
      "tagPrefixes": ["deployed-"]
    }
  },
  {
    "id": "delete-old",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "olderThan": "2592000s"
    }
  }
]
```

## Disabling Dry Run (Going Live)

Once you are confident the policy does what you want, disable dry run to start actual deletion:

```bash
# Disable dry run mode - deletions will now be real
gcloud artifacts repositories update my-docker-repo \
  --location=us-central1 \
  --no-cleanup-policy-dry-run \
  --project=my-project
```

After disabling dry run, the next cleanup cycle will actually delete the matching images.

## Terraform Configuration

Manage dry run mode with Terraform:

```hcl
# main.tf - Repository with cleanup policies in dry run mode

resource "google_artifact_registry_repository" "docker_repo" {
  location      = "us-central1"
  repository_id = "my-docker-repo"
  format        = "DOCKER"

  # Start with dry run enabled
  cleanup_policy_dry_run = true

  cleanup_policies {
    id     = "keep-production"
    action = "KEEP"
    condition {
      tag_prefixes = ["v", "release-"]
    }
  }

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old-dev"
    action = "DELETE"
    condition {
      tag_prefixes = ["dev-", "feature-"]
      older_than   = "604800s"
    }
  }

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "259200s"
    }
  }
}
```

When you are ready to go live, change `cleanup_policy_dry_run` to `false` and apply:

```hcl
  # Switch to live mode after verifying dry run results
  cleanup_policy_dry_run = false
```

## Monitoring Cleanup Operations

After going live, monitor the actual deletions:

```bash
# Watch for actual deletions in audit logs
gcloud logging read \
  'resource.type="audited_resource" AND
   protoPayload.serviceName="artifactregistry.googleapis.com" AND
   protoPayload.methodName="google.devtools.artifactregistry.v1.ArtifactRegistry.BatchDeleteVersions" AND
   NOT protoPayload.metadata.dryRun=true' \
  --project=my-project \
  --limit=20
```

Set up a Cloud Monitoring alert if deletions exceed an expected threshold:

```bash
# Create an alert for unexpected high deletion counts
# This helps catch if a policy change accidentally deletes too many images
gcloud alpha monitoring policies create \
  --display-name="High Image Deletion Rate" \
  --condition-display-name="Many images deleted by cleanup" \
  --notification-channels=CHANNEL_ID
```

## Recommended Workflow

Here is the workflow I follow every time I set up or modify cleanup policies:

1. **Enable dry run** on the repository
2. **Apply the cleanup policy**
3. **Wait for the next evaluation cycle** (typically runs daily)
4. **Review the audit logs** to see what would be deleted
5. **Adjust the policy** if needed and repeat steps 3-4
6. **Verify no important images are affected**
7. **Disable dry run** to go live
8. **Monitor the first few real cleanup cycles** closely

This process typically takes a few days but prevents accidental data loss.

## Wrapping Up

Dry run mode for cleanup policies is a safety net that costs nothing but can prevent serious problems. Always start with dry run enabled, review the results carefully, iterate on your policy until it matches your expectations, and only then switch to live mode. The extra time spent validating is far less than the time you would spend recovering from accidentally deleted production images.
