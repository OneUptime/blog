# Validation Summary: How to Deploy Cloud SQL on GCP with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Google Cloud Platform (GCP)
- Cloud SQL (managed PostgreSQL)
- `hashicorp/google` Terraform provider
- HCL configuration language

## Sources Consulted
- Terraform Registry — `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Registry — `google_sql_database`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database
- Terraform Registry — `google_sql_user`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_user
- Cloud SQL machine type docs (custom tier format `db-custom-CPU-MEMORY_MB`, with memory between 0.9–6.5 GB/vCPU and a multiple of 256 MB)
- Cloud SQL maintenance window update tracks (`canary`, `stable`, `week5`)
- `hashicorp/terraform-provider-google` source: `website/docs/r/sql_database_instance.html.markdown`

## Issues Found
1. **`replica_configuration.failover_target` on a PostgreSQL replica.** The original read-replica example included a `replica_configuration { failover_target = false }` block. The Google provider docs explicitly state `failover_target` is "Not supported for Postgres database." Since this was the only field inside `replica_configuration`, I removed the block entirely. A basic Cloud SQL → Cloud SQL PostgreSQL read replica requires only `master_instance_name`, `database_version`, `region`, and `settings`.

All other configuration was verified correct:
- `database_version = "POSTGRES_15"` is a supported value.
- Custom tiers `db-custom-2-7680` and `db-custom-1-3840` satisfy the 0.9–6.5 GB/vCPU and 256 MB multiple constraints.
- `disk_type = "PD_SSD"` (underscore) is correct.
- `transaction_log_retention_days = 7` is the documented max for standard instances.
- `maintenance_window.update_track = "stable"` is valid.
- `connection_name` and `private_ip_address` are valid exported attributes.
- `deletion_protection`, `availability_type = "REGIONAL"`, and `ip_configuration.ipv4_enabled = false` all map correctly to the documented schema.

## Review Notes
- The `google_compute_network.main` resource referenced via `private_network` is not defined in the post; the reader is assumed to have an existing VPC. This is a pedagogical simplification, not a correctness issue.
- Private IP for Cloud SQL also requires a Service Networking peering (`google_service_networking_connection`) on the VPC — not shown here, but expected as prerequisite infrastructure for a real deployment.
- For a multi-day point-in-time recovery window (>7 days), the user would need Cloud SQL Enterprise Plus, which supports up to 35 days of `transaction_log_retention_days`. The current value of 7 is correct for the standard edition.
- PostgreSQL 16 and 17 are also supported by the provider; the post's choice of PostgreSQL 15 remains valid and stable.
