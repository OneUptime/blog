# How to Configure Cloud Firestore with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, NoSQL, OpenTofu, Database, Firebase

Description: Learn how to create and configure Cloud Firestore with OpenTofu including database creation, composite indexes, and IAM security rules for document database workloads.

## Overview

Cloud Firestore is a flexible, scalable NoSQL document database for mobile, web, and server-side development. OpenTofu manages Firestore database instances, composite indexes, and backup configurations.

## Step 1: Create a Firestore Database

```hcl
# main.tf - Create Firestore database (Native mode)

resource "google_firestore_database" "app_database" {
  project     = var.project_id
  name        = "(default)"  # Primary database uses "(default)" name
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"  # FIRESTORE_NATIVE or DATASTORE_MODE

  # Enable point-in-time recovery for short-term recovery
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_ENABLED"

  # Delete protection to prevent accidental deletion
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  # Disable App Engine integration for this database
  app_engine_integration_mode = "DISABLED"
}
```

## Step 2: Create a Named Firestore Database

```hcl
# Named database (Firestore supports multiple databases per project)
resource "google_firestore_database" "secondary_database" {
  project     = var.project_id
  name        = "analytics-db"  # Named database
  location_id = "us-east1"
  type        = "FIRESTORE_NATIVE"

  concurrency_mode            = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
}
```

## Step 3: Create Composite Indexes

```hcl
# Composite index for complex queries
resource "google_firestore_index" "orders_by_user_date" {
  project    = var.project_id
  database   = google_firestore_database.app_database.name
  collection = "orders"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
}

# Array-contains query index
resource "google_firestore_index" "products_by_tags" {
  project    = var.project_id
  database   = google_firestore_database.app_database.name
  collection = "products"

  fields {
    field_path   = "tags"
    array_config = "CONTAINS"
  }

  fields {
    field_path = "price"
    order      = "ASCENDING"
  }
}
```

## Step 4: Configure Backup

```hcl
# Firestore backup schedule
resource "google_firestore_backup_schedule" "daily_backup" {
  project  = var.project_id
  database = google_firestore_database.app_database.name

  retention = "8467200s"  # 98 days retention

  daily_recurrence {}
}
```

## Step 5: IAM Access

```hcl
# Grant app service account datastore user role
resource "google_project_iam_member" "firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}
```

## Summary

Cloud Firestore with OpenTofu enables document database management as code. Create composite indexes for complex queries, enable point-in-time recovery for short-term recovery, and use backup schedules for data protection. Named databases allow multiple Firestore databases per project for multi-tenant or environment isolation scenarios.
