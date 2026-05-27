# How to Troubleshoot Common Cloud Build Permission Errors and IAM Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, IAM, Permission, Troubleshooting, Security

Description: A practical troubleshooting guide for the most common Cloud Build permission errors and IAM configuration issues on Google Cloud Platform.

---

Permission errors are the most frustrating part of working with Cloud Build. Your build configuration is correct, your code is fine, but the build fails because some service account is missing some role somewhere. In this post, I will catalog the most common Cloud Build permission errors, explain what causes them, and show you exactly how to fix each one.

## Understanding Cloud Build Service Accounts

Before diving into errors, you need to understand which service accounts Cloud Build uses and what they do.

### The Cloud Build Service Account

Cloud Build can use several different service accounts. In older projects, the default build identity is often the legacy Cloud Build service account:

```text
PROJECT_NUMBER@cloudbuild.gserviceaccount.com
```

In newer projects, depending on your organization's settings, Cloud Build may use the Compute Engine default service account instead. You can also set a user-specified service account on a build or trigger. The account that runs the build steps is the one whose credentials are used when a build step accesses a GCP resource (push an image, deploy a service, read a secret). The commands below use the legacy Cloud Build service account as the example; replace `CB_SA` with the service account that actually runs your build.

### The Compute Engine Default Service Account

Cloud Build may use the Compute Engine default service account as the build identity:

```text
PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

This also matters when deploying to services like Cloud Run or Cloud Run functions, where the deployed service may run as this account unless you specify a different runtime service account.

### Custom Service Accounts

You can configure Cloud Build triggers to use a custom service account instead of the default. This is recommended for production setups to follow the principle of least privilege.

## Error 1: Permission Denied Pushing to Artifact Registry

**Error message:**
```text
ERROR: failed to push to us-central1-docker.pkg.dev/my-project/my-repo/my-app:latest:
denied: Permission "artifactregistry.repositories.uploadArtifacts" denied
```

**Cause:** The Cloud Build service account does not have write access to the Artifact Registry repository.

**Fix:**

```bash
# Get your project number

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant Artifact Registry Writer role
gcloud artifacts repositories add-iam-policy-binding my-repo \
  --location=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"
```

Container Registry is deprecated and writes to Container Registry are shut down. If you are still working with pre-migration Container Registry buckets, Cloud Storage roles apply. For `gcr.io` repositories hosted on Artifact Registry, grant Artifact Registry roles instead.

```bash
# For legacy Container Registry buckets only
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.admin"
```

## Error 2: Cannot Deploy to Cloud Run

**Error message:**
```text
ERROR: (gcloud.run.deploy) PERMISSION_DENIED: Permission
'run.services.create' denied on resource 'namespaces/my-project/services/my-app'
```

**Cause:** The Cloud Build service account lacks Cloud Run permissions.

**Fix:**

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin"

# Also needed: permission to act as the runtime service account
gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"
```

The second command is the one people almost always miss. Cloud Build needs `iam.serviceAccountUser` on the service account that the Cloud Run service runs as.

## Error 3: Cannot Access Secret Manager Secrets

**Error message:**
```text
ERROR: (gcloud.builds.submit) FAILED_PRECONDITION: generic::failed_precondition:
missing permission on secret "projects/my-project/secrets/my-secret/versions/latest"
```

**Cause:** The Cloud Build service account cannot read the secret.

**Fix:**

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant access to the specific secret
gcloud secrets add-iam-policy-binding my-secret \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

For security, grant access to individual secrets rather than the project-level role.

## Error 4: Cannot Deploy Cloud Functions

**Error message:**
```text
ERROR: (gcloud.functions.deploy) ResponseError: status=[403],
code=[Forbidden], message=[Permission 'cloudfunctions.functions.create' denied]
```

**Cause:** Missing Cloud Functions permissions.

**Fix:**

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Functions Developer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/cloudfunctions.developer"

# Grant permission to act as the function's runtime service account
gcloud iam service-accounts add-iam-policy-binding \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser"
```

For Cloud Run functions, you may also need Cloud Run Admin, Artifact Registry Writer, Storage Admin, and Logs Writer on the build service account, depending on what the deployment creates and where it writes build logs and artifacts.

## Error 5: Cannot Access GCS Bucket

**Error message:**
```text
AccessDeniedException: 403 PROJECT_NUMBER@cloudbuild.gserviceaccount.com
does not have storage.objects.get access to the Google Cloud Storage object
```

**Cause:** The Cloud Build service account cannot read or write to the GCS bucket.

**Fix:**

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant read access to a specific bucket
gsutil iam ch "serviceAccount:${CB_SA}:objectViewer" gs://my-bucket

# Or grant read/write access
gsutil iam ch "serviceAccount:${CB_SA}:objectAdmin" gs://my-bucket
```

## Error 6: Cannot Pull Base Image from Another Project

**Error message:**
```text
Step #0: ERROR: failed to pull gcr.io/other-project/base-image:latest:
denied: Token exchange failed for project 'other-project'
```

**Cause:** The Cloud Build service account in your project does not have access to read images from another project's registry.

**Fix:**

In the project that owns the image:

```bash
# Your project's Cloud Build service account needs reader access in the other project
YOUR_PROJECT_NUMBER=123456789
gcloud projects add-iam-policy-binding other-project \
  --member="serviceAccount:${YOUR_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Error 7: Cannot Deploy to GKE

**Error message:**
```text
Error: cluster "my-cluster" is not accessible: permission denied
```

**Cause:** The Cloud Build service account lacks GKE permissions.

**Fix:**

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant GKE Developer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/container.developer"
```

This covers Google Cloud IAM access. If your cluster uses Kubernetes RBAC, the service account also needs the appropriate Kubernetes permissions inside the cluster.

## Error 8: Trigger Creation Fails Due to Repository Permissions

**Error message:**
```text
ERROR: (gcloud.builds.triggers.create.github) PERMISSION_DENIED:
The caller does not have permission
```

**Cause:** Your user account (not the service account) lacks permission to create triggers.

**Fix:**

```bash
# Grant Cloud Build Editor role to the user creating triggers
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:your-email@company.com" \
  --role="roles/cloudbuild.builds.editor"
```

## Error 9: Build Fails with "Source Not Found"

**Error message:**
```text
ERROR: (gcloud.builds.submit) NOT_FOUND: no source provided
```

**Cause:** The source code could not be uploaded to the GCS staging bucket, or the staging bucket does not exist.

**Fix:**

Cloud Build creates a staging bucket automatically named `PROJECT_ID_cloudbuild`. If it was deleted:

```bash
# Recreate the Cloud Build staging bucket
gsutil mb -p $PROJECT_ID gs://${PROJECT_ID}_cloudbuild
```

## Error 10: VPC Service Controls Blocking Build

**Error message:**
```text
ERROR: Request is prohibited by organization's policy.
vpcServiceControls
```

**Cause:** VPC Service Controls are blocking Cloud Build from accessing resources inside a service perimeter.

**Fix:**

This requires updating the VPC Service Controls configuration. Cloud Build support for VPC Service Controls is based on private pools, and builds running inside a service perimeter also need an allowed logs configuration. You typically need to either:

1. Run the build in a private pool that is inside the service perimeter
2. Create an ingress rule or access level that allows the build service account

```bash
# Add an access level to the VPC SC perimeter
# This typically requires an organization admin
gcloud access-context-manager perimeters update my-perimeter \
  --add-access-levels=my-access-level
```

This is usually handled by a security or platform team rather than individual developers.

## Diagnostic Commands

When you hit a permission error, these commands help you figure out what is going on:

```bash
# Check what roles the Cloud Build service account has
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:${CB_SA}" \
  --format="table(bindings.role)"

# Check the default service account Cloud Build will use
gcloud builds get-default-service-account --project=$PROJECT_ID

# List testable permissions for a resource
gcloud iam list-testable-permissions \
  //cloudresourcemanager.googleapis.com/projects/$PROJECT_ID \
  --filter="name:cloudbuild"

# Check Artifact Registry repository permissions
gcloud artifacts repositories get-iam-policy my-repo \
  --location=us-central1

# Check Secret Manager secret permissions
gcloud secrets get-iam-policy my-secret
```

## Using Custom Service Accounts

For better security, create a custom service account for Cloud Build with only the permissions it needs:

```bash
# Create a custom service account
gcloud iam service-accounts create cloud-build-custom \
  --description="Custom service account for Cloud Build" \
  --display-name="Cloud Build Custom SA"

# Grant only the specific roles needed
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-build-custom@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-build-custom@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:cloud-build-custom@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

When you specify your own service account, configure your build logs to use Cloud Logging or a user-created Cloud Storage logs bucket. User-specified service accounts cannot write logs to the default Cloud Build logs bucket.

Reference the custom service account in your trigger:

```bash
# Create a trigger using the custom service account
gcloud builds triggers create github \
  --name="my-trigger" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --service-account="projects/$PROJECT_ID/serviceAccounts/cloud-build-custom@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Best Practices

Grant permissions at the most specific level possible. Use repository-level IAM for Artifact Registry, secret-level IAM for Secret Manager, and bucket-level IAM for GCS. Project-level roles are convenient but give broader access than needed.

Document the IAM setup for your build pipeline. When someone new joins the team and needs to debug a permission issue, having a list of required roles saves hours of trial and error.

Use IAM Recommender to identify and remove unused permissions. Over time, service accounts accumulate roles they no longer need.

Test permission changes in a non-production project first. Granting the wrong role or removing a needed role can break your CI/CD pipeline.

## Wrapping Up

Most Cloud Build permission errors boil down to the Cloud Build service account missing a specific IAM role. The pattern is always the same: identify which service account is being used, determine what resource it is trying to access, and grant the minimum required role. Keep a reference document of the IAM roles your pipelines need, and add new roles proactively when you add new build steps that access GCP resources. Spending 10 minutes on IAM setup up front saves an hour of debugging failed builds later.
