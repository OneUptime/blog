# Validation Summary: How to Connect a Cloud Run Service to a Cloud SQL PostgreSQL Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud SQL for PostgreSQL
- Cloud SQL Auth Proxy
- Secret Manager
- gcloud CLI
- Python
- Flask
- psycopg2
- Docker
- Gunicorn
- Knative service YAML

## Sources Consulted
- Google Cloud SQL for PostgreSQL: Connect from Cloud Run: https://docs.cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud SQL for PostgreSQL: Connect using the Cloud SQL Auth Proxy: https://docs.cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud SQL for PostgreSQL: About the Cloud SQL Auth Proxy: https://docs.cloud.google.com/sql/docs/postgres/sql-proxy
- Google Cloud SQL for PostgreSQL: Configure private IP: https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud Run: Configure container start order for sidecar deployments: https://docs.cloud.google.com/run/docs/configuring/services/containers
- Google Cloud Run: Direct VPC egress with a VPC network: https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Google Cloud SQL for PostgreSQL: Log in using IAM database authentication: https://cloud.google.com/sql/docs/postgres/iam-logins

## Issues Found
- The private-IP Cloud SQL setup omitted the required Cloud Run VPC egress path. Added a note that private services access must already be configured for the VPC and added Direct VPC egress annotations to the Cloud Run service YAML.
- The Cloud SQL Auth Proxy sidecar used `--auto-iam-authn` while the tutorial creates and uses a password-based PostgreSQL user. Removed that flag and added `--private-ip` to match the private-only instance configuration.
- The Cloud SQL Auth Proxy image tag was outdated compared with the current Google Cloud documentation. Updated it from `2.8.0` to `2.22.0`.
- The built-in Cloud SQL connection alternative used `INSTANCE_CONNECTION_NAME` in the Python code but did not set it in the deployment command. Added the environment variable to the `gcloud run deploy` command.
- The built-in Cloud SQL connection alternative did not state that the Unix socket path is for public IP paths. Clarified that scope to align with Cloud Run's documented Cloud SQL connection modes.

## Review Notes
The corrected sidecar path is appropriate for a private-only Cloud SQL instance when Cloud Run has VPC egress to the same VPC. The tutorial still uses password authentication for the PostgreSQL database user; switching to Cloud SQL IAM database authentication would require additional database-user setup, `roles/cloudsql.instanceUser`, and corresponding application connection changes.
