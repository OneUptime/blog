# Validation Summary: How to Set Up Automated Secret Rotation with Google Cloud Secret Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Secret Manager
- Cloud Run functions / Cloud Functions
- Cloud Scheduler
- Cloud SQL for PostgreSQL
- Cloud SQL Admin API
- Python
- psycopg2
- Terraform Google provider
- Cloud Logging and Cloud Monitoring

## Sources Consulted
- Google Cloud Secret Manager `gcloud secrets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud Secret Manager `gcloud secrets update` reference: https://cloud.google.com/sdk/gcloud/reference/secrets/update
- Google Cloud Secret Manager add, access, and disable secret version documentation: https://docs.cloud.google.com/secret-manager/docs/add-secret-version, https://docs.cloud.google.com/secret-manager/docs/access-secret-version, https://docs.cloud.google.com/secret-manager/docs/disable-secret-version
- Cloud Run functions runtime support: https://docs.cloud.google.com/functions/docs/runtime-support
- Cloud Run functions deployment reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Cloud SQL for PostgreSQL connection from Cloud Run functions: https://docs.cloud.google.com/sql/docs/postgres/connect-functions
- Cloud SQL Admin API users.update reference: https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1beta4/users/update
- Cloud Scheduler HTTP job reference and authenticated HTTP target documentation: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http, https://docs.cloud.google.com/scheduler/docs/http-target-auth
- psycopg2 SQL composition documentation: https://www.psycopg.org/docs/sql.html
- Terraform `google_cloudfunctions2_function` resource reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Cloud Logging log-based metrics CLI documentation: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Cloud Monitoring alert policy CLI documentation: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create

## Issues Found
- The original flow stored the new database password in Secret Manager before verifying it. This could make `latest` point to a bad credential. I changed the architecture, numbered steps, and code to verify first, then store the new version, with rollback if verification or Secret Manager update fails.
- The PostgreSQL `ALTER USER` statement attempted to bind the username as a query parameter. psycopg2 parameters are not for SQL identifiers. I changed the example to use psycopg2 composable SQL objects for the dynamic role name and password value.
- The API key rotation example implied a third-party provider key could be rotated by generating a random value locally. I changed it to an internally issued API key and noted that third-party keys require provider key creation and revocation APIs.
- The Cloud Run functions / Cloud SQL example used a Unix socket without showing the required Cloud SQL connection configuration. I added the `gcloud run services update --add-cloudsql-instances` step and the Cloud SQL Client role.
- The private HTTP function was scheduled with OIDC but did not grant invoker access to the scheduler identity. I added a `roles/run.invoker` binding for the service account.
- The Cloud Scheduler commands omitted an explicit scheduler location. I added `--location=us-central1`.
- The Terraform snippet referenced a nonexistent `google_cloudfunctions2_function.rotator.url` attribute. I changed it to `google_cloudfunctions2_function.rotator.service_config[0].uri`.
- The connection pool recreated pools without closing the old one and returned potentially stale connections without testing them. I added `closeall()` before replacement and a lightweight `SELECT 1` check before returning a connection.
- The monitoring section used Cloud Functions 1st gen resource and metric names while the deployment and Terraform examples use Cloud Run functions / Cloud Functions 2nd gen. I changed the filters to `cloud_run_revision`, added a failure log-based metric, and updated the alert policy command to the current `gcloud alpha monitoring policies create` flag shape.
- The success log metric looked for text that the function never emitted. I added `Rotation successful` log lines to both rotation paths.

## Review Notes
The examples are technically consistent after the fixes, but a production implementation should still avoid hard-coded project and region values, use least-privilege Secret Manager roles instead of project-wide admin where possible, and handle concurrent rotations with idempotency or locking.
