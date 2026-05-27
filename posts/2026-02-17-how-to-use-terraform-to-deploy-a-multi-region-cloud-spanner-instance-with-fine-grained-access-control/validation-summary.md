# Validation Summary: How to Use Terraform to Deploy a Multi-Region Cloud Spanner Instance with

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud Spanner
- Terraform Google provider
- Spanner multi-region instance configurations
- Spanner GoogleSQL DDL
- Spanner fine-grained access control and database roles
- Google Cloud IAM and IAM Conditions
- Cloud Spanner backup schedules
- Cloud Monitoring alert policies

## Sources Consulted
- Terraform Google provider `google_spanner_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/spanner_instance
- Terraform Google provider `google_spanner_database` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/spanner_database
- Terraform Google provider `google_spanner_database_iam` resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/spanner_database_iam
- Terraform Google provider `google_spanner_backup_schedule` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/spanner_backup_schedule
- Google Cloud Spanner regional, dual-region, and multi-region configurations: https://cloud.google.com/spanner/docs/instance-configurations
- Google Cloud Spanner editions overview: https://cloud.google.com/spanner/docs/editions-overview
- Google Cloud Spanner compute capacity, nodes, and processing units: https://cloud.google.com/spanner/docs/compute-capacity
- Google Cloud Spanner managed autoscaler: https://cloud.google.com/spanner/docs/managed-autoscaler
- Google Cloud Spanner fine-grained access control configuration: https://cloud.google.com/spanner/docs/configure-fgac
- Google Cloud Spanner fine-grained access control privileges: https://cloud.google.com/spanner/docs/fgac-privileges
- Google Cloud Spanner IAM overview: https://cloud.google.com/spanner/docs/iam
- Google Cloud IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud IAM Conditions resource attributes: https://cloud.google.com/iam/docs/conditions-resource-attributes
- Google Cloud Spanner metrics reference: https://cloud.google.com/spanner/docs/metrics
- Google Cloud Spanner pricing: https://cloud.google.com/spanner/pricing

## Issues Found
- The `nam-eur-asia1` diagram showed `europe-west1` and `europe-west4` as read-write regions. Google Cloud documents `us-central1` and `us-central2` as the read-write regions, `europe-west1` and `asia-east1` as read-only regions, and `us-east1` as the witness region. Updated the diagram accordingly.
- The `nam7` description said it had four North America regions. The base configuration has two read-write regions and a witness region, with optional read-only replicas. Updated the wording.
- The instance Terraform set both `processing_units` and `autoscaling_config`. The Terraform provider requires exactly one of `num_nodes`, `processing_units`, or `autoscaling_config` for provisioned instances. Removed `processing_units` from the autoscaling example and removed the now-unused variable.
- The multi-region instance omitted `edition = "ENTERPRISE_PLUS"`. Current Spanner documentation says multi-region configurations are available with Enterprise Plus. Added the edition field.
- The post described table-level IAM directly. Spanner IAM applies at instance and database levels, while table and column access is handled through fine-grained access control database roles. Updated the wording.
- The analyst role DDL granted full `SELECT` on `Users` before granting a subset of columns, so the column-level grant did not restrict access as described. Removed the full-table grant for `Users`.
- The FGAC IAM example used `roles/spanner.fineGrainedAccessUser` as the conditioned database-role binding. Google documents that specific database roles are granted with `roles/spanner.databaseRoleUser`, while `roles/spanner.fineGrainedAccessUser` grants permission to use the FGAC framework. Split this into separate IAM member resources.
- IAM condition examples used single-quoted CEL string literals. Updated them to double-quoted literals, matching Google Cloud IAM documentation examples.
- The pricing section reduced Spanner pricing to compute, storage, and network and claimed `nam-eur-asia1` costs roughly 9x more per processing unit. Current pricing is edition-based and includes compute, database storage, backup storage, data replication, network usage, and optional Data Boost usage. Updated the section to avoid the outdated ratio.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The review was completed by static inspection against current official Google Cloud and Terraform provider documentation.
