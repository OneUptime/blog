# Validation Summary: How to Configure Database Flags for Cloud SQL PostgreSQL Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL database flags and server configuration
- gcloud CLI
- Terraform `google_sql_database_instance`
- PostgreSQL extensions and SQL configuration

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Configure database flags: https://docs.cloud.google.com/sql/docs/postgres/flags
- Google Cloud SDK: `gcloud sql instances patch`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SQL for PostgreSQL: Configure PostgreSQL extensions: https://docs.cloud.google.com/sql/docs/postgres/extensions
- Google Cloud SQL Admin API: Flags resource: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/flags
- HashiCorp Terraform Google provider: `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- PostgreSQL 15 documentation: Query planning configuration: https://www.postgresql.org/docs/15/runtime-config-query.html
- PostgreSQL 15 documentation: `pg_stat_statements`: https://www.postgresql.org/docs/15/pgstatstatements.html
- PostgreSQL 15 documentation: Setting parameters: https://www.postgresql.org/docs/15/config-setting.html

## Issues Found
- The post used byte values for `work_mem`, `maintenance_work_mem`, and `effective_cache_size`. Cloud SQL documents these memory flags as integer values in PostgreSQL units such as KB or 8 KB pages, not raw bytes. Updated examples to use `65536` for 64 MB `work_mem`, `524288` for 512 MB `maintenance_work_mem`, and a 10 GB `effective_cache_size` value within Cloud SQL's documented 10-70% memory range.
- The post used `shared_preload_libraries=pg_stat_statements`, but Cloud SQL for PostgreSQL does not list `shared_preload_libraries` as a supported database flag. Removed that flag from `gcloud`, Terraform, and production examples, and updated the `pg_stat_statements` section to create the supported extension directly.
- The post stated that `shared_buffers` generally cannot be set directly. Cloud SQL lists `shared_buffers` as a supported flag with Cloud SQL-specific constraints. Updated the text to say it can be set, but the automatic value is usually the right starting point.
- The post claimed Cloud SQL uses SSD storage and that `random_page_cost=4.0` is therefore too high. Cloud SQL storage and workload characteristics should be considered before changing planner costs. Updated the language to recommend `1.1` only for SSD-backed workloads after testing.
- The post used `statement_timeout` as a Cloud SQL database flag. Cloud SQL does not list it as a supported database flag. Replaced the `gcloud` example with a PostgreSQL `ALTER DATABASE ... SET statement_timeout` example and clarified database, role, or session-level configuration.
- The opening paragraph described flags as the only mechanism for adjusting server parameters. Updated this to "main mechanism for adjusting instance-level server parameters" because some PostgreSQL settings can be applied at database, role, or session scope.

## Review Notes
The guide is technically relevant and now aligns with the current Cloud SQL for PostgreSQL flag list as of 2026-05-28. The production values remain workload-dependent recommendations and should still be tested in staging before applying to production.
