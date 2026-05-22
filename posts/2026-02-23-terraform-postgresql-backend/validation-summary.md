# Validation Summary: How to Configure PostgreSQL Backend for Terraform State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform `pg` backend
- PostgreSQL
- PostgreSQL connection URIs and libpq parameters
- PostgreSQL advisory locks
- Managed PostgreSQL services on AWS, Google Cloud, and Azure

## Sources Consulted
- HashiCorp Terraform `pg` backend documentation: https://developer.hashicorp.com/terraform/language/backend/pg
- HashiCorp Terraform `pg` backend source: https://github.com/hashicorp/terraform/tree/main/internal/backend/remote-state/pg
- PostgreSQL libpq connection URI documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- PostgreSQL libpq environment variable documentation: https://www.postgresql.org/docs/current/libpq-envars.html
- PostgreSQL SSL mode documentation: https://www.postgresql.org/docs/current/libpq-ssl.html
- PostgreSQL `pg_locks` documentation: https://www.postgresql.org/docs/current/view-pg-locks.html
- Google Cloud SQL Auth Proxy documentation: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Microsoft Azure Database for PostgreSQL connection string documentation: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-deploy-on-azure-free-account

## Issues Found
- The post said Terraform uses the `public` schema by default. Terraform's `pg` backend defaults to `terraform_remote_state`, so the default schema text was corrected.
- The basic setup created a custom `terraform` schema but did not configure the backend to use it. Added `schema_name = "terraform"` to the basic backend example and adjusted the initialization note.
- The database setup granted default privileges that would not reliably apply to objects Terraform creates as `terraform_user`. The setup now creates the Terraform user first, creates the database owned by that user, and creates the custom schema with `AUTHORIZATION terraform_user`.
- The table structure was inaccurate. Terraform creates a `states` table, a `public.global_states_id_seq` sequence, and a unique `states_by_name` index; the example was updated accordingly.
- The post described a separate `locks` table and `terraform force-unlock` workflow. Terraform's `pg` backend uses PostgreSQL advisory locks only and does not support `force-unlock`, so the locking section was corrected to use `pg_locks`.
- The Google Cloud SQL Unix socket example included both a URI host and a `host` query parameter. It was simplified to use the libpq-supported named `host=/cloudsql/...` parameter.
- The Azure Database for PostgreSQL URI used an unescaped `@` in the username. The username was percent-encoded as `terraform%40myserver`.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior could not be checked with `terraform version` or `terraform init`. The review used current HashiCorp documentation and Terraform source code for backend behavior.
