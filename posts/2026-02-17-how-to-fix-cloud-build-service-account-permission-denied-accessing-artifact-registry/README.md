# Fix Cloud Build Service Account Permission Denied Accessing Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Artifact Registry, IAM, CI/CD

Description: Resolve permission denied errors when Cloud Build service accounts try to push or pull images from Google Cloud Artifact Registry repositories.

---

Your Cloud Build pipeline fails with a permission denied error when trying to push an image to Artifact Registry. Or maybe it cannot pull a base image from a private registry. Either way, the build was working yesterday and now it is not, or you just set up a new repository and builds cannot access it. The IAM model between Cloud Build and Artifact Registry has a few gotchas that are easy to miss.

## Understanding the Service Accounts Involved

Cloud Build uses different service accounts depending on your configuration:

1. The Compute Engine default service account, which Cloud Build uses by default in many newer projects: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
2. The legacy Cloud Build service account: `PROJECT_NUMBER@cloudbuild.gserviceaccount.com`
3. A user-specified service account (if configured in the build trigger or submission)

Recent changes to Google Cloud may affect which roles are granted by default. In newer projects, the default Cloud Build service account might not have broad permissions, so you need to grant them explicitly.

## Step 1: Identify Which Service Account Is Being Used

Check the build configuration to see which service account runs the build:

```bash
# Check recent build details

gcloud builds describe BUILD_ID \
    --format="json(serviceAccount, options)"
```

If `serviceAccount` is empty, the build uses the default Cloud Build service account. You can also check the build trigger:

```bash
# List build triggers and their service account configuration
gcloud builds triggers list \
    --format="table(name, serviceAccount, createTime)"
```

## Step 2: Check Current Permissions

See what roles the service account currently has:

```bash
# Check project-level IAM for the Cloud Build SA
gcloud projects get-iam-policy YOUR_PROJECT \
    --flatten="bindings[].members" \
    --filter="bindings.members:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --format="table(bindings.role)"
```

Also check repository-level IAM:

```bash
# Check IAM on the specific Artifact Registry repository
gcloud artifacts repositories get-iam-policy your-repo \
    --location=us-central1 \
    --format="table(bindings.role, bindings.members)"
```

## Step 3: Grant Artifact Registry Permissions

For pushing images, the service account needs `roles/artifactregistry.writer`. For pulling images, it needs `roles/artifactregistry.reader`.

Grant at the project level (applies to all repos):

```bash
# Grant Artifact Registry Writer to the Cloud Build SA
gcloud projects add-iam-policy-binding YOUR_PROJECT \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.writer"
```

Or grant at the repository level (more restrictive):

```bash
# Grant on a specific repository only
gcloud artifacts repositories add-iam-policy-binding your-repo \
    --location=us-central1 \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.writer"
```

If you are using a custom service account:

```bash
# Grant permissions to a custom service account
gcloud artifacts repositories add-iam-policy-binding your-repo \
    --location=us-central1 \
    --member="serviceAccount:my-custom-sa@YOUR_PROJECT.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"
```

## Step 4: Handle Cross-Project Access

If your Artifact Registry repository is in a different project than your Cloud Build, you need cross-project IAM:

```bash
# Grant the Cloud Build SA from Project A access to Artifact Registry in Project B
gcloud artifacts repositories add-iam-policy-binding your-repo \
    --project=project-b \
    --location=us-central1 \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL_FROM_PROJECT_A" \
    --role="roles/artifactregistry.writer"
```

For pulling base images from a different project:

```bash
# Grant reader access for pulling base images
gcloud artifacts repositories add-iam-policy-binding base-images-repo \
    --project=shared-images-project \
    --location=us-central1 \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.reader"
```

## Step 5: Check for the Docker Credential Helper

When Cloud Build uses Docker commands to push or pull images in a normal Cloud Build environment, you do not need to run `gcloud auth configure-docker`. Cloud Build handles authentication for Artifact Registry, but you still need the correct IAM permissions. Authentication issues can show up if you override Docker's configuration or run Docker outside Cloud Build.

In your `cloudbuild.yaml`, use the Artifact Registry image path directly:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA'
```

If you are running Docker locally or in another CI system, the `gcloud auth configure-docker us-central1-docker.pkg.dev` command sets up the credential helper so that `docker push` and `docker pull` authenticate automatically.

## Step 6: Check If the Repository Exists

A surprisingly common issue - the Artifact Registry repository must be created before you push to it:

```bash
# List existing repositories
gcloud artifacts repositories list \
    --location=us-central1 \
    --format="table(name, format, mode)"

# Create a Docker repository if it does not exist
gcloud artifacts repositories create your-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker images for CI/CD"
```

Unlike Container Registry (gcr.io) which creates repositories automatically, Artifact Registry requires explicit repository creation.

## Step 7: Verify the Image Path Format

Artifact Registry uses a different URL format than Container Registry:

```text
# Container Registry (old - being deprecated)
gcr.io/PROJECT_ID/IMAGE_NAME:TAG

# Artifact Registry (current)
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE_NAME:TAG
```

Common mistakes with the Artifact Registry path:
- Missing the repository name (it is required, unlike gcr.io)
- Wrong location prefix (us-central1 vs us, etc.)
- Using `.io` instead of `.dev`

```yaml
# Correct image path for Artifact Registry
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      # Note the full path: location-docker.pkg.dev/project/repo/image:tag
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-image:$COMMIT_SHA'
      - '.'
```

## Step 8: Handle the Default Service Account Change

Google Cloud changed which service account Cloud Build uses by default for many newer projects. Older projects might use the legacy Cloud Build service account, while newer projects might use the Compute Engine default service account. If your builds suddenly stop working, make sure you are granting roles to the service account that is actually running the build.

Check if the default Cloud Build service account has the necessary roles:

```bash
# Check if the Cloud Build SA has basic roles
gcloud projects get-iam-policy YOUR_PROJECT \
    --flatten="bindings[].members" \
    --filter="bindings.members:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --format="table(bindings.role)"
```

If the service account is missing Artifact Registry access, grant the specific Artifact Registry role it needs:

```bash
# Grant the minimum Artifact Registry role needed for pushing images
gcloud projects add-iam-policy-binding YOUR_PROJECT \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/artifactregistry.writer"
```

If you use a user-specified service account and store build logs in Cloud Logging, grant it the Logs Writer role too:

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT \
    --member="serviceAccount:BUILD_SERVICE_ACCOUNT_EMAIL" \
    --role="roles/logging.logWriter"
```

## Debugging Flowchart

```mermaid
flowchart TD
    A[Permission Denied on Artifact Registry] --> B{Push or Pull?}
    B -->|Push| C{SA has AR Writer role?}
    B -->|Pull| D{SA has AR Reader role?}
    C -->|No| E[Grant roles/artifactregistry.writer]
    C -->|Yes| F{Cross-project?}
    D -->|No| G[Grant roles/artifactregistry.reader]
    D -->|Yes| F
    F -->|Yes| H[Grant role in the target project]
    F -->|No| I{Repository exists?}
    I -->|No| J[Create the repository]
    I -->|Yes| K[Check image path format]
```

## Monitoring Build Pipelines

Use [OneUptime](https://oneuptime.com) to monitor Cloud Build success rates and catch permission failures early. Tracking build failures over time helps you identify patterns - like permissions breaking after infrastructure changes - and fix them before they block your deployment pipeline.

The key to avoiding permission issues is to explicitly grant the minimum required roles and not rely on overly broad default permissions. This is more secure and more predictable.
