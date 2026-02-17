# How to Redirect gcr.io Requests to Artifact Registry Using Transition Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Container Registry, Docker, Migration

Description: Learn how to use Artifact Registry transition repositories to automatically redirect gcr.io image requests, enabling a smooth migration from Container Registry.

---

Migrating from Google Container Registry to Artifact Registry does not have to be a big-bang cutover. Google provides a transition mechanism that lets you redirect gcr.io traffic to Artifact Registry repositories. This means your existing deployments, scripts, and pipelines that reference gcr.io paths continue to work while you gradually update everything to use the new Artifact Registry paths.

This guide shows you how to set up transition repositories and use them to make the migration as smooth as possible.

## What Are Transition Repositories?

When you enable the gcr.io redirection, Artifact Registry creates special repositories that intercept requests to gcr.io hostnames and serve them from Artifact Registry instead. The mapping is:

- `gcr.io/PROJECT` maps to a repository named `gcr.io` in the `us` multi-region
- `us.gcr.io/PROJECT` maps to a repository named `us.gcr.io` in the `us` multi-region
- `eu.gcr.io/PROJECT` maps to a repository named `eu.gcr.io` in the `europe` multi-region
- `asia.gcr.io/PROJECT` maps to a repository named `asia.gcr.io` in the `asia` multi-region

After redirection is enabled, `docker pull gcr.io/my-project/my-image` is actually served by Artifact Registry, not the old Container Registry.

## Prerequisites

Before starting:

- Your project must have the Artifact Registry API enabled
- You need `roles/artifactregistry.admin` on the project
- Make sure you have read the images from your existing GCR setup

```bash
# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=my-project-id
```

## Step 1: Check Current GCR Usage

Before enabling redirection, understand what GCR hostnames your project uses.

```bash
# Check which GCR hostnames have images
for HOST in gcr.io us.gcr.io eu.gcr.io asia.gcr.io; do
  echo "=== $HOST ==="
  gcloud container images list --repository="$HOST/my-project-id" 2>/dev/null | head -5
done
```

Also check your running workloads for GCR references.

```bash
# Find all GKE deployments referencing gcr.io
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | grep gcr.io | sort -u
```

## Step 2: Copy Existing Images

Before enabling redirection, copy your existing GCR images to the transition repositories. This ensures that images are available when the redirection activates.

Google provides an automatic copy mechanism, but you can also do it manually for more control.

```bash
# Use the gcloud artifacts docker upgrade command to copy images
# This copies all images from gcr.io to the corresponding Artifact Registry repo
gcloud artifacts docker upgrade migrate \
  --projects=my-project-id \
  --from-prefix=gcr.io
```

For a dry run to see what would be copied without actually copying.

```bash
# Dry run to see what images will be migrated
gcloud artifacts docker upgrade migrate \
  --projects=my-project-id \
  --from-prefix=gcr.io \
  --dry-run
```

If you prefer to use gcrane for the copy.

```bash
# Copy all images from gcr.io to the transition repository
gcrane cp -r gcr.io/my-project-id us-docker.pkg.dev/my-project-id/gcr.io
```

## Step 3: Enable gcr.io Redirection

Now enable the redirection. This is the key step that makes gcr.io requests go to Artifact Registry.

```bash
# Enable gcr.io redirection for your project
gcloud artifacts settings enable-upgrade-redirection \
  --project=my-project-id
```

After this command, all requests to `gcr.io/my-project-id/*` will be served by the `gcr.io` repository in Artifact Registry.

You can check the redirection status at any time.

```bash
# Check the current redirection status
gcloud artifacts settings describe --project=my-project-id
```

## Step 4: Verify Redirection Is Working

Test that the redirection works correctly.

```bash
# Pull an image using the old gcr.io path
docker pull gcr.io/my-project-id/my-app:latest

# The pull should succeed and come from Artifact Registry
# You can verify by checking the Artifact Registry console
```

You can also push to the gcr.io path and it will land in Artifact Registry.

```bash
# Tag and push using the old gcr.io path
docker tag my-local-image:latest gcr.io/my-project-id/my-app:v2.0
docker push gcr.io/my-project-id/my-app:v2.0

# Verify the image exists in Artifact Registry
gcloud artifacts docker images list us-docker.pkg.dev/my-project-id/gcr.io/my-app
```

## Step 5: Update IAM for the Transition Repository

The transition repository uses Artifact Registry IAM, not the old GCS bucket permissions that GCR used. Make sure your service accounts have the right roles.

```bash
# Grant pull access to your GKE nodes
gcloud artifacts repositories add-iam-policy-binding gcr.io \
  --location=us \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project-id

# Grant push access to your CI/CD service account
gcloud artifacts repositories add-iam-policy-binding gcr.io \
  --location=us \
  --member="serviceAccount:cicd-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project-id
```

Note: GKE clusters with Workload Identity need the reader role on the Artifact Registry repository, not the old Storage Object Viewer role on the GCR bucket.

## Step 6: Monitor the Transition

Check Artifact Registry logs to confirm traffic is flowing through correctly.

```bash
# View recent pull/push activity on the transition repository
gcloud logging read \
  'resource.type="audited_resource" AND
   resource.labels.service="artifactregistry.googleapis.com" AND
   resource.labels.method="docker.v2"' \
  --project=my-project-id \
  --limit=20 \
  --format="table(timestamp,protoPayload.methodName,protoPayload.resourceName)"
```

## Handling the Transition Period

During the transition period, both gcr.io paths and Artifact Registry paths work. Here is a strategy for a gradual rollover:

1. Enable redirection (gcr.io now goes to Artifact Registry)
2. Verify all existing workloads still pull images correctly
3. Update CI/CD pipelines to push to Artifact Registry paths
4. Update Kubernetes manifests to use Artifact Registry paths
5. Update Helm values and Kustomize overlays
6. Once nothing references gcr.io, the transition is complete

The redirection handles backward compatibility, so you do not need to update everything at once.

## Common Issues and Fixes

**Image pull errors after enabling redirection**: Check IAM. The most common cause is that the node service account had Storage Object Viewer on the GCR bucket but does not have Artifact Registry Reader on the new repository.

**Push failures**: Make sure the pushing service account has `roles/artifactregistry.writer` on the transition repository.

**Missing images after redirection**: If you enabled redirection before copying images, some images might only exist in the old GCR storage. Run the migration copy command again to catch any that were missed.

**Vulnerability scanning not working**: Enable scanning on the repository explicitly. It is not enabled by default on transition repositories.

```bash
# Enable vulnerability scanning on the transition repository
gcloud artifacts repositories update gcr.io \
  --location=us \
  --enable-vulnerability-scanning \
  --project=my-project-id
```

## Disabling Redirection (Rollback)

If you run into issues and need to roll back, you can disable the redirection.

```bash
# Disable gcr.io redirection (traffic goes back to Container Registry)
gcloud artifacts settings disable-upgrade-redirection \
  --project=my-project-id
```

This is a safe operation - it just routes gcr.io traffic back to the original Container Registry storage. No images are lost.

## Summary

Transition repositories provide a zero-downtime migration path from Container Registry to Artifact Registry. By enabling gcr.io redirection, all existing references to gcr.io paths continue to work while being served from Artifact Registry. This gives you time to update your pipelines and deployments at your own pace. The key steps are copying images first, enabling redirection, updating IAM permissions, and then gradually migrating references to the native Artifact Registry paths.
