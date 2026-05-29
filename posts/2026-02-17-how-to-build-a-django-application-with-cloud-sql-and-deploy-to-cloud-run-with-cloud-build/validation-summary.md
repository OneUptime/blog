# Validation Summary: How to Build a Django Application with Cloud SQL and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Django
- Python
- PostgreSQL
- psycopg
- Gunicorn
- Docker
- Google Cloud SQL
- Google Cloud Run
- Google Cloud Build
- Google Artifact Registry
- Google Secret Manager
- Google Cloud IAM
- Cloud SQL Auth Proxy

## Sources Consulted
- Django 5.2 settings documentation: https://docs.djangoproject.com/en/5.2/ref/settings/
- Django 5.2 database documentation: https://docs.djangoproject.com/en/5.2/ref/databases/
- Django 5.2 staticfiles documentation: https://docs.djangoproject.com/en/5.2/ref/contrib/staticfiles/
- Google Cloud SQL for PostgreSQL: Connect from Cloud Run: https://cloud.google.com/sql/docs/postgres/connect-run
- Google Cloud SQL for PostgreSQL: Connect using the Cloud SQL Auth Proxy: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
- Google Cloud Build secrets documentation: https://cloud.google.com/build/docs/securing-builds/use-secrets
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- gcloud builds get-default-service-account reference: https://cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run secrets documentation: https://cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Build official builders repository: https://github.com/GoogleCloudPlatform/cloud-builders

## Issues Found
- The IAM section assumed Cloud Build always uses the legacy service account `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`. Google Cloud documentation says Cloud Build may use either the Compute Engine default service account or the legacy Cloud Build service account depending on project and organization settings. I changed the command to use `gcloud builds get-default-service-account`.
- The Cloud Run deployment uses `--set-secrets`, but the permissions section granted Secret Manager access only to Cloud Build. Cloud Run documentation requires the Cloud Run service identity to have `roles/secretmanager.secretAccessor` to access secrets at runtime. I added a grant for the Cloud Run runtime service account.
- I introduced a `CLOUD_RUN_SA` variable and reused it in the Cloud Run service account IAM commands so the commands are consistent and less error-prone.
- I adjusted the Cloud SQL Auth Proxy commands to put `--port 5432` before the instance connection name, matching the official Cloud SQL Auth Proxy examples.

## Review Notes
- The Django PostgreSQL configuration, use of `psycopg[binary]`, `collectstatic --noinput`, Cloud SQL Unix socket path, Cloud Run `--add-cloudsql-instances`, Cloud Build `availableSecrets`, and Cloud SQL Auth Proxy usage are consistent with the consulted official documentation.
- The post uses the default Compute Engine service account as the Cloud Run runtime identity. That is valid, but a dedicated least-privilege runtime service account would be preferable for production.
