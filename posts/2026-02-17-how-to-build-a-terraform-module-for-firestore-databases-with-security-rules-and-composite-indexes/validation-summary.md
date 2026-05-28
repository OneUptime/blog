# Validation Summary: How to Build a Terraform Module for Firestore Databases with Security Rules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Firestore
- Terraform
- HashiCorp Google Terraform provider
- Firebase Security Rules
- Firestore composite indexes and single-field index exemptions
- Firestore backup schedules
- Cloud Monitoring alert policies

## Sources Consulted
- Terraform Registry: `google_firestore_database` resource, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_database
- Terraform Registry: `google_firebaserules_ruleset` resource, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebaserules_ruleset
- Terraform Registry: `google_firebaserules_release` resource, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebaserules_release
- Terraform Registry: `google_firestore_backup_schedule` resource, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firestore_backup_schedule
- Google Cloud Firestore index management documentation, https://cloud.google.com/firestore/native/docs/query-data/indexing
- Firebase Terraform setup documentation for Cloud Firestore and Security Rules, https://firebase.google.com/docs/projects/terraform/get-started
- Firebase Security Rules deployment documentation, https://firebase.google.com/docs/rules/manage-deploy
- Google Cloud Firestore Security Rules structure documentation, https://cloud.google.com/firestore/native/docs/security/rules-structure
- Google Cloud Firestore performance monitoring documentation, https://cloud.google.com/firestore/docs/understand-performance-monitoring
- Google Cloud Monitoring Firestore metric and monitored resource documentation, https://cloud.google.com/monitoring/api/metrics_gcp_d_h and https://cloud.google.com/monitoring/api/resources

## Issues Found
- The Terraform module enabled `firestore.googleapis.com` but not `firebaserules.googleapis.com`. Added a `google_project_service` resource for the Firebase Rules API and made the ruleset depend on it so rule deployment can succeed.
- The Firestore rules release name was always `cloud.firestore/${var.database_id}`, which is not the correct Terraform value for the default database. Added a local that uses `cloud.firestore` for `(default)` and `cloud.firestore/${var.database_id}` for additional databases.
- The composite-index explanation was too broad because Firestore does not require a composite index for every multi-field query. Narrowed the claim to the compound queries that cannot be satisfied by single-field indexes.
- The monitoring example used an invalid monitored resource type, `firestore_database`, and an outdated read-count metric for the stated purpose. Updated the filter to `resource.type = "firestore.googleapis.com/Database"` and `metric.type = "firestore.googleapis.com/document/read_ops_count"`.

## Review Notes
The remaining Terraform snippets align with current provider resource names and argument shapes. The post intentionally presents a module pattern rather than a complete checked-in Terraform module, so variable declarations such as alert thresholds and notification channels are implied by the monitoring example.
