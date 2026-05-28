# Validation Summary: How to Use Serverless Database Migrations Using Cloud Run Jobs and Cloud SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run Jobs
- Google Cloud SQL for PostgreSQL
- Google Cloud Build
- Google Secret Manager
- Google Cloud CLI
- Node.js
- Knex.js
- PostgreSQL
- Docker

## Sources Consulted
- Google Cloud Run Jobs create command reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/create
- Google Cloud Run Jobs update command reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/update
- Google Cloud Run Jobs execution documentation: https://cloud.google.com/run/docs/execute/jobs
- Google Cloud SQL for PostgreSQL connection from Cloud Run documentation: https://cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud SQL for PostgreSQL Cloud Run quickstart: https://docs.cloud.google.com/sql/docs/postgres/connect-instance-cloud-run
- Google Cloud Build substitution documentation: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Secret Manager create command reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Artifact Registry Container Registry transition documentation: https://docs.cloud.google.com/artifact-registry/docs/transition/gcr-repositories
- Knex.js migration documentation: https://knexjs.org/guide/migrations

## Issues Found
- The `status` branch in `run-migration.js` called `db.migrate.list()` twice with `Promise.all`, which returned two duplicate `[completed, pending]` tuples instead of the completed and pending lists. Changed it to call `db.migrate.list()` once and log the completed and pending counts.
- The Dockerfile comment said it installed Cloud SQL Auth Proxy client library dependencies, but the container only installs Node.js production dependencies and Cloud Run provides the Cloud SQL connection integration. Updated the comment.
- The Cloud Build example referenced `Dockerfile.migrations`, but the post creates a file named `Dockerfile`. Updated the build step to use `-f Dockerfile`.
- The examples used project-owned `gcr.io` image paths. Container Registry writes are shut down unless `gcr.io` repositories have been migrated to Artifact Registry, so updated user-owned image URLs to Artifact Registry `pkg.dev` paths. Google-owned Cloud Build builder image URLs were left unchanged.
- The security setup granted Secret Manager access but omitted the Cloud SQL Client IAM role needed by the Cloud Run service account to connect to Cloud SQL. Added the `gcloud projects add-iam-policy-binding` command for `roles/cloudsql.client`.

## Review Notes
The commands and examples are otherwise consistent with current Cloud Run Jobs, Cloud SQL Unix socket connection, Secret Manager, Cloud Build substitution, and Knex migration documentation. The local workspace does not have `gcloud` installed, so Google Cloud CLI flags were verified against the official command reference rather than local `--help` output.
