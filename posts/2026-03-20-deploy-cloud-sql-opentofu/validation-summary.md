# Validation Summary: How to Deploy Cloud SQL on GCP with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu / Terraform
- Google Cloud Platform (GCP)
- Cloud SQL (PostgreSQL)
- Terraform Google provider (`hashicorp/google`)
- VPC peering / Service Networking API
- Cloud SQL IAM Database Authentication
- Cloud SQL read replicas
- Query Insights

## Sources Consulted
- Terraform Google provider `google_sql_user` docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/sql_user.html.markdown
- Terraform Google provider `google_sql_database_instance` docs: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/sql_database_instance.html.markdown
- Terraform Google provider `google_compute_global_address`, `google_service_networking_connection`, `google_project_service` docs (Terraform Registry)
- GCP Cloud SQL for PostgreSQL IAM authentication docs: https://cloud.google.com/sql/docs/postgres/add-manage-iam-users
- GCP Cloud SQL Private IP / VPC peering docs: https://cloud.google.com/sql/docs/postgres/configure-private-services-access

## Issues Found
1. **`google_sql_user` IAM service account name for PostgreSQL** — The post used `name = google_service_account.db_client.email` for a `CLOUD_IAM_SERVICE_ACCOUNT` user. The official Terraform Google provider documentation explicitly notes that for PostgreSQL the `.gserviceaccount.com` suffix must be stripped from the service account email because of PostgreSQL's 63-character username limit. **Fix:** changed the `name` to `trimsuffix(google_service_account.db_client.email, ".gserviceaccount.com")` and added a brief explanatory comment.
2. **`replica_configuration { failover_target = false }` on a PostgreSQL replica** — The provider documentation explicitly states `failover_target` is "Not supported for Postgres database." Setting it on a `POSTGRES_15` replica is incorrect/MySQL-only. **Fix:** removed the `replica_configuration` block (it only contained the unsupported `failover_target = false`, which was already the default and added no value). The remainder of the replica configuration uses the supported top-level `master_instance_name` and `settings` block.

## Review Notes
- All other resource attributes verified against the current Terraform Google provider docs:
  - `google_compute_global_address` with `purpose = "VPC_PEERING"`, `address_type = "INTERNAL"`, `prefix_length = 16` — correct.
  - `google_service_networking_connection` with `service = "servicenetworking.googleapis.com"` and `reserved_peering_ranges` — correct.
  - `google_sql_database_instance.settings.ip_configuration.enable_private_path_for_google_cloud_services` — valid attribute.
  - `backup_configuration` with `point_in_time_recovery_enabled`, `transaction_log_retention_days`, and nested `backup_retention_settings` — correct.
  - `maintenance_window.day = 7` correctly maps to Sunday (1=Monday … 7=Sunday).
  - `availability_type` values `"REGIONAL"` and `"ZONAL"` — correct.
  - `insights_config` arguments (`query_insights_enabled`, `query_string_length`, `record_application_tags`, `record_client_address`) — all valid.
  - `disk_autoresize_limit` — valid.
- `database_version = "POSTGRES_15"` is supported. As of 2026, `POSTGRES_16` and `POSTGRES_17` are also available; the post is not outdated, but readers may want to consider newer major versions when starting fresh.
- The post correctly notes that Cloud SQL Auth Proxy uses the `connection_name` in `project:region:instance` format.
- The IAM example only adds `roles/cloudsql.client` (which permits connecting via the Cloud SQL Auth Proxy). For automatic IAM database authentication, applications also typically need `roles/cloudsql.instanceUser`. This was not changed because the post explicitly references the Cloud SQL Auth Proxy use case and the omission is a common simplification rather than an outright error — but worth noting for readers building production setups.
