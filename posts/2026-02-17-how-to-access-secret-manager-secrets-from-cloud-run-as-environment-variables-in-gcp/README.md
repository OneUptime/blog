# How to Access Secret Manager Secrets from Cloud Run as Environment Variables in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Secret Manager, Environment Variables, Security

Description: Learn how to securely inject Secret Manager secrets into Cloud Run services as environment variables or mounted volumes, eliminating hardcoded credentials from container images.

---

Hardcoding secrets in environment variables at deployment time is a common antipattern. The secret value ends up in your CI/CD logs, your deployment manifests, and your Cloud Run revision metadata. Anyone with `run.services.get` permission can read every environment variable on the service, including your database passwords.

Cloud Run has built-in integration with Secret Manager that solves this cleanly. Instead of passing the secret value directly, you tell Cloud Run to pull the value from Secret Manager at startup. The secret is fetched at container boot time and injected as an environment variable or mounted as a file. The actual value never appears in your deployment configuration.

## How the Integration Works

When you deploy a Cloud Run service with a Secret Manager reference, Cloud Run does the following at startup:

1. The Cloud Run instance's service account calls Secret Manager to fetch the secret version
2. The secret value is injected into the container as an environment variable or a file mount
3. Your application code reads it like any normal environment variable or file

The secret is only fetched when new instances start. If you rotate a secret, existing instances keep the old value until they are replaced (either by a new deployment or by autoscaling).

## Prerequisites

- A Cloud Run service (or a service you are about to deploy)
- One or more secrets stored in Secret Manager
- The Cloud Run service account needs the `roles/secretmanager.secretAccessor` role on the secrets it needs to read

## Step 1 - Store Your Secrets

If you have not already stored your secrets in Secret Manager, do that first:

```bash
# Store a database password
echo -n "db-password-value" | gcloud secrets create db-password \
  --data-file=- \
  --replication-policy="automatic" \
  --project=my-project-id

# Store an API key
echo -n "sk_live_abc123" | gcloud secrets create stripe-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project=my-project-id
```

## Step 2 - Grant Access to the Cloud Run Service Account

Cloud Run services use a service account to authenticate with other GCP services. Grant this service account the ability to access the secrets:

```bash
# Find the service account used by your Cloud Run service
# If you did not specify one, it uses the default compute service account
gcloud run services describe my-service \
  --region=us-central1 \
  --format="get(spec.template.spec.serviceAccountName)" \
  --project=my-project-id

# Grant secretAccessor role on specific secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id

gcloud secrets add-iam-policy-binding stripe-api-key \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id
```

## Step 3 - Deploy with Secret References (Environment Variables)

Use the `--set-secrets` flag to inject secrets as environment variables:

```bash
# Deploy Cloud Run service with secrets as environment variables
gcloud run deploy my-service \
  --image=us-docker.pkg.dev/my-project-id/my-repo/my-app:latest \
  --region=us-central1 \
  --set-secrets="DB_PASSWORD=db-password:latest,STRIPE_API_KEY=stripe-api-key:latest" \
  --project=my-project-id
```

The format is `ENV_VAR_NAME=SECRET_NAME:VERSION`. You can use `latest` to always get the newest version, or pin to a specific version number like `3`.

Your application reads them as normal environment variables:

```python
# Python application reading secrets from environment variables
import os

# These are populated by Cloud Run from Secret Manager
db_password = os.environ.get("DB_PASSWORD")
stripe_key = os.environ.get("STRIPE_API_KEY")

# Use them normally
print(f"Database connection configured (password length: {len(db_password)})")
```

```javascript
// Node.js application reading secrets from environment variables
const dbPassword = process.env.DB_PASSWORD;
const stripeKey = process.env.STRIPE_API_KEY;

// Use them in your application
console.log(`Database configured (password length: ${dbPassword.length})`);
```

## Step 4 - Deploy with Secret References (Volume Mounts)

For secrets that are better consumed as files (like TLS certificates or JSON configs), mount them as volumes:

```bash
# Deploy with secrets mounted as files
gcloud run deploy my-service \
  --image=us-docker.pkg.dev/my-project-id/my-repo/my-app:latest \
  --region=us-central1 \
  --set-secrets="/secrets/db-password=db-password:latest,/secrets/tls-cert=tls-certificate:latest" \
  --project=my-project-id
```

When the path starts with `/`, Cloud Run treats it as a file mount instead of an environment variable. The secret value is written to a file at the specified path.

```python
# Python application reading secrets from mounted files
def read_secret_file(path):
    """Read a secret value from a mounted file."""
    with open(path, "r") as f:
        return f.read()

# Read secrets from mounted paths
db_password = read_secret_file("/secrets/db-password")
tls_cert = read_secret_file("/secrets/tls-cert")
```

## Using Terraform

Here is how to set up the same configuration with Terraform:

```hcl
# Terraform configuration for Cloud Run with Secret Manager integration
resource "google_cloud_run_v2_service" "app" {
  name     = "my-service"
  location = "us-central1"
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run_sa.email

    containers {
      image = "us-docker.pkg.dev/${var.project_id}/my-repo/my-app:latest"

      # Secret as environment variable
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      # Secret as environment variable
      env {
        name = "STRIPE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.stripe_key.secret_id
            version = "latest"
          }
        }
      }

      # Secret as volume mount
      volume_mounts {
        name       = "tls-cert"
        mount_path = "/secrets/tls"
      }
    }

    volumes {
      name = "tls-cert"
      secret {
        secret = google_secret_manager_secret.tls_cert.secret_id
        items {
          version = "latest"
          path    = "cert.pem"
        }
      }
    }
  }
}

# Grant the Cloud Run SA access to the secrets
resource "google_secret_manager_secret_iam_member" "db_password_access" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
```

## Updating Secrets After Deployment

When you add a new version to a secret in Secret Manager, existing Cloud Run instances do not automatically pick it up. You need to trigger a new revision:

```bash
# Add a new version to the secret
echo -n "new-password-456" | gcloud secrets versions add db-password \
  --data-file=- \
  --project=my-project-id

# Deploy a new revision to pick up the updated secret
# If using "latest", just redeploy with the same config
gcloud run services update my-service \
  --region=us-central1 \
  --project=my-project-id
```

If you pinned to a specific version, update the reference:

```bash
# Update the secret reference to point to version 2
gcloud run services update my-service \
  --region=us-central1 \
  --update-secrets="DB_PASSWORD=db-password:2" \
  --project=my-project-id
```

## Pinned Versions vs Latest

Using `latest` is convenient but has a trade-off. If someone accidentally adds a bad secret version, all new Cloud Run instances will pick it up. Pinning to a specific version gives you explicit control:

```bash
# Deploy with pinned secret versions for production
gcloud run deploy my-service \
  --image=us-docker.pkg.dev/my-project-id/my-repo/my-app:latest \
  --region=us-central1 \
  --set-secrets="DB_PASSWORD=db-password:3,STRIPE_API_KEY=stripe-api-key:5" \
  --project=my-project-id
```

The downside is that you need to update the deployment every time a secret rotates. For automated rotation, `latest` is usually the better choice, paired with automated redeployment after rotation.

## Common Pitfalls

The Cloud Run service account must have access to the secret before deployment. If you deploy first and grant access later, the deployment will fail because Cloud Run validates secret access at deploy time.

Secrets are fetched during cold starts. If Secret Manager is experiencing latency or an outage, your cold starts will be slower or fail. This is rare but worth knowing.

The 64 KiB secret size limit applies. If you need to inject larger files, consider storing a reference (like a GCS path) in the secret and fetching the full file in your application code.

Do not use the default compute service account for Cloud Run. Create a dedicated service account with only the permissions needed. This limits blast radius and makes it clear which secrets each service can access.

Integrating Secret Manager with Cloud Run is straightforward and eliminates an entire class of credential exposure risks. Your container images stay clean of secrets, your deployment logs do not contain sensitive values, and rotating a credential becomes a matter of updating Secret Manager and triggering a new revision.
