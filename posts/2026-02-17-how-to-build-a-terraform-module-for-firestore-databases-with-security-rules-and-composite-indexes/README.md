# How to Build a Terraform Module for Firestore Databases with Security Rules and Composite Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Firestore, NoSQL, Database, Google Cloud Platform

Description: Build a Terraform module for Google Cloud Firestore that creates databases, manages security rules for access control, and configures composite indexes for query performance.

---

Firestore is Google's serverless NoSQL document database. It scales automatically, supports real-time listeners, and handles offline sync for mobile apps. But deploying Firestore properly means more than just enabling the API - you need security rules to control who can read and write what data, and composite indexes to make your queries performant.

Managing all of this with Terraform gives you version-controlled, reproducible database configuration. Let me show you how to build a reusable module.

## Module Structure

```
modules/firestore/
  main.tf         # Database and API resources
  indexes.tf      # Composite indexes
  rules.tf        # Security rules
  variables.tf    # Input variables
  outputs.tf      # Output values
```

## Variables

Define the inputs that make the module configurable:

```hcl
# variables.tf - Firestore module inputs

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "Firestore database location"
  type        = string
  default     = "us-central"
}

variable "database_id" {
  description = "Database ID (use '(default)' for the default database)"
  type        = string
  default     = "(default)"
}

variable "database_type" {
  description = "Database type: FIRESTORE_NATIVE or DATASTORE_MODE"
  type        = string
  default     = "FIRESTORE_NATIVE"
}

variable "concurrency_mode" {
  description = "Concurrency mode: OPTIMISTIC or PESSIMISTIC"
  type        = string
  default     = "OPTIMISTIC"
}

variable "app_engine_integration_mode" {
  description = "App Engine integration mode: ENABLED or DISABLED"
  type        = string
  default     = "DISABLED"
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = true
}

variable "delete_protection_state" {
  description = "Delete protection: DELETE_PROTECTION_ENABLED or DELETE_PROTECTION_DISABLED"
  type        = string
  default     = "DELETE_PROTECTION_ENABLED"
}

variable "composite_indexes" {
  description = "List of composite indexes to create"
  type = list(object({
    collection = string
    fields = list(object({
      field_path = string
      order      = optional(string)
      array_config = optional(string)
    }))
  }))
  default = []
}

variable "security_rules_file" {
  description = "Path to the Firestore security rules file"
  type        = string
  default     = ""
}

variable "security_rules_content" {
  description = "Inline Firestore security rules (used if security_rules_file is empty)"
  type        = string
  default     = ""
}
```

## Creating the Firestore Database

The main database resource:

```hcl
# main.tf - Firestore database

# Enable the Firestore API
resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

# Create the Firestore database
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = var.database_id
  location_id = var.location
  type        = var.database_type

  concurrency_mode            = var.concurrency_mode
  app_engine_integration_mode = var.app_engine_integration_mode
  point_in_time_recovery_enablement = var.point_in_time_recovery ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state     = var.delete_protection_state

  depends_on = [google_project_service.firestore]
}
```

## Managing Security Rules

Firestore security rules determine who can access what data. They are critical for any application that allows direct client access (mobile apps, web apps using the Firebase SDK):

```hcl
# rules.tf - Firestore security rules deployment

# Deploy security rules from a file or inline content
resource "google_firebaserules_ruleset" "firestore" {
  count   = var.security_rules_file != "" || var.security_rules_content != "" ? 1 : 0
  project = var.project_id

  source {
    files {
      name    = "firestore.rules"
      content = var.security_rules_file != "" ? file(var.security_rules_file) : var.security_rules_content
    }
  }

  depends_on = [google_firestore_database.main]
}

# Release the ruleset to make it active
resource "google_firebaserules_release" "firestore" {
  count        = var.security_rules_file != "" || var.security_rules_content != "" ? 1 : 0
  project      = var.project_id
  name         = "cloud.firestore/${var.database_id}"
  ruleset_name = google_firebaserules_ruleset.firestore[0].name
}
```

Here is an example security rules file for a typical application:

```
// firestore.rules
// Security rules for the application database
// These rules run on every read and write operation

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if the user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Helper function to check if the user has an admin claim
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    // Helper function to validate string length
    function isValidString(field, minLen, maxLen) {
      return field is string && field.size() >= minLen && field.size() <= maxLen;
    }

    // Users collection
    // Users can read their own profile, admins can read all
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();

      // Users can create their own profile
      allow create: if isOwner(userId)
        && isValidString(request.resource.data.name, 1, 100)
        && isValidString(request.resource.data.email, 5, 256)
        && request.resource.data.createdAt == request.time;

      // Users can update their own profile (but not change createdAt)
      allow update: if isOwner(userId)
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['name', 'email', 'avatar', 'updatedAt']);

      // Only admins can delete user profiles
      allow delete: if isAdmin();
    }

    // Orders collection
    match /orders/{orderId} {
      // Users can read their own orders
      allow read: if isAuthenticated()
        && resource.data.userId == request.auth.uid;

      // Users can create orders for themselves
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.status == 'pending'
        && request.resource.data.totalCents > 0;

      // Only the order owner can update, and only status changes allowed
      allow update: if isAuthenticated()
        && resource.data.userId == request.auth.uid
        && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['status', 'updatedAt']);

      // No client-side deletion of orders
      allow delete: if false;

      // Order items subcollection
      match /items/{itemId} {
        allow read: if isAuthenticated()
          && get(/databases/$(database)/documents/orders/$(orderId)).data.userId == request.auth.uid;

        allow write: if false; // Items are set during order creation by the backend
      }
    }

    // Public content collection - readable by everyone
    match /public/{document=**} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Composite Indexes

Firestore requires composite indexes for queries that filter or sort on multiple fields. Without them, those queries fail at runtime. Defining them in Terraform prevents that:

```hcl
# indexes.tf - Composite indexes for query performance

resource "google_firestore_index" "indexes" {
  for_each = { for idx, index in var.composite_indexes : idx => index }

  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = each.value.collection

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path   = fields.value.field_path
      order        = fields.value.order
      array_config = fields.value.array_config
    }
  }
}
```

## Field-Level Indexes

You can also configure single-field index exemptions for fields you know you will never query on (saves storage and write costs):

```hcl
# field-indexes.tf - Single field index configuration

variable "field_overrides" {
  description = "Field-level index overrides"
  type = list(object({
    collection = string
    field_path = string
    indexes    = list(object({
      order       = optional(string)
      array_config = optional(string)
      query_scope = optional(string, "COLLECTION")
    }))
  }))
  default = []
}

resource "google_firestore_field" "overrides" {
  for_each = { for idx, field in var.field_overrides : idx => field }

  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = each.value.collection
  field      = each.value.field_path

  index_config {
    dynamic "indexes" {
      for_each = each.value.indexes
      content {
        order       = indexes.value.order
        array_config = indexes.value.array_config
        query_scope = indexes.value.query_scope
      }
    }
  }
}
```

## Outputs

```hcl
# outputs.tf
output "database_name" {
  description = "The database name"
  value       = google_firestore_database.main.name
}

output "database_id" {
  description = "The database ID"
  value       = google_firestore_database.main.name
}

output "location" {
  description = "The database location"
  value       = google_firestore_database.main.location_id
}
```

## Using the Module

Here is how to use the module in practice:

```hcl
module "firestore" {
  source = "./modules/firestore"

  project_id = "my-project"
  location   = "us-central"
  database_id = "(default)"

  # Enable safety features
  point_in_time_recovery  = true
  delete_protection_state = "DELETE_PROTECTION_ENABLED"

  # Deploy security rules from a file
  security_rules_file = "${path.module}/firestore.rules"

  # Define composite indexes needed by the application
  composite_indexes = [
    {
      # Query: orders where userId == X, ordered by createdAt descending
      collection = "orders"
      fields = [
        { field_path = "userId", order = "ASCENDING" },
        { field_path = "createdAt", order = "DESCENDING" },
      ]
    },
    {
      # Query: orders where userId == X and status == Y
      collection = "orders"
      fields = [
        { field_path = "userId", order = "ASCENDING" },
        { field_path = "status", order = "ASCENDING" },
        { field_path = "createdAt", order = "DESCENDING" },
      ]
    },
    {
      # Query: users with array-contains on roles
      collection = "users"
      fields = [
        { field_path = "roles", array_config = "CONTAINS" },
        { field_path = "createdAt", order = "DESCENDING" },
      ]
    },
  ]

  # Exempt large text fields from indexing
  field_overrides = [
    {
      collection = "orders"
      field_path = "notes"
      indexes    = [] # No indexes on this field
    },
  ]
}
```

## Backup Strategy

Firestore supports scheduled exports for backups:

```hcl
# backup.tf - Scheduled Firestore exports

resource "google_firestore_backup_schedule" "daily" {
  project  = var.project_id
  database = google_firestore_database.main.name

  retention = "604800s"  # 7 days

  daily_recurrence {}
}

resource "google_firestore_backup_schedule" "weekly" {
  project  = var.project_id
  database = google_firestore_database.main.name

  retention = "2592000s"  # 30 days

  weekly_recurrence {
    day = "SUNDAY"
  }
}
```

## Monitoring

Monitor Firestore performance and costs:

```hcl
resource "google_monitoring_alert_policy" "firestore_reads" {
  project      = var.project_id
  display_name = "Firestore Read Operations High"

  conditions {
    display_name = "Read ops exceeding threshold"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "firestore_database"
        AND metric.type = "firestore.googleapis.com/document/read_count"
      FILTER

      comparison      = "COMPARISON_GT"
      threshold_value = var.read_ops_alert_threshold
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels
}
```

## Summary

This Terraform module handles the three key aspects of a production Firestore deployment: the database itself with proper configuration, security rules that enforce access control at the document level, and composite indexes that ensure your queries are fast. Managing security rules through Terraform (rather than the Firebase CLI) means they are version-controlled and reviewed in PRs alongside the rest of your infrastructure. The composite indexes prevent the common surprise of queries failing in production because an index was not created ahead of time.
