# Validation Summary: How to Create GCP Cloud SQL MySQL Instances with Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (HashiCorp configuration language)
- Google Cloud Platform (GCP)
- Cloud SQL for MySQL (MySQL 8.0)
- GCP VPC networking (private service access, VPC peering)
- `hashicorp/google` Terraform provider (v5.x)
- MySQL configuration flags (InnoDB, slow query log, character sets)
- Cloud SQL high availability, read replicas, SSL/TLS

## Sources Consulted
- Terraform Registry — `google_sql_database_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Registry — `google_sql_user` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_user
- Provider source markdown on GitHub: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/sql_database_instance.html.markdown and `sql_user.html.markdown`
- Google Cloud Cloud SQL for MySQL documentation (point-in-time recovery, HA, backups)

## Issues Found

1. **`point_in_time_recovery_enabled = true` in MySQL `backup_configuration`** — This field is valid only for PostgreSQL and SQL Server instances. For MySQL, point-in-time recovery is enabled via `binary_log_enabled = true` (which the post already sets). Leaving `point_in_time_recovery_enabled` in a MySQL config will be rejected by the provider/API. **Fix:** removed the line and updated the adjacent comment on `binary_log_enabled` to reflect that it enables PITR for MySQL.

2. **Invalid fields in `password_policy` on `google_sql_user`** — The block used `complexity = "COMPLEXITY_DEFAULT"` and `disallow_username_substring = true`. These are NOT valid arguments for `google_sql_user.password_policy`. They belong on the instance via `google_sql_database_instance.settings.password_validation_policy`. **Fix:** replaced with the valid user-level password policy fields (`allowed_failed_attempts`, `enable_failed_attempts_check`, `enable_password_verification`).

3. **Deprecated `require_ssl` field** — `require_ssl` has been deprecated in favor of `ssl_mode`. **Fix:** replaced `require_ssl = true` with `ssl_mode = "ENCRYPTED_ONLY"`, which is the supported successor.

## Review Notes
- The `replica_configuration { failover_target = false }` block on the in-region read replica is technically valid but redundant: with the primary already configured for `availability_type = "REGIONAL"`, failover is handled by Cloud SQL's regional HA and a separate failover replica is unnecessary. The block can stay as a teaching example, but readers should know REGIONAL HA is now the preferred path.
- The `db-n1-standard-*` (first-gen N1) tiers shown for production still work, but Cloud SQL now also supports newer Enterprise/Enterprise Plus tiers (e.g., `db-custom-*`, `db-perf-optimized-N-*`). Future revisions may want to mention these options.
- `disk_type = "PD_SSD"` is still valid but Cloud SQL has been migrating customers to hyperdisk-backed options for newer tiers; this is fine as a general default.
- `innodb_buffer_pool_size = 8053063680` (~7.5 GB) is correct for an 8 GB instance per the 70–80% guidance; verified arithmetic.
- The `maintenance_window.day = 7` correctly maps to Sunday (1=Monday through 7=Sunday).
- The 60–120s failover figure for REGIONAL HA matches Google's documented expectations.
- `query_string_length = 1024` and `query_plans_per_minute = 5` are within their documented valid ranges (256–4500 and 0–20 respectively).
