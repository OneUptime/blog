# How to Manage GCP Secrets in Terraform Using Google Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Secret Manager, Security, Infrastructure as Code

Description: Learn how to create, manage, and access secrets in Google Cloud Secret Manager using Terraform with proper access control, rotation strategies, and security best practices.

---

Secrets management is one of the trickiest parts of infrastructure as code. You need to store database passwords, API keys, and certificates somewhere, but you definitely should not put them in your Terraform code or state file in plain text. Google Cloud Secret Manager gives you a centralized, encrypted, access-controlled store for sensitive values, and Terraform can manage the entire lifecycle.

This guide covers creating and managing secrets with Terraform, controlling access, handling rotation, and integrating secrets with your applications.

## The Challenge of Secrets in Terraform

There is an inherent tension with secrets in Terraform. Terraform needs to know the secret value to store it in Secret Manager, and that value ends up in the Terraform state file. The state file itself needs to be treated as sensitive, which means encrypted storage and restricted access.

That said, managing secret metadata (the Secret Manager secret resource, IAM policies, replication settings) with Terraform is straightforward and valuable. Managing the actual secret values requires more care.

## Enabling Secret Manager

```hcl
# apis.tf - Enable the Secret Manager API
resource "google_project_service" "secretmanager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}
```

## Creating Secrets

A Secret Manager secret is a container. The actual sensitive value is stored in a secret version:

```hcl
# secrets.tf - Create secrets in Secret Manager

# Database password secret
resource "google_secret_manager_secret" "db_password" {
  secret_id = "database-password"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    application = "web-api"
  }

  depends_on = [google_project_service.secretmanager]
}

# API key secret
resource "google_secret_manager_secret" "api_key" {
  secret_id = "external-api-key"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# TLS certificate
resource "google_secret_manager_secret" "tls_cert" {
  secret_id = "tls-certificate"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    type        = "certificate"
  }
}
```

## Creating Secret Versions

Secret versions hold the actual sensitive data:

```hcl
# Generate a random password for the database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!@#$%&*()-_=+"
}

# Store the password as a secret version
resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}
```

For secrets that come from external sources (like an API key you received from a third party), you can pass the value through a Terraform variable:

```hcl
# variables.tf
variable "external_api_key" {
  description = "API key for the external service"
  type        = string
  sensitive   = true  # Mark as sensitive to prevent it from showing in logs
}

# Store the externally provided secret
resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.external_api_key
}
```

Pass the value at apply time:

```bash
# Provide the secret value at apply time
terraform apply -var="external_api_key=sk-abc123def456"

# Or use an environment variable
export TF_VAR_external_api_key="sk-abc123def456"
terraform apply
```

## Managing Secret Access with IAM

Control which service accounts can read each secret:

```hcl
# iam.tf - Secret access control

# Allow the web API service account to access the database password
resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web_api.email}"
}

# Allow the web API to access the external API key
resource "google_secret_manager_secret_iam_member" "api_key_accessor" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web_api.email}"
}

# Allow the background worker to access only the database password
resource "google_secret_manager_secret_iam_member" "db_password_worker" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.worker.email}"
}
```

Use `for_each` for cleaner access management when multiple service accounts need the same secret:

```hcl
# Grant multiple service accounts access to the database password
locals {
  db_password_accessors = [
    google_service_account.web_api.email,
    google_service_account.worker.email,
    google_service_account.migration_runner.email,
  ]
}

resource "google_secret_manager_secret_iam_member" "db_password_accessors" {
  for_each = toset(local.db_password_accessors)

  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value}"
}
```

## Replication Configuration

Secret Manager supports automatic and user-managed replication:

```hcl
# Automatic replication (Google manages it)
resource "google_secret_manager_secret" "auto_replicated" {
  secret_id = "auto-replicated-secret"
  project   = var.project_id

  replication {
    auto {}
  }
}

# User-managed replication for specific regions
resource "google_secret_manager_secret" "regional" {
  secret_id = "regional-secret"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "us-central1"
      }
      replicas {
        location = "us-east1"
      }
    }
  }
}

# User-managed replication with CMEK encryption
resource "google_secret_manager_secret" "cmek_encrypted" {
  secret_id = "cmek-encrypted-secret"
  project   = var.project_id

  replication {
    user_managed {
      replicas {
        location = "us-central1"
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.secret_key.id
        }
      }
    }
  }
}
```

## Using Secrets in Cloud Run

Inject secrets into Cloud Run as environment variables:

```hcl
# Cloud Run service that reads secrets from Secret Manager
resource "google_cloud_run_v2_service" "web_api" {
  name     = "web-api"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = var.api_image

      # Regular environment variables
      env {
        name  = "ENV"
        value = var.environment
      }

      # Secret from Secret Manager
      env {
        name = "DATABASE_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      # Another secret
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.secret_id
            version = "latest"
          }
        }
      }
    }

    service_account = google_service_account.web_api.email
  }
}
```

## Using Secrets in Cloud Functions

```hcl
# Cloud Function that reads secrets
resource "google_cloudfunctions2_function" "processor" {
  name     = "event-processor"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "python312"
    entry_point = "process"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory      = "256M"
    service_account_email = google_service_account.processor.email

    # Mount secrets as environment variables
    secret_environment_variables {
      key        = "DB_PASSWORD"
      project_id = var.project_id
      secret     = google_secret_manager_secret.db_password.secret_id
      version    = "latest"
    }
  }
}
```

## Accessing Secrets in Application Code

Here is how to read secrets programmatically when you need them at runtime:

```python
# Python - Access Secret Manager secrets at runtime
from google.cloud import secretmanager

def get_secret(project_id, secret_id, version="latest"):
    """Fetch a secret value from Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()

    # Build the resource name
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"

    # Access the secret version
    response = client.access_secret_version(request={"name": name})

    # Return the decoded secret value
    return response.payload.data.decode("UTF-8")

# Usage
db_password = get_secret("my-project", "database-password")
api_key = get_secret("my-project", "external-api-key")
```

## Secret Rotation Strategy

Set up rotation topics so your application knows when secrets change:

```hcl
# rotation.tf - Secret rotation configuration

# Pub/Sub topic for rotation notifications
resource "google_pubsub_topic" "secret_rotation" {
  name    = "secret-rotation-notifications"
  project = var.project_id
}

# Secret with rotation configuration
resource "google_secret_manager_secret" "rotating_password" {
  secret_id = "rotating-db-password"
  project   = var.project_id

  replication {
    auto {}
  }

  # Configure rotation schedule
  rotation {
    rotation_period    = "2592000s"  # 30 days
    next_rotation_time = "2026-03-17T00:00:00Z"
  }

  # Publish to this topic when rotation is needed
  topics {
    name = google_pubsub_topic.secret_rotation.id
  }
}
```

## Reading Secret Values in Terraform

Sometimes you need to read a secret value in Terraform itself (for example, to pass to another resource):

```hcl
# Read an existing secret version
data "google_secret_manager_secret_version" "db_password" {
  secret  = "database-password"
  project = var.project_id
}

# Use the secret value in another resource
resource "google_sql_user" "app_user" {
  name     = "app-service"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
```

## Organizing Secrets

For larger projects, use a naming convention and organize secrets by service:

```hcl
# secrets_map.tf - Organized secret creation
locals {
  secrets = {
    "web-api/database-password"    = { labels = { service = "web-api", type = "database" } }
    "web-api/jwt-signing-key"      = { labels = { service = "web-api", type = "auth" } }
    "web-api/stripe-api-key"       = { labels = { service = "web-api", type = "third-party" } }
    "worker/database-password"     = { labels = { service = "worker", type = "database" } }
    "worker/sendgrid-api-key"      = { labels = { service = "worker", type = "third-party" } }
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each = local.secrets

  secret_id = replace(each.key, "/", "-")
  project   = var.project_id

  replication {
    auto {}
  }

  labels = merge(each.value.labels, {
    environment = var.environment
    managed_by  = "terraform"
  })
}
```

## Best Practices

1. **Manage secret metadata with Terraform, but be careful with secret values.** The actual sensitive data ends up in Terraform state, so ensure your state is encrypted and access-controlled.
2. **Use resource-level IAM** for secrets. Grant `secretAccessor` on individual secrets, not at the project level.
3. **Use the `sensitive` flag** on Terraform variables that hold secret values to prevent them from appearing in plan output.
4. **Prefer injecting secrets as environment variables** in Cloud Run and Cloud Functions over fetching them in application code. It is simpler and the platform handles caching.
5. **Set up rotation** for long-lived secrets like database passwords and API keys.
6. **Use labels** to organize and track secrets across services and environments.
7. **Never log secret values.** Be careful with debug logging that might accidentally print environment variables.

## Wrapping Up

Google Secret Manager with Terraform gives you a centralized, auditable, and access-controlled system for managing sensitive configuration. By defining secrets, their access policies, and their integration with Cloud Run and Cloud Functions in Terraform, you ensure that security configuration is reviewed and version-controlled alongside the rest of your infrastructure. Start by migrating hardcoded secrets out of your code and environment files into Secret Manager, and expand from there.
