# Validation Summary: Run Django Database Migrations on Cloud SQL During Cloud Build Deployments

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Build
- Google Cloud SQL for PostgreSQL
- Cloud SQL Auth Proxy
- Google Cloud Run services and jobs
- Django migrations
- PostgreSQL schema changes
- Secret Manager
- Google Cloud IAM

## Sources Consulted
- Google Cloud SQL: Connect from Cloud Build for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-build
- Google Cloud SQL: Connect from Cloud Run for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud SQL Auth Proxy documentation for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud SDK: `gcloud run jobs create`: https://cloud.google.com/sdk/gcloud/reference/run/jobs/create
- Google Cloud Build overview and build network behavior: https://docs.cloud.google.com/build/docs/overview
- Google Cloud Build secrets from Secret Manager: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud SDK: `gcloud builds get-default-service-account`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Google Cloud Run IAM roles documentation: https://cloud.google.com/run/docs/reference/iam/roles
- Django 5.2 PostgreSQL migration operations: https://docs.djangoproject.com/en/5.2/ref/contrib/postgres/operations/
- Django management command documentation: https://docs.djangoproject.com/en/5.2/ref/django-admin/
- PostgreSQL ALTER TABLE documentation: https://www.postgresql.org/docs/current/sql-altertable.html

## Issues Found
- The post stated that Cloud Build does not have direct network access to Cloud SQL instances. This was too broad. Google documents public IP connections through the Cloud SQL Auth Proxy and direct private IP connections from Cloud Build private pools. The wording was updated to distinguish public IP proxy connections from private pool private IP connections.
- The Cloud SQL Auth Proxy image was pinned to `2.8.0`, while current Google documentation references the current v2 image line. Updated the example to `2.22.0`.
- The proxy container cleanup only ran after a successful migration command, and the shell step could mask a failed migration because Bash does not exit on command failure by default. Added `set -euo pipefail` and a shell `trap` so migration failures fail the build while still removing the proxy container.
- The concurrent index example used `migrations.AddIndex`, which does not create a PostgreSQL concurrent index. Django documents `django.contrib.postgres.operations.AddIndexConcurrently` for this. Updated the import, operation, and comment while keeping `atomic = False`.
- The nullable-column example said adding a nullable column does not lock the table. PostgreSQL `ALTER TABLE` generally takes an `ACCESS EXCLUSIVE` lock unless documented otherwise, though adding a nullable column avoids a table rewrite and is usually quick. Updated the wording to avoid the incorrect no-lock claim.
- The `check_migrations.py` script returned `False` on errors but did not exit non-zero. Updated the `__main__` block to call `sys.exit(0 if check_migration_safety() else 1)`.
- The IAM section assumed the legacy Cloud Build service account format. Google documents that Cloud Build may now use the Compute Engine default service account depending on project and organization settings. Updated the example to use `gcloud builds get-default-service-account`.
- The IAM section omitted `roles/iam.serviceAccountUser`, which Cloud Run documentation lists as required when deploying services or jobs that run as a service account. Added the role binding and clarified the Cloud Run jobs role note.
- The summary said to always run migrations before deploying new code. That is only safe for backward-compatible migrations. Updated the wording to specify backward-compatible schema migrations.

## Review Notes
The guide remains PostgreSQL-oriented, even though some headings say Cloud SQL generally. The examples are technically valid for Cloud SQL for PostgreSQL and Django's PostgreSQL backend. Future improvements could include Artifact Registry image examples instead of `gcr.io`, and a note that Cloud Build triggers may use a user-specified service account rather than the project default.
