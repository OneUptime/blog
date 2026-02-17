# How to Configure Cloud Run to Use a Custom Service Account with Least-Privilege Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Service Account, IAM, Security, Least Privilege, Google Cloud

Description: Learn how to create and configure a custom service account for Cloud Run with least-privilege permissions instead of using the overprivileged default account.

---

Every Cloud Run service runs as a service account. By default, it uses the Compute Engine default service account, which has the Editor role on your entire project. That means your Cloud Run container can read every secret, delete any database, modify any resource, and access every API in the project.

This is a security problem. If your container gets compromised - through a dependency vulnerability, a code bug, or a supply chain attack - the attacker inherits all those permissions. The fix is straightforward: create a dedicated service account with only the permissions your service actually needs.

## Why the Default Service Account Is Dangerous

The Compute Engine default service account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) gets the Editor role by default. Here is what that means in practice:

- Can read and write to every Cloud Storage bucket in the project
- Can access every secret in Secret Manager
- Can read and write to every database
- Can create and delete Compute Engine instances
- Can modify IAM policies
- Can access every other service in the project

If your Cloud Run service only needs to read from one Cloud Storage bucket and write to one Pub/Sub topic, giving it the Editor role is wildly excessive.

## Step 1: Create a Dedicated Service Account

Create a service account specifically for your Cloud Run service:

```bash
# Create a service account for your Cloud Run service
gcloud iam service-accounts create my-service-sa \
  --display-name="My Cloud Run Service" \
  --description="Least-privilege SA for the my-service Cloud Run service"
```

The naming convention I like is `<service-name>-sa`. It makes it obvious which service account belongs to which Cloud Run service.

## Step 2: Identify Required Permissions

Before granting roles, figure out exactly what your service needs. Go through your code and list every GCP resource it accesses:

Common patterns:

| Your service does... | Required role |
|---------------------|---------------|
| Reads from Cloud Storage | `roles/storage.objectViewer` |
| Writes to Cloud Storage | `roles/storage.objectCreator` |
| Publishes to Pub/Sub | `roles/pubsub.publisher` |
| Subscribes to Pub/Sub | `roles/pubsub.subscriber` |
| Reads secrets | `roles/secretmanager.secretAccessor` |
| Writes to Cloud Logging | Automatic (no extra role needed) |
| Connects to Cloud SQL | `roles/cloudsql.client` |
| Calls another Cloud Run service | `roles/run.invoker` |
| Writes to Firestore | `roles/datastore.user` |
| Reads from BigQuery | `roles/bigquery.dataViewer` |
| Writes to BigQuery | `roles/bigquery.dataEditor` |
| Uses Cloud Tasks | `roles/cloudtasks.enqueuer` |

## Step 3: Grant Least-Privilege Roles

Grant only the roles your service needs. Prefer resource-level bindings over project-level when possible:

```bash
# Store the service account email
SA_EMAIL="my-service-sa@$(gcloud config get-value project).iam.gserviceaccount.com"

# Example: Grant read access to a specific Cloud Storage bucket
gsutil iam ch serviceAccount:${SA_EMAIL}:objectViewer \
  gs://my-data-bucket

# Example: Grant write access to a specific Cloud Storage bucket
gsutil iam ch serviceAccount:${SA_EMAIL}:objectCreator \
  gs://my-output-bucket

# Example: Grant Pub/Sub publisher access to a specific topic
gcloud pubsub topics add-iam-policy-binding my-topic \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/pubsub.publisher"

# Example: Grant Secret Manager access to specific secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Example: Grant Cloud SQL client role (project-level, as Cloud SQL requires it)
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"
```

Notice that most roles are granted at the resource level, not the project level. This means the service account can only access the specific bucket, topic, or secret - not every resource of that type in the project.

## Step 4: Deploy with the Custom Service Account

```bash
# Deploy Cloud Run with the custom service account
gcloud run deploy my-service \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest \
  --region=us-central1 \
  --service-account=${SA_EMAIL}
```

Or update an existing service:

```bash
# Update an existing service to use the custom SA
gcloud run services update my-service \
  --region=us-central1 \
  --service-account=${SA_EMAIL}
```

### Using YAML

```yaml
# service.yaml with custom service account
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-service
spec:
  template:
    spec:
      # Use the custom service account
      serviceAccountName: my-service-sa@MY_PROJECT.iam.gserviceaccount.com
      containers:
        - image: us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest
          resources:
            limits:
              cpu: "1"
              memory: 512Mi
```

### Using Terraform

```hcl
# Service account with least-privilege permissions
resource "google_service_account" "cloud_run_sa" {
  account_id   = "my-service-sa"
  display_name = "My Cloud Run Service"
  description  = "Least-privilege SA for the my-service Cloud Run service"
}

# Grant specific permissions
resource "google_storage_bucket_iam_member" "bucket_reader" {
  bucket = "my-data-bucket"
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_pubsub_topic_iam_member" "topic_publisher" {
  topic  = "my-topic"
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  secret_id = "db-password"
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run service using the custom SA
resource "google_cloud_run_v2_service" "my_service" {
  name     = "my-service"
  location = "us-central1"

  template {
    service_account = google_service_account.cloud_run_sa.email

    containers {
      image = "us-central1-docker.pkg.dev/my-project/my-repo/my-app:latest"
    }
  }
}
```

## Step 5: Verify Permissions

Test that your service works with the restricted permissions:

```bash
# Deploy and test
gcloud run deploy my-service \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest \
  --region=us-central1 \
  --service-account=${SA_EMAIL}

# Send test requests and check for permission errors in logs
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="my-service"
  AND (textPayload:"permission" OR textPayload:"denied" OR textPayload:"forbidden" OR severity>=ERROR)
' --limit=20 --format="table(timestamp, textPayload)"
```

If you see "Permission denied" errors, you missed a required role. Add the specific permission and redeploy.

## Step 6: Audit and Review

Periodically review the permissions to make sure they are still appropriate:

```bash
# List all IAM bindings for the service account
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}" \
  --format="table(bindings.role, bindings.members)"
```

You can also use IAM Recommender to find unused permissions:

```bash
# Get IAM recommendations for the service account
gcloud recommender recommendations list \
  --project=$(gcloud config get-value project) \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format="table(content.overview.member, content.overview.removedRole, content.overview.addedRole)"
```

IAM Recommender analyzes actual API usage and suggests removing roles that have not been used.

## One Service Account Per Service

Each Cloud Run service should have its own service account. This provides isolation between services:

```bash
# Service Account for the API
gcloud iam service-accounts create api-sa \
  --display-name="API Service"

# Service Account for the Worker
gcloud iam service-accounts create worker-sa \
  --display-name="Worker Service"

# Service Account for the Frontend
gcloud iam service-accounts create frontend-sa \
  --display-name="Frontend Service"

# Each gets only the permissions it needs
# API needs database access
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:api-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Worker needs Pub/Sub and Storage
gcloud pubsub subscriptions add-iam-policy-binding tasks-sub \
  --member="serviceAccount:worker-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"

# Frontend only needs to call the API
gcloud run services add-iam-policy-binding api \
  --region=us-central1 \
  --member="serviceAccount:frontend-sa@$(gcloud config get-value project).iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

If the frontend gets compromised, the attacker can only invoke the API service - not access the database, Pub/Sub, or Storage directly.

## Common Mistakes

**Granting project-level roles when resource-level is possible.** `roles/storage.objectViewer` at the project level gives access to every bucket. Grant it at the bucket level instead.

**Forgetting the Cloud SQL client role.** Cloud SQL requires a project-level role for the service account. This is one of the few cases where project-level is necessary.

**Not testing after changing service accounts.** Always test thoroughly after switching from the default service account. Missing permissions will cause runtime errors.

**Sharing service accounts between services.** Each service should have its own SA. Shared accounts mean shared blast radius.

## Summary

Switching from the default Compute Engine service account to a custom, least-privilege service account is one of the most important security improvements you can make for your Cloud Run services. Create a dedicated service account per service, grant only the specific roles needed at the most restrictive scope possible, and use IAM Recommender to identify and remove unused permissions over time. The setup takes a few minutes per service but dramatically reduces the impact of any security incident.
