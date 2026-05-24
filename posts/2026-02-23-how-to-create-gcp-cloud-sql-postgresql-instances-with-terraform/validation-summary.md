# Validation Summary: How to Create GCP Cloud SQL PostgreSQL Instances with Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Terraform (HashiCorp Google provider ~> 5.0)
- Google Cloud Platform (GCP)
- Cloud SQL for PostgreSQL (POSTGRES_16)
- PostgreSQL server configuration (database flags / tuning parameters)
- VPC private service access (Service Networking)
- Cloud SQL Auth Proxy / Cloud SQL Proxy
- IAM (service accounts, Workload Identity)
- PostgreSQL extensions (pg_stat_statements, pgAudit, pg_cron)

## Sources Consulted
- Cloud SQL for PostgreSQL — Configure database flags: https://cloud.google.com/sql/docs/postgres/flags
- Cloud SQL for PostgreSQL — Database versions and policies: https://cloud.google.com/sql/docs/postgres/db-versions
- Cloud SQL for PostgreSQL release notes: https://cloud.google.com/sql/docs/postgres/release-notes
- Terraform Registry — `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- PostgreSQL Documentation — Resource Consumption (shared_buffers, work_mem, effective_cache_size unit semantics): https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL Documentation — Server Configuration (statement_timeout, idle_in_transaction_session_timeout unit semantics): https://www.postgresql.org/docs/current/runtime-config-client.html

## Issues Found

1. **Incorrect `shared_buffers` value (wrong unit math).** The original value `4096000` with the comment "~4GB in 8KB pages" is wrong. PostgreSQL interprets an unsuffixed `shared_buffers` value as 8 KB blocks (BLCKSZ). `4096000 × 8 KB ≈ 32 GB`, which would not apply on a 16 GB instance. Changed to `524288` (= 524288 × 8 KB = 4 GB). Comment updated to reflect the correct intent.

2. **Incorrect `effective_cache_size` value (same unit math error).** The original value `12288000` would equate to ~96 GB, not 12 GB. Changed to `1572864` (= 1572864 × 8 KB = 12 GB). Comment updated accordingly.

3. **Invalid `cloudsql.enable_pg_stat_statements` flag.** This flag does not exist on Cloud SQL for PostgreSQL. `pg_stat_statements` is pre-loaded in `shared_preload_libraries` by default; users only need `CREATE EXTENSION pg_stat_statements;` in SQL. Replaced the bogus flag with `pg_stat_statements.track = "all"` (a real, useful tuning flag) and updated the prose paragraph to clarify that some extensions (like `pg_stat_statements`) are pre-loaded by default and only the `cloudsql.enable_*` flags load additional libraries.

4. **Outdated "Latest supported version" claim for POSTGRES_16.** As of early 2026, Cloud SQL also supports POSTGRES_17 (added 2024-10-22) and POSTGRES_18. Updated the inline comment in the basic example to acknowledge POSTGRES_17/18 are also available, and softened the "Use PostgreSQL 16 for new projects" best-practice line to recommend a recent major version while noting that 16, 17, and 18 are all supported.

## Review Notes

- The Terraform Google provider is pinned to `~> 5.0`. Provider 6.x and 7.x exist as of early 2026; the pin still works but readers may want to consider upgrading. Left as-is per minimal-change policy.
- `disk_size = 10` for the basic instance is at the Cloud SQL minimum (10 GB) — correct.
- `db-f1-micro` and `db-g1-small` shared-core tiers remain available; the post correctly flags these as dev-only.
- `maintenance_window.day = 7` correctly corresponds to Sunday (Cloud SQL uses ISO 8601 day-of-week: 1=Mon, 7=Sun).
- `work_mem = "16384"` (kB → 16 MB) and `maintenance_work_mem = "1048576"` (kB → 1 GB) use the correct kB-default unit for PostgreSQL memory parameters with non-block semantics — these were not affected by the shared_buffers/effective_cache_size bug.
- `idle_in_transaction_session_timeout = "300000"` and `statement_timeout = "60000"` correctly use milliseconds (PostgreSQL default unit for these GUCs).
- The `cloudsql.enable_pg_cron` and `cloudsql.enable_pgaudit` flags are real and correctly used.
- The Workload Identity IAM binding example is correct for GKE Workload Identity with the new naming scheme.
- The companion-post link references an internal blog URL that follows the project's standard pattern; not externally verified, but consistent with neighboring posts in the repo.
