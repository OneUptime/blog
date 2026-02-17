# How to Use Terraform to Provision Firebase and GCP Resources Together

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Terraform, Infrastructure as Code, DevOps

Description: Step-by-step guide to managing Firebase and GCP resources in a single Terraform configuration for consistent, repeatable infrastructure deployments.

---

Managing Firebase resources through the console is fine for prototyping, but it falls apart when you need reproducibility across environments. You want your staging environment to mirror production, you want pull requests for infrastructure changes, and you want to tear down and rebuild without manual clicks. Terraform solves all of this, and it works surprisingly well with Firebase now that Google has expanded its Terraform provider support.

## Prerequisites

You need Terraform installed (version 1.0 or later), a GCP project with billing enabled, and the Firebase Management API enabled. You also need a service account with sufficient permissions to create resources.

Enable the required APIs with gcloud:

```bash
# Enable the APIs that Terraform will need
gcloud services enable firebase.googleapis.com --project YOUR_PROJECT_ID
gcloud services enable firestore.googleapis.com --project YOUR_PROJECT_ID
gcloud services enable identitytoolkit.googleapis.com --project YOUR_PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project YOUR_PROJECT_ID
```

## Project Structure

A clean Terraform layout for a Firebase-plus-GCP project looks like this:

```
infrastructure/
  main.tf           # Provider configuration and core resources
  firebase.tf       # Firebase-specific resources
  gcp.tf            # GCP resources (Cloud Run, Cloud SQL, etc.)
  variables.tf      # Input variables
  outputs.tf        # Output values
  terraform.tfvars  # Variable values (do not commit secrets)
```

## Provider Configuration

You need both the `google` and `google-beta` providers. Several Firebase resources are only available through the beta provider.

This configuration sets up both providers and specifies the project:

```hcl
# main.tf - Provider setup
terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 5.0"
    }
  }

  # Store state remotely in a GCS bucket
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "firebase-project"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
```

## Variables

Define your input variables in a separate file:

```hcl
# variables.tf
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The default GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}
```

## Enabling Firebase on the GCP Project

The first Firebase resource to create is the Firebase project itself. This links Firebase to your existing GCP project.

```hcl
# firebase.tf - Enable Firebase on the project
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
}
```

## Setting Up Firebase Authentication

You can configure the Identity Platform (which backs Firebase Auth) through Terraform:

```hcl
# firebase.tf - Configure Firebase Auth
resource "google_identity_platform_config" "auth" {
  provider = google-beta
  project  = var.project_id

  # Enable email/password sign-in
  sign_in {
    allow_duplicate_emails = false

    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [google_firebase_project.default]
}
```

## Provisioning Firestore

Creating a Firestore database with Terraform is straightforward. Note that the location is permanent once set - you cannot change it later.

```hcl
# firebase.tf - Create Firestore database
resource "google_firestore_database" "default" {
  provider    = google-beta
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_firebase_project.default]
}
```

## Setting Up Firebase Web App

Register a web application within your Firebase project:

```hcl
# firebase.tf - Register a web app
resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = "${var.environment}-web-app"

  depends_on = [google_firebase_project.default]
}

# Output the web app config for use in your frontend
data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.frontend.app_id
}
```

## Adding GCP Resources Alongside Firebase

Now here is where things get powerful. You can define GCP resources like Cloud Run services, Cloud SQL databases, and VPC networks in the same Terraform configuration.

This example adds a Cloud Run service that your Firebase-hosted frontend talks to:

```hcl
# gcp.tf - Cloud Run API backend
resource "google_cloud_run_v2_service" "api" {
  name     = "${var.environment}-api"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/api:latest"

      env {
        name  = "GCP_PROJECT"
        value = var.project_id
      }

      env {
        name  = "FIRESTORE_DATABASE"
        value = google_firestore_database.default.name
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    # Use a dedicated service account
    service_account = google_service_account.api_sa.email
  }
}

# Service account for the Cloud Run service
resource "google_service_account" "api_sa" {
  account_id   = "${var.environment}-api-sa"
  display_name = "API Service Account (${var.environment})"
}

# Grant the API service account Firestore access
resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}
```

## Cloud Storage Buckets for Firebase

Configure Cloud Storage buckets that Firebase can use:

```hcl
# gcp.tf - Storage bucket for user uploads
resource "google_storage_bucket" "user_uploads" {
  name     = "${var.project_id}-user-uploads-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "POST", "PUT"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}
```

## Firestore Security Rules and Indexes

While Terraform provisions the infrastructure, Firestore security rules and indexes are better managed through Firebase CLI deployment. However, you can trigger this from Terraform using a null_resource:

```hcl
# firebase.tf - Deploy Firestore rules after database creation
resource "null_resource" "firestore_rules" {
  triggers = {
    rules_hash = filesha256("${path.module}/../firestore.rules")
  }

  provisioner "local-exec" {
    command = "firebase deploy --only firestore:rules --project ${var.project_id}"
  }

  depends_on = [google_firestore_database.default]
}
```

## Outputs

Export useful values from your Terraform configuration:

```hcl
# outputs.tf
output "firebase_web_app_config" {
  description = "Firebase web app configuration"
  value = {
    api_key       = data.google_firebase_web_app_config.frontend.api_key
    auth_domain   = data.google_firebase_web_app_config.frontend.auth_domain
    project_id    = var.project_id
    storage_bucket = data.google_firebase_web_app_config.frontend.storage_bucket
  }
  sensitive = true
}

output "api_url" {
  description = "Cloud Run API service URL"
  value       = google_cloud_run_v2_service.api.uri
}
```

## Deploying the Infrastructure

With everything defined, deploying is just a few commands:

```bash
# Initialize Terraform and download providers
terraform init

# Preview what will be created
terraform plan -var-file="environments/dev.tfvars"

# Apply the changes
terraform apply -var-file="environments/dev.tfvars"
```

## Managing Multiple Environments

Use separate tfvars files for each environment:

```hcl
# environments/dev.tfvars
project_id  = "myapp-dev-12345"
region      = "us-central1"
environment = "dev"
```

```hcl
# environments/prod.tfvars
project_id  = "myapp-prod-67890"
region      = "us-central1"
environment = "prod"
```

Alternatively, use Terraform workspaces, though separate tfvars files tend to be more explicit and easier to manage.

## Summary

Using Terraform to manage Firebase and GCP resources together gives you a single source of truth for your infrastructure. Firebase projects, authentication settings, Firestore databases, web apps, Cloud Run services, and storage buckets all live in version-controlled HCL files. This means predictable deployments, easy environment replication, and infrastructure changes that go through the same code review process as your application code. The Google Beta provider covers most Firebase resources now, making this approach production-ready for real projects.
