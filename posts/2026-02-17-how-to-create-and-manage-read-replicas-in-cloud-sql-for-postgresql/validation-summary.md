# Validation Summary: How to Create and Manage Read Replicas in Cloud SQL for PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud SQL for PostgreSQL
- PostgreSQL streaming replication and monitoring views
- Google Cloud CLI
- Cloud Monitoring alerting policies
- Terraform Google provider
- Python psycopg2
- PgBouncer

## Sources Consulted
- Google Cloud SQL for PostgreSQL replication overview: https://docs.cloud.google.com/sql/docs/postgres/replication
- Google Cloud SQL for PostgreSQL create read replicas guide: https://docs.cloud.google.com/sql/docs/postgres/replication/create-replica
- Google Cloud SQL for PostgreSQL replication lag guide: https://docs.cloud.google.com/sql/docs/postgres/replication/replication-lag
- Google Cloud SQL for PostgreSQL database flags guide: https://docs.cloud.google.com/sql/docs/postgres/flags
- Google Cloud SDK `gcloud sql instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK `gcloud sql instances promote-replica` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/promote-replica
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider `google_sql_database_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- PostgreSQL system administration functions: https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The post stated that each primary supports up to 10 replicas as a hard limit. Updated this to match Google Cloud guidance: limit direct replicas to 10 or fewer, and use cascading replicas when more are needed.
- The Cloud Monitoring alert command used unsupported `gcloud monitoring policies create` flags, `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with the current `--if="> 10"` and `--duration=300s` flags.
- The promotion section implied all other replicas always remain on the old primary. Clarified that sibling replicas remain on the old primary, while cascading replicas under the promoted replica continue to replicate from it.
- The cascading replicas section incorrectly said Cloud SQL does not support cascading replication. Updated it to reflect current Cloud SQL support for cascading read replicas up to four levels including the primary.
- The database flags example used `work_mem=256MB`. Updated it to `work_mem=262144`, which expresses 256 MB as the Cloud SQL documented integer value in KB, and added the important note that `--database-flags` replaces the existing flag list.

## Review Notes
The remaining commands, Terraform resource fields, PostgreSQL monitoring queries, and PgBouncer configuration are technically plausible for the guide's context. The Python example is a simplified read/write split pattern and omits production concerns such as rollback on exceptions and retry handling, but it is syntactically valid and not technically incorrect for an illustrative snippet.
